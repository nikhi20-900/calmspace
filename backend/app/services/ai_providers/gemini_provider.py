"""
Gemini AI Provider Adapter
Uses httpx to invoke the Google Gemini REST API synchronously.
Transmits API keys strictly via HTTP headers (x-goog-api-key), never in URL parameters.
Does not log API keys, reflection text, or raw credentials.
"""

import httpx

from app.services.ai_providers.base import BaseAIProvider, ProviderRawResponse


class GeminiAIProvider(BaseAIProvider):
    def __init__(self, api_key: str, model: str = "gemini-1.5-flash"):
        self.api_key = api_key
        self.model = model
        self.call_count = 0

    def generate_support(
        self,
        system_instruction: str,
        user_prompt: str,
        timeout_seconds: float = 5.0,
        max_tokens: int = 350,
    ) -> ProviderRawResponse:
        self.call_count += 1
        if not self.api_key or not self.api_key.strip():
            raise ValueError("Gemini API key is not configured")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"

        payload = {
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {
                "maxOutputTokens": max_tokens,
                "temperature": 0.3,
                "responseMimeType": "application/json",
            },
        }

        # Header-based API key transport: prevents credential leakage in query strings,
        # URL access logs, upstream reverse proxies, and observability spans.
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key.strip(),
        }

        with httpx.Client(timeout=timeout_seconds) as client:
            resp = client.post(
                url,
                json=payload,
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()

            candidates = data.get("candidates", [])
            if not candidates:
                raise ValueError("No generation candidate returned by Gemini API")

            content = candidates[0].get("content", {})
            parts = content.get("parts", [])
            if not parts:
                raise ValueError("Empty response parts from Gemini API")

            raw_text = parts[0].get("text", "")
            return ProviderRawResponse(
                raw_text=raw_text,
                model_name=self.model,
                tokens_used=data.get("usageMetadata", {}).get("totalTokenCount"),
            )
