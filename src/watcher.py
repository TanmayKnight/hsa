import logging
import time
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileCreatedEvent

from src.config_loader import AppConfig
from src.pipeline import Pipeline

logger = logging.getLogger(__name__)

# Wait this many seconds after file creation before processing
# (allows large files time to finish copying/uploading)
FILE_SETTLE_DELAY = 3.0


class PDFHandler(FileSystemEventHandler):
    """Watchdog handler that triggers the pipeline when a PDF is dropped in the inbox."""

    def __init__(self, pipeline: Pipeline):
        self.pipeline = pipeline
        super().__init__()

    def on_created(self, event: FileCreatedEvent) -> None:
        if event.is_directory:
            return
        if not event.src_path.lower().endswith(".pdf"):
            return

        pdf_path = os.path.abspath(event.src_path)
        logger.info("New PDF detected: %s", os.path.basename(pdf_path))

        # Brief delay to let the file finish writing
        time.sleep(FILE_SETTLE_DELAY)

        # Verify the file still exists (it may have been moved/deleted during settle)
        if not os.path.exists(pdf_path):
            logger.warning("File no longer exists after settle delay: %s", pdf_path)
            return

        try:
            self.pipeline.run(pdf_paths=[pdf_path])
        except Exception as e:
            logger.error("Pipeline error for %s: %s", pdf_path, e, exc_info=True)


class FolderWatcher:
    """Watches the inbox folder for new PDF files."""

    def __init__(self, config: AppConfig):
        self.config = config
        self.pipeline = Pipeline(config)
        inbox_path = os.path.abspath(config.storage.inbox_path)
        os.makedirs(inbox_path, exist_ok=True)
        self.inbox_path = inbox_path

    def start(self) -> None:
        """Start watching. Blocks until interrupted (Ctrl+C or SIGTERM)."""
        handler = PDFHandler(self.pipeline)
        observer = Observer()
        observer.schedule(handler, self.inbox_path, recursive=False)
        observer.start()

        logger.info("Watching for PDFs in: %s", self.inbox_path)
        logger.info("Press Ctrl+C to stop.")

        try:
            while True:
                time.sleep(1)
        except (KeyboardInterrupt, SystemExit):
            logger.info("Shutting down watcher...")
        finally:
            observer.stop()
            observer.join()
            logger.info("Watcher stopped.")
