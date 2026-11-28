"""
Abstract Base Provider for Calmspace AI Guidance
Defines the provider-neutral interface.
"""

from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel


class ProviderRawResponse(BaseModel):
    raw_text: str
    model_name: str
    tokens_used: int | None = None
    metadata: dict[str, Any] = {}


class ProviderToolCall(BaseModel):
    name: str
    arguments: dict[str, Any] = {}


class CompanionProviderTurn(BaseModel):
    reply_text: str = ""
    tool_calls: list[ProviderToolCall] = []
    model_name: str = "unknown"
    raw_parts: list[dict[str, Any]] = []


class BaseAIProvider(ABC):
    @abstractmethod
    def generate_support(
        self,
        system_instruction: str,
        user_prompt: str,
        timeout_seconds: float = 5.0,
        max_tokens: int = 350,
    ) -> ProviderRawResponse:
        """
        Invokes the provider with strictly separated system instruction and user prompt.
        Raises an exception if the provider call fails, is rejected, or times out.
        """

    def generate_companion_turn(
        self,
        system_instruction: str,
        contents: list[dict[str, Any]],
        tool_declarations: list[dict[str, Any]],
        timeout_seconds: float = 8.0,
        max_tokens: int = 350,
    ) -> CompanionProviderTurn:
        """
        Optional multi-turn conversational method with structured tool declarations.
        Providers that do not implement function calling raise NotImplementedError.
        """
        raise NotImplementedError(
            "Conversational tool-calling not implemented for this provider"
        )
