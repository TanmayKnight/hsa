import logging
import uuid
from typing import List, Optional

from src.models import Article, ProcessedArticle
from src.providers.db.base import DBProvider

logger = logging.getLogger(__name__)


class DigestStore:
    """
    Persists completed digest article slugs so the email can be resent
    without reprocessing any PDFs (e.g. if sending failed).
    """

    def __init__(self, db_provider: DBProvider):
        self.db = db_provider

    def save_digest(self, articles: List[ProcessedArticle]) -> str:
        """
        Record which articles were included in this digest.
        Returns the batch_id.
        """
        batch_id = str(uuid.uuid4())
        unique_slugs = [
            a.article.source_pdf  # use website_url slug portion as identifier
            for a in articles
            if not a.is_duplicate
        ]
        # Store the website URLs (which contain the slug) so we can reload articles
        unique_urls = [a.pdf_link for a in articles if not a.is_duplicate]
        self.db.save_digest(batch_id, unique_urls)
        logger.info(
            "Saved digest (batch: %s, %d unique articles)", batch_id, len(unique_urls)
        )
        return batch_id

    def load_last_digest(self) -> Optional[List[ProcessedArticle]]:
        """
        Reload the most recently saved digest as ProcessedArticle objects.
        Returns None if no digest has been saved yet.
        """
        urls = self.db.load_last_digest_slugs()
        if not urls:
            return None

        articles = []
        for url in urls:
            # Extract slug from URL: last path segment
            slug = url.rstrip("/").split("/")[-1]
            record = self.db.get_article(slug)
            if record is None:
                logger.warning("Article not found for slug '%s' — skipping in resend", slug)
                continue

            raw_article = Article(
                title=record.title,
                content="",          # not needed for email resend
                page_number=0,
                source_pdf="",
                category=record.category,
            )
            articles.append(ProcessedArticle(
                article=raw_article,
                summary=record.summary,
                embedding=[],        # not needed for resend
                pdf_link=record.website_url,
                is_duplicate=False,
                rewritten_content=record.rewritten_content,
            ))

        logger.info("Loaded %d articles from last digest for resend", len(articles))
        return articles if articles else None
