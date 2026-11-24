"""
Mock AI Provider for Testing and Offline Execution
Generates deterministic, safe, formatted JSON guidance responses without network calls.
Allows test configuration to simulate errors, timeouts, or malformed responses.
"""

import json
import time

from app.services.ai_providers.base import BaseAIProvider, ProviderRawResponse


class MockAIProvider(BaseAIProvider):
    def __init__(
        self,
        canned_response: str | None = None,
        simulate_timeout: bool = False,
        simulate_error: Exception | None = None,
    ):
        self.canned_response = canned_response
        self.simulate_timeout = simulate_timeout
        self.simulate_error = simulate_error
        self.call_count = 0
        self.last_prompt: str | None = None
        self.last_system_instruction: str | None = None

    def generate_support(
        self,
        system_instruction: str,
        user_prompt: str,
        timeout_seconds: float = 5.0,
        max_tokens: int = 350,
    ) -> ProviderRawResponse:
        self.call_count += 1
        self.last_prompt = user_prompt
        self.last_system_instruction = system_instruction

        if self.simulate_timeout:
            time.sleep(0.05)
            raise TimeoutError("Mock provider call timed out")

        if self.simulate_error:
            raise self.simulate_error

        if self.canned_response is not None:
            return ProviderRawResponse(
                raw_text=self.canned_response,
                model_name="mock-model-custom",
                tokens_used=50,
            )

        # Default non-clinical empathetic supportive response conforming to schema
        default_payload = {
            "message": (
                "Navigating academic coursework alongside everyday life requires meaningful pacing. "
                "Giving yourself permission to focus on one small priority at a time can help steady your rhythm. "
                "Remember to honour whatever gentle rest helps you feel grounded today."
            ),
            "suggestion_chips": [
                "Take a 5-minute hydration stretch",
                "Break your next task into two smaller steps",
            ],
        }
        return ProviderRawResponse(
            raw_text=json.dumps(default_payload),
            model_name="mock-support-v1",
            tokens_used=65,
        )
