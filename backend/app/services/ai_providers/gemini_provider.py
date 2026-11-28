"""
Gemini AI Provider Adapter
Uses httpx to invoke the Google Gemini REST API synchronously.
Transmits API keys strictly via HTTP headers (x-goog-api-key), never in URL parameters.
Does not log API keys, reflection text, or raw credentials.
"""

from typing import Any

import httpx

from app.services.ai_providers.base import (
    BaseAIProvider,
    CompanionProviderTurn,
    ProviderRawResponse,
    ProviderToolCall,
)


class GeminiAIProvider(BaseAIProvider):
    def __init__(self, api_key: str, model: str = "gemini-3.8-flash"):
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

    def generate_companion_turn(
        self,
        system_instruction: str,
        contents: list[dict[str, Any]],
        tool_declarations: list[dict[str, Any]],
        timeout_seconds: float = 8.0,
        max_tokens: int = 350,
    ) -> CompanionProviderTurn:
        self.call_count += 1
        if not self.api_key or not self.api_key.strip():
            raise ValueError("Gemini API key is not configured")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"

        payload: dict[str, Any] = {
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "contents": contents,
            "generationConfig": {
                "maxOutputTokens": max_tokens,
                "temperature": 0.65,
            },
        }
        if tool_declarations:
            payload["tools"] = [{"functionDeclarations": tool_declarations}]

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

        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            raise ValueError("Empty response parts from Gemini API")

        text_chunks: list[str] = []
        tool_calls: list[ProviderToolCall] = []
        for part in parts:
            if isinstance(part, dict):
                if "text" in part and isinstance(part["text"], str):
                    text_chunks.append(part["text"])
                if "functionCall" in part and isinstance(part["functionCall"], dict):
                    fc = part["functionCall"]
                    name = str(fc.get("name", "")).strip()
                    raw_args = fc.get("args")
                    args = raw_args if isinstance(raw_args, dict) else {}
                    if name:
                        tool_calls.append(ProviderToolCall(name=name, arguments=args))

        return CompanionProviderTurn(
            reply_text=" ".join(t.strip() for t in text_chunks if t.strip()).strip(),
            tool_calls=tool_calls,
            model_name=self.model,
            raw_parts=parts,
        )
