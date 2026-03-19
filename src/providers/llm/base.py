from abc import ABC, abstractmethod
from typing import List, Dict, Any
from src.models import Article


class LLMProvider(ABC):
    """
    Abstract base class for LLM providers.
    Implement this interface to add a new provider (e.g., OpenAI, Anthropic).
    """

    @abstractmethod
    def extract_articles(self, content: Dict[str, Any]) -> List[Article]:
        """
        Extract news/editorial articles from PDF page content.

        Args:
            content: {
                "type": "text" | "image",
                "pages": list of page dicts,
                "source_pdf": str (path to source PDF)
            }
            For type "text":
                pages = [{"page_num": int, "text": str}, ...]
            For type "image":
                pages = [{"page_num": int, "image_bytes": bytes}, ...]

        Returns:
            List of Article objects. Only news/editorial articles, no ads or classifieds.
        """

    @abstractmethod
    def get_embedding(self, text: str) -> List[float]:
        """
        Get a vector embedding for the given text.
        Used for semantic duplicate detection via cosine similarity.
        """

    @abstractmethod
    def summarize(self, article: Article) -> str:
        """
        Summarize the article into 3-4 sentences.
        Must paraphrase to avoid plagiarism — do not copy sentences verbatim.
        Returns a plain string (the summary).
        """
