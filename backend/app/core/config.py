"""
AI Guidance Service Configuration
Validated environment configuration for AI providers, models, timeouts, and rate limits.
"""

import os
from typing import Literal

from pydantic import BaseModel, Field


class AIServiceConfig(BaseModel):
    provider: Literal["mock", "gemini"] = Field(
        default="mock",
        description="Active AI provider adapter ('mock' or 'gemini')",
    )
    model: str = Field(
        default="gemini-1.5-flash",
        description="Provider-specific model identifier",
    )
    api_key: str | None = Field(
        default=None,
        description="API key for provider authentication (never logged)",
    )
    timeout_seconds: float = Field(
        default=5.0,
        ge=0.5,
        le=30.0,
        description="HTTP/generation timeout in seconds",
    )
    max_tokens: int = Field(
        default=350,
        ge=50,
        le=1000,
        description="Maximum tokens allowed for supportive response",
    )
    rate_limit_per_minute: int = Field(
        default=5,
        ge=1,
        le=60,
        description="Max AI guidance requests per minute per session",
    )
    daily_budget_limit: int = Field(
        default=200,
        ge=1,
        description="Max total AI calls allowed per day across all sessions",
    )
    enabled: bool = Field(
        default=True,
        description="Master switch for AI guidance provider calls",
    )

    @classmethod
    def from_env(cls) -> "AIServiceConfig":
        """Loads configuration from environment variables with safe defaults."""
        raw_provider = os.getenv("CALMSPACE_AI_PROVIDER", "").strip().lower()
        api_key = os.getenv("CALMSPACE_AI_API_KEY") or os.getenv("GEMINI_API_KEY")

        # If provider is not explicitly set, prefer gemini if API key is present, else mock
        if not raw_provider:
            provider = "gemini" if api_key else "mock"
        elif raw_provider in ("gemini", "mock"):
            provider = raw_provider
        else:
            provider = "mock"

        model = os.getenv("CALMSPACE_AI_MODEL", "gemini-1.5-flash").strip()
        timeout = float(os.getenv("CALMSPACE_AI_TIMEOUT_SECONDS", "5.0"))
        max_tokens = int(os.getenv("CALMSPACE_AI_MAX_TOKENS", "350"))
        rate_limit = int(os.getenv("CALMSPACE_AI_RATE_LIMIT_PER_MINUTE", "5"))
        daily_budget = int(os.getenv("CALMSPACE_AI_DAILY_BUDGET_LIMIT", "200"))
        enabled_val = os.getenv("CALMSPACE_AI_ENABLED", "true").strip().lower()
        enabled = enabled_val in ("1", "true", "yes", "on")

        return cls(
            provider=provider,
            model=model,
            api_key=api_key if api_key else None,
            timeout_seconds=timeout,
            max_tokens=max_tokens,
            rate_limit_per_minute=rate_limit,
            daily_budget_limit=daily_budget,
            enabled=enabled,
        )


_cached_config: AIServiceConfig | None = None


def get_ai_config(reload: bool = False) -> AIServiceConfig:
    global _cached_config
    if _cached_config is None or reload:
        _cached_config = AIServiceConfig.from_env()
    return _cached_config
