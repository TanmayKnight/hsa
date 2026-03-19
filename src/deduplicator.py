import sqlite3
import json
import hashlib
import logging
from typing import List, Tuple, Optional
from datetime import datetime

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from src.models import Article, ProcessedArticle
from src.providers.llm.base import LLMProvider

logger = logging.getLogger(__name__)

DB_PATH = "data/articles.db"


class Deduplicator:
    """
    Detects duplicate news articles using semantic similarity.

    Strategy:
    1. Generate embedding for each article using the LLM provider
    2. Compare against all previously stored embeddings (cosine similarity)
    3. Articles above the similarity threshold are considered duplicates
    4. Results are persisted in SQLite so duplicates are caught across runs
    """

    def __init__(self, llm_provider: LLMProvider, similarity_threshold: float = 0.85):
        self.llm = llm_provider
        self.threshold = similarity_threshold
        self._init_db()

    def _init_db(self) -> None:
        import os
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        conn = sqlite3.connect(DB_PATH)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS processed_articles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content_hash TEXT NOT NULL,
                embedding_json TEXT NOT NULL,
                source_pdf TEXT NOT NULL,
                page_number INTEGER NOT NULL,
                processed_at TEXT NOT NULL
            )
        """)
        conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_content_hash ON processed_articles(content_hash)")
        conn.commit()
        conn.close()

    def _content_hash(self, article: Article) -> str:
        """SHA256 hash of normalized content for fast exact-duplicate check."""
        normalized = " ".join(article.content.lower().split())
        return hashlib.sha256(normalized.encode()).hexdigest()

    def _get_all_stored_embeddings(self) -> List[Tuple[str, List[float]]]:
        """Returns list of (title, embedding) for all stored articles."""
        conn = sqlite3.connect(DB_PATH)
        rows = conn.execute("SELECT title, embedding_json FROM processed_articles").fetchall()
        conn.close()
        return [(row[0], json.loads(row[1])) for row in rows]

    def _store_article(self, article: Article, embedding: List[float]) -> None:
        content_hash = self._content_hash(article)
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute(
                """INSERT OR IGNORE INTO processed_articles
                   (title, content_hash, embedding_json, source_pdf, page_number, processed_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    article.title,
                    content_hash,
                    json.dumps(embedding),
                    article.source_pdf,
                    article.page_number,
                    datetime.now().isoformat(),
                )
            )
            conn.commit()
        finally:
            conn.close()

    def _find_duplicate(
        self, embedding: List[float], stored: List[Tuple[str, List[float]]]
    ) -> Optional[str]:
        """
        Check if the given embedding is semantically similar to any stored article.
        Returns the title of the matching article, or None.
        """
        if not stored:
            return None

        query_vec = np.array(embedding).reshape(1, -1)
        stored_vecs = np.array([e for _, e in stored])

        similarities = cosine_similarity(query_vec, stored_vecs)[0]
        max_idx = int(np.argmax(similarities))
        max_sim = float(similarities[max_idx])

        logger.debug("Max similarity: %.4f (threshold: %.4f)", max_sim, self.threshold)

        if max_sim >= self.threshold:
            return stored[max_idx][0]  # Return title of matching article
        return None

    def process_articles(
        self, articles: List[Article], pdf_link: str
    ) -> List[ProcessedArticle]:
        """
        Process a list of articles: generate embeddings and check for duplicates.

        Note: This method generates embeddings only. Summaries are generated separately
        by the Summarizer (only for non-duplicate articles, to save API calls).

        Returns ProcessedArticle objects. Duplicate articles have is_duplicate=True
        and an empty summary (to be skipped by the summarizer).
        """
        # Load all existing embeddings once for batch comparison
        stored_embeddings = self._get_all_stored_embeddings()

        processed = []
        # Also track embeddings from current batch (within-batch dedup)
        current_batch: List[Tuple[str, List[float]]] = []

        for article in articles:
            logger.info("Processing: '%s'", article.title)

            # Generate embedding
            embed_text = f"{article.title}\n\n{article.content}"
            embedding = self.llm.get_embedding(embed_text)

            # Check against stored + current batch
            all_known = stored_embeddings + current_batch
            duplicate_of = self._find_duplicate(embedding, all_known)

            if duplicate_of:
                logger.info("  → DUPLICATE of '%s'", duplicate_of)
                processed.append(ProcessedArticle(
                    article=article,
                    summary="",
                    embedding=embedding,
                    pdf_link=pdf_link,
                    is_duplicate=True,
                    duplicate_of=duplicate_of,
                ))
            else:
                processed.append(ProcessedArticle(
                    article=article,
                    summary="",  # Will be filled by Summarizer
                    embedding=embedding,
                    pdf_link=pdf_link,
                    is_duplicate=False,
                ))
                # Add to current batch and persist
                current_batch.append((article.title, embedding))
                self._store_article(article, embedding)

        return processed
