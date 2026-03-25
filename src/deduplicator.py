import logging
from typing import List, Optional

from src.providers.db.base import DBProvider

logger = logging.getLogger(__name__)


class Deduplicator:
    """
    Cross-run duplicate detection for rewritten articles.

    Checks whether the embedding of a newly rewritten article is semantically
    similar to any article already published in the database.  Articles above
    the similarity threshold are considered duplicates and skipped — preventing
    the same story from being republished in a later run.

    Story-grouping within the current batch is handled by src/rewriter.py.
    """

    def __init__(self, db_provider: DBProvider, similarity_threshold: float = 0.85):
        self.db = db_provider
        self.threshold = similarity_threshold

    def is_duplicate(self, embedding: List[float]) -> Optional[str]:
        """
        Check whether a rewritten article has already been published.

        Args:
            embedding: vector embedding of the rewritten article

        Returns:
            Title of the matching published article if duplicate, else None.
        """
        return self.db.find_similar_article(embedding, self.threshold)
