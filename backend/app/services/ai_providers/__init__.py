"""
Calmspace AI Providers Module
"""

from app.core.config import AIServiceConfig
from app.services.ai_providers.base import BaseAIProvider, ProviderRawResponse
from app.services.ai_providers.gemini_provider import GeminiAIProvider
from app.services.ai_providers.mock_provider import MockAIProvider


def get_ai_provider(config: AIServiceConfig) -> BaseAIProvider:
    if config.provider == "gemini" and config.api_key:
        return GeminiAIProvider(api_key=config.api_key, model=config.model)
    return MockAIProvider()


__all__ = [
    "BaseAIProvider",
    "GeminiAIProvider",
    "MockAIProvider",
    "ProviderRawResponse",
    "get_ai_provider",
]
