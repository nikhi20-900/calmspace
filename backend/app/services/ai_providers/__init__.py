"""
Calmspace AI Providers Module
"""

from app.core.config import AIServiceConfig
from app.services.ai_providers.base import BaseAIProvider, ProviderRawResponse
from app.services.ai_providers.gemini_provider import GeminiAIProvider
from app.services.ai_providers.mock_provider import MockAIProvider


def get_ai_provider(config: AIServiceConfig) -> BaseAIProvider:
    if config.provider == "gemini":
        if not config.api_key or not config.api_key.strip():
            raise ValueError(
                "Gemini provider selected but CALMSPACE_AI_API_KEY / GEMINI_API_KEY is not configured."
            )
        return GeminiAIProvider(api_key=config.api_key, model=config.model)
    if config.provider == "mock":
        return MockAIProvider()
    raise ValueError(f"Unsupported AI provider: {config.provider}")


__all__ = [
    "BaseAIProvider",
    "GeminiAIProvider",
    "MockAIProvider",
    "ProviderRawResponse",
    "get_ai_provider",
]
