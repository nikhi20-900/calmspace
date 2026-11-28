"""Provider adapter for optional backend-mediated ElevenLabs speech."""

import httpx

from app.core.voice_config import VoiceProviderConfig


class ElevenLabsTTSProvider:
    def __init__(self, config: VoiceProviderConfig):
        if config.provider != "elevenlabs" or not config.api_key or not config.voice_id:
            raise ValueError("ElevenLabs voice configuration is incomplete.")
        self.config = config

    def synthesize(self, text: str) -> bytes:
        """Return bounded MPEG audio without logging text or credentials."""
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{self.config.voice_id}"
        headers = {
            "xi-api-key": self.config.api_key,
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
        }
        payload = {
            "text": text,
            "model_id": self.config.model_id,
            "voice_settings": {"stability": 0.55, "similarity_boost": 0.75},
        }
        with httpx.Client(timeout=self.config.timeout_seconds) as client:
            response = client.post(url, headers=headers, json=payload)
            response.raise_for_status()
        content_type = response.headers.get("content-type", "").lower()
        audio = response.content
        if not content_type.startswith("audio/") or not audio or len(audio) > 2_000_000:
            raise ValueError(
                "ElevenLabs returned an invalid or oversized audio response."
            )
        return audio
