import logging
from typing import List

from src.models import ProcessedArticle
from src.providers.llm.base import LLMProvider

logger = logging.getLogger(__name__)


class Summarizer:
    """
    Generates 4-5 sentence email summaries from the rewritten article content.
    Skips duplicate articles to avoid unnecessary API calls.
    """

    def __init__(self, llm_provider: LLMProvider):
        self.llm = llm_provider

    def summarize_all(self, processed_articles: List[ProcessedArticle]) -> List[ProcessedArticle]:
        """
        Generate email summaries for all non-duplicate articles.
        Modifies articles in-place and returns the same list.
        """
        unique = [a for a in processed_articles if not a.is_duplicate]
        logger.info(
            "Summarizing %d unique articles (skipping %d duplicates)",
            len(unique),
            len(processed_articles) - len(unique),
        )

        for pa in unique:
            try:
                pa.summary = self.llm.summarize(pa.rewritten_content)
                logger.info("Summarized: '%s'", pa.article.title)
            except Exception as e:
                logger.error(
                    "Failed to summarize '%s': %s", pa.article.title, e, exc_info=True
                )
                # Fallback: first 500 chars of rewritten content
                pa.summary = pa.rewritten_content[:500].rsplit(" ", 1)[0] + "…"

        return processed_articles
