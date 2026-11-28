"""
AI Guidance Service Configuration
Validated environment configuration for AI providers, models, timeouts, and rate limits.
"""

import os
import sys
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field

DEFAULT_LOCAL_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


def load_local_env(env_file: Path | None = None, *, override: bool = False) -> bool:
    """
    Loads key=value pairs from a local .env file (default: backend/app/.env)
    into os.environ without printing or logging values.
    """
    target = env_file or DEFAULT_LOCAL_ENV_FILE
    if not target.is_file():
        return False

    for raw_line in target.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].strip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if not key:
            continue
        value = value.strip()
        if len(value) >= 2 and (
            (value.startswith('"') and value.endswith('"'))
            or (value.startswith("'") and value.endswith("'"))
        ):
            value = value[1:-1]
        if override or key not in os.environ:
            os.environ[key] = value
    return True


class AIServiceConfig(BaseModel):
    provider: Literal["mock", "gemini"] = Field(
        default="mock",
        description="Active AI provider adapter ('mock' or 'gemini')",
    )
    model: str = Field(
        default="gemini-3.8-flash",
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
    allow_process_local_rate_limiter: bool = Field(
        default=True,
        description="Allows in-memory rate limiting for single-process demo. Set False to block production until shared enforcement exists.",
    )
    enabled: bool = Field(
        default=True,
        description="Master switch for AI guidance provider calls",
    )

    @classmethod
    def from_env(cls) -> "AIServiceConfig":
        """
        Loads configuration from environment variables with strict validation.
        Fails closed on invalid provider values or missing required credentials.
        """
        if "pytest" not in sys.modules:
            load_local_env()

        raw_provider = os.getenv("CALMSPACE_AI_PROVIDER", "").strip().lower()
        api_key = os.getenv("CALMSPACE_AI_API_KEY") or os.getenv("GEMINI_API_KEY")
        if api_key:
            api_key = api_key.strip() or None

        # Fail closed on invalid provider values
        if raw_provider:
            if raw_provider not in ("gemini", "mock"):
                raise ValueError(
                    f"Invalid CALMSPACE_AI_PROVIDER '{raw_provider}'. Supported providers are 'mock' and 'gemini'."
                )
            provider = raw_provider
        else:
            # Documented default: 'mock' for safe local/offline execution
            provider = "mock"

        # Fail closed if Gemini is chosen without credentials
        if provider == "gemini" and not api_key:
            raise ValueError(
                "CALMSPACE_AI_PROVIDER is set to 'gemini' but neither CALMSPACE_AI_API_KEY nor GEMINI_API_KEY is configured."
            )

        model = os.getenv("CALMSPACE_AI_MODEL", "gemini-3.8-flash").strip()
        timeout = float(os.getenv("CALMSPACE_AI_TIMEOUT_SECONDS", "5.0"))
        max_tokens = int(os.getenv("CALMSPACE_AI_MAX_TOKENS", "350"))
        rate_limit = int(os.getenv("CALMSPACE_AI_RATE_LIMIT_PER_MINUTE", "5"))
        daily_budget = int(os.getenv("CALMSPACE_AI_DAILY_BUDGET_LIMIT", "200"))
        enabled_val = os.getenv("CALMSPACE_AI_ENABLED", "true").strip().lower()
        enabled = enabled_val in ("1", "true", "yes", "on")

        env_mode = os.getenv("CALMSPACE_ENV", "development").strip().lower()
        allow_local_str = (
            os.getenv("CALMSPACE_AI_ALLOW_LOCAL_RATE_LIMITER", "").strip().lower()
        )
        if allow_local_str:
            allow_local = allow_local_str in ("1", "true", "yes", "on")
        else:
            # Default allow local in dev/test; require explicit opt-in in production
            allow_local = env_mode != "production"

        return cls(
            provider=provider,
            model=model,
            api_key=api_key,
            timeout_seconds=timeout,
            max_tokens=max_tokens,
            rate_limit_per_minute=rate_limit,
            daily_budget_limit=daily_budget,
            allow_process_local_rate_limiter=allow_local,
            enabled=enabled,
        )


_cached_config: AIServiceConfig | None = None


def get_ai_config(reload: bool = False) -> AIServiceConfig:
    global _cached_config
    if _cached_config is None or reload:
        _cached_config = AIServiceConfig.from_env()
    return _cached_config
