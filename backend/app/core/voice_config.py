"""Backend-only voice synthesis configuration."""

import os
import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class VoiceProviderConfig(BaseModel):
    provider: Literal["browser", "elevenlabs"] = "browser"
    api_key: str | None = Field(default=None, repr=False)
    voice_id: str | None = None
    model_id: str = "eleven_multilingual_v2"
    timeout_seconds: float = Field(default=12.0, ge=1.0, le=30.0)

    @field_validator("voice_id")
    @classmethod
    def validate_voice_id(cls, value: str | None) -> str | None:
        if value is not None and not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", value):
            raise ValueError("ELEVENLABS_VOICE_ID has an invalid format.")
        return value

    @field_validator("model_id")
    @classmethod
    def validate_model_id(cls, value: str) -> str:
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", value):
            raise ValueError("ELEVENLABS_MODEL_ID has an invalid format.")
        return value

    @classmethod
    def from_env(cls) -> "VoiceProviderConfig":
        provider = os.getenv("CALMSPACE_VOICE_PROVIDER", "browser").strip().lower()
        if provider not in {"browser", "elevenlabs"}:
            raise ValueError("Unsupported CALMSPACE_VOICE_PROVIDER.")
        api_key = (os.getenv("ELEVENLABS_API_KEY") or "").strip() or None
        voice_id = (os.getenv("ELEVENLABS_VOICE_ID") or "").strip() or None
        if provider == "elevenlabs" and (not api_key or not voice_id):
            raise ValueError(
                "ElevenLabs is selected but its backend API key or voice ID is missing."
            )
        return cls(
            provider=provider,
            api_key=api_key,
            voice_id=voice_id,
            model_id=os.getenv("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2").strip(),
            timeout_seconds=float(os.getenv("ELEVENLABS_TIMEOUT_SECONDS", "12.0")),
        )
