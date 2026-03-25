"""
Background thread that:
1. Polls the `schedules` table for enabled cron expressions and fires
   WeeklyEditionJob generation when a cron is due.
2. Polls the `weekly_editions` table for on-demand jobs created by the
   admin panel (status='pending') and processes them immediately.

Usage — start once at application startup:
    scheduler = WeeklyScheduler()
    scheduler.start()          # daemon thread, stops when main process exits
"""

import logging
import threading
import time
from datetime import datetime, timezone

from src.newspaper_generator import NewspaperGenerator
from src.providers.db import get_db_provider

logger = logging.getLogger(__name__)

POLL_INTERVAL = 60  # seconds between checks


class WeeklyScheduler:

    def __init__(self):
        self.db = get_db_provider()
        self._thread = threading.Thread(target=self._loop, name="WeeklyScheduler", daemon=True)
        self._stop_event = threading.Event()

    def start(self) -> None:
        logger.info("WeeklyScheduler started (poll interval %ds)", POLL_INTERVAL)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()

    # ------------------------------------------------------------------
    # Internal loop
    # ------------------------------------------------------------------

    def _loop(self) -> None:
        while not self._stop_event.wait(POLL_INTERVAL):
            try:
                self._check_cron_schedules()
            except Exception:
                logger.exception("WeeklyScheduler: error in cron check")
            try:
                self._process_pending_jobs()
            except Exception:
                logger.exception("WeeklyScheduler: error processing pending jobs")

    # ------------------------------------------------------------------
    # Cron schedule evaluation
    # ------------------------------------------------------------------

    def _check_cron_schedules(self) -> None:
        try:
            from croniter import croniter
        except ImportError:
            logger.warning(
                "croniter not installed — cron schedules disabled. "
                "Run: pip install croniter"
            )
            return

        schedules = self.db.get_active_schedules()
        now = datetime.now()

        for schedule in schedules:
            cron_expr = schedule.get("cron_expr", "")
            last_run_str = schedule.get("last_run")

            try:
                # Determine the last time this cron should have fired
                if last_run_str:
                    last_run = datetime.fromisoformat(last_run_str)
                else:
                    # Never ran — use 2 minutes ago so it fires on next due tick
                    last_run = datetime.now().replace(second=0, microsecond=0)
                    last_run = last_run.replace(minute=last_run.minute - 2)

                cron = croniter(cron_expr, last_run)
                next_fire = cron.get_next(datetime)

                if next_fire <= now:
                    logger.info(
                        "Schedule '%s' (id=%s) is due — creating weekly edition job",
                        schedule.get("name"), schedule.get("id"),
                    )
                    edition_date = now.strftime("%Y-%m-%d")
                    job_id = self.db.create_weekly_edition_job(edition_date)
                    self.db.update_schedule_last_run(schedule["id"])
                    logger.info("Created weekly edition job %d for %s", job_id, edition_date)

            except Exception:
                logger.exception(
                    "WeeklyScheduler: error evaluating schedule '%s'",
                    schedule.get("name"),
                )

    # ------------------------------------------------------------------
    # On-demand job processing
    # ------------------------------------------------------------------

    def _process_pending_jobs(self) -> None:
        pending_jobs = self.db.get_pending_weekly_jobs()
        if not pending_jobs:
            return

        generator = NewspaperGenerator()
        for job in pending_jobs:
            logger.info(
                "Processing on-demand weekly edition job %d (edition %s)",
                job.id, job.edition_date,
            )
            try:
                generator.run_job(job)
                logger.info("Weekly edition job %d completed successfully", job.id)
            except Exception:
                logger.exception("Weekly edition job %d failed", job.id)
