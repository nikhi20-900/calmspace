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
