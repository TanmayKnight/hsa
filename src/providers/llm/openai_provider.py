"""
OpenAI provider stub.

To activate:
1. pip install openai
2. Set LLM_API_KEY=<your_openai_key> in .env
3. Set llm.provider: openai in config/config.yaml
4. Uncomment the OpenAIProvider entry in src/providers/llm/__init__.py
"""
from typing import List, Dict, Any
from src.providers.llm.base import LLMProvider
from src.models import Article


class OpenAIProvider(LLMProvider):

    def __init__(self, api_key: str, model: str = "gpt-4o"):
        # TODO: from openai import OpenAI; self.client = OpenAI(api_key=api_key)
        self.model = model
        raise NotImplementedError(
            "OpenAI provider is not yet implemented. "
            "See the docstring of this file for activation instructions."
        )

    def extract_articles(self, content: Dict[str, Any]) -> List[Article]:
        raise NotImplementedError

    def get_embedding(self, text: str) -> List[float]:
        raise NotImplementedError

    def summarize(self, article: Article) -> str:
        raise NotImplementedError
