"""
Generates a weekly digital newspaper PDF from articles stored in the database.

Uses WeasyPrint to render the Jinja2 template at templates/newspaper.html into
a letter-size PDF saved under data/weekly_editions/.
"""

import logging
import os
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

from jinja2 import Environment, FileSystemLoader

from src.config_loader import load_config
from src.providers.db import get_db_provider
from src.providers.db.base import ArticleRecord, WeeklyEditionJob

logger = logging.getLogger(__name__)

OUTPUT_DIR = Path("data/weekly_editions")
TEMPLATE_NAME = "newspaper.html"


# ---------------------------------------------------------------------------
# Section routing
# ---------------------------------------------------------------------------

SECTION_US_WORLD = {"politics", "world", "international", "us", "national", "government", "law"}
SECTION_BUSINESS = {"business", "economy", "finance", "market", "trade", "technology", "tech"}
SECTION_COMMUNITY = {"community", "culture", "diaspora", "religion", "local", "education", "health"}
SECTION_OPINION = {"opinion", "editorial", "commentary", "analysis", "perspective"}


def _classify(category: str) -> str:
    c = category.lower()
    for keyword in SECTION_US_WORLD:
        if keyword in c:
            return "us_world"
    for keyword in SECTION_BUSINESS:
        if keyword in c:
            return "business"
    for keyword in SECTION_COMMUNITY:
        if keyword in c:
            return "community"
    for keyword in SECTION_OPINION:
        if keyword in c:
            return "opinion"
    return "other"


# ---------------------------------------------------------------------------
# Article → template dict
# ---------------------------------------------------------------------------

def _article_to_ctx(article: ArticleRecord) -> Dict[str, Any]:
    """Convert an ArticleRecord into a dict the Jinja template expects."""
    content = article.rewritten_content or ""
    # Split on blank lines or paragraph boundaries
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", content) if p.strip()]
    if not paragraphs:
        paragraphs = [content]
    return {
        "title": article.title,
        "category": article.category,
        "published_at": article.published_at.strftime("%B %d, %Y"),
        "body_paragraphs": paragraphs,
        "is_breaking": article.is_breaking,
    }


# ---------------------------------------------------------------------------
# Main generator
# ---------------------------------------------------------------------------

class NewspaperGenerator:

    def __init__(self):
        self.db = get_db_provider()
        self.config = load_config()
        self.templates_dir = Path(__file__).parent.parent / "templates"
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(self.templates_dir)),
            autoescape=False,
        )

    def generate(self, job: WeeklyEditionJob) -> str:
        """
        Generate the weekly newspaper PDF for `job`.
        Returns the absolute path to the generated PDF.
        Raises on failure (caller should update job status to 'failed').
        """
        logger.info("Generating weekly edition for %s (job %d)", job.edition_date, job.id)

        # Determine date window: from 7 days before edition_date to edition_date
        edition_dt = datetime.fromisoformat(job.edition_date)
        since_dt = edition_dt - timedelta(days=7)
        articles = self.db.get_articles_since(since_dt, limit=80)

        if not articles:
            raise ValueError(f"No articles found since {since_dt.date()} for edition {job.edition_date}")

        logger.info("Found %d articles for edition %s", len(articles), job.edition_date)

        # Sort: breaking first, then by published_at desc
        articles.sort(key=lambda a: (not a.is_breaking, -a.published_at.timestamp()))

        # Route into sections
        us_world, business, community, opinion, other = [], [], [], [], []
        for article in articles:
            bucket = _classify(article.category)
            if bucket == "us_world":
                us_world.append(article)
            elif bucket == "business":
                business.append(article)
            elif bucket == "community":
                community.append(article)
            elif bucket == "opinion":
                opinion.append(article)
            else:
                other.append(article)

        # Front page: first breaking article as hero; next 2-4 as secondary
        hero_article: Optional[ArticleRecord] = None
        front_page_secondary: List[ArticleRecord] = []
        remaining_pool = list(articles)

        for art in articles:
            if art.is_breaking and hero_article is None:
                hero_article = art
                remaining_pool.remove(art)
                break

        if hero_article is None and remaining_pool:
            hero_article = remaining_pool.pop(0)

        for art in remaining_pool[:4]:
            front_page_secondary.append(art)
            remaining_pool.remove(art)

        # "Inside this edition" digest
        inside_digest = []
        section_map = [
            ("U.S. & World", us_world),
            ("Business", business),
            ("Community", community),
            ("Opinion", opinion),
            ("More News", other),
        ]
        for section_name, section_arts in section_map:
            if section_arts:
                inside_digest.append({
                    "section": section_name,
                    "headline": section_arts[0].title,
                })

        # Build template context
        newspaper_name = self.config.email.newspaper_name
        context = {
            "newspaper_name": newspaper_name,
            "edition_date": edition_dt.strftime("%B %d, %Y"),
            "volume": edition_dt.year - 2023,  # rough volume number
            "breaking_articles": [a for a in articles if a.is_breaking],
            "hero": _article_to_ctx(hero_article) if hero_article else None,
            "front_page_secondary": [_article_to_ctx(a) for a in front_page_secondary],
            "inside_digest": inside_digest,
            "us_world_articles": [_article_to_ctx(a) for a in us_world[:12]],
            "business_articles": [_article_to_ctx(a) for a in business[:8]],
            "community_articles": [_article_to_ctx(a) for a in community[:8]],
            "opinion_articles": [_article_to_ctx(a) for a in opinion[:6]],
            "other_articles": [_article_to_ctx(a) for a in other[:9]],
        }

        # Render HTML
        template = self.jinja_env.get_template(TEMPLATE_NAME)
        html_content = template.render(**context)

        # Generate PDF with WeasyPrint
        try:
            from weasyprint import HTML as WeasyHTML
        except ImportError:
            raise ImportError(
                "weasyprint is required for newspaper generation. "
                "Run: pip install weasyprint"
            )

        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        safe_date = job.edition_date.replace("-", "")
        filename = f"edition_{safe_date}.pdf"
        output_path = OUTPUT_DIR / filename

        logger.info("Rendering PDF → %s", output_path)
        WeasyHTML(string=html_content, base_url=str(self.templates_dir)).write_pdf(str(output_path))

        logger.info("Weekly edition PDF generated: %s (%d articles)", output_path, len(articles))
        return str(output_path.resolve())

    def run_job(self, job: WeeklyEditionJob) -> None:
        """Process a single weekly edition job, updating its DB status throughout."""
        self.db.update_weekly_edition(job.id, "generating")
        try:
            pdf_path = self.generate(job)
            article_count = self.db.get_articles_since(
                datetime.fromisoformat(job.edition_date) - timedelta(days=7), limit=80
            )
            self.db.update_weekly_edition(
                job.id, "done",
                pdf_path=pdf_path,
                article_count=len(article_count),
            )
        except Exception as exc:
            logger.exception("Failed to generate weekly edition job %d: %s", job.id, exc)
            self.db.update_weekly_edition(job.id, "failed")
            raise
