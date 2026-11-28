import asyncio
import base64

import pytest

pytestmark = pytest.mark.skip(
    reason="Legacy local companion prototype; the merged Companion Agent is covered by test_companion_agent.py."
)

from app.core.config import AIServiceConfig
from app.core.voice_config import VoiceProviderConfig
from app.models.schemas import CompanionTurnRequest
from app.routers import companion as companion_router
from app.services.ai_providers.base import ProviderRawResponse
from app.services.companion import (
    _gemini_agent_output,
    create_companion_reminder,
    handle_companion_turn,
)
from app.services.voice_providers import ElevenLabsTTSProvider


def test_crisis_message_routes_to_human_support_before_ai(monkeypatch):
    def forbidden_ai_call(**_kwargs):
        raise AssertionError("AI must not be called for high-risk messages")

    monkeypatch.setattr("app.services.companion._gemini_agent_output", forbidden_ai_call)
    result = handle_companion_turn(
        CompanionTurnRequest(
            message="I want to end my life",
            consent_ai_processing=True,
        )
    )

    assert result["route"] == "HIGH"
    assert result["visual_state"] == "support"
    assert result["support_contacts"]
    assert "112" in result["reply"]


def test_reminder_action_requires_explicit_confirmation():
    result = handle_companion_turn(
        CompanionTurnRequest(message="Can you remind me to take a break?")
    )

    assert result["action"].name == "create_reminder"
    assert result["action"].confirmation_required is True
    assert (
        create_companion_reminder(
            confirmed=False,
            title="Take a short break",
            estimated_minutes=5,
            session_id="student-12345678",
        )
        is None
    )


def test_messages_are_only_returned_for_active_turn():
    result = handle_companion_turn(
        CompanionTurnRequest(
            message="Hi",
            history=[{"role": "user", "content": "I have exams coming up"}],
        )
    )

    assert result["reply"]
    assert result["route"] == "LOW"


def test_positive_mood_gets_a_direct_acknowledgment():
    result = handle_companion_turn(CompanionTurnRequest(message="m felling good today"))

    assert result["reply"] == "I'm glad you're feeling good today. What's been going well?"


def test_negative_feeling_is_not_mistaken_for_positive_mood():
    result = handle_companion_turn(CompanionTurnRequest(message="I'm not feeling good today"))

    assert "glad you're feeling good" not in result["reply"]


def test_exam_failure_gets_a_specific_supportive_reply():
    result = handle_companion_turn(CompanionTurnRequest(message="I failed my exam"))

    assert "painful disappointment" in result["reply"]
    assert "What part feels most important" not in result["reply"]


def test_general_failure_statement_is_acknowledged_instead_of_generic_ai_guidance(
    monkeypatch,
):
    monkeypatch.setattr(
        "app.services.companion.get_ai_config",
        lambda: AIServiceConfig(provider="mock"),
    )
    result = handle_companion_turn(
        CompanionTurnRequest(message="I have failed", consent_ai_processing=True)
    )

    assert "I'm sorry it feels like you've failed" in result["reply"]
    assert "Would you like to tell me what happened?" in result["reply"]
    assert "Navigating academic coursework" not in result["reply"]


def test_help_follow_up_uses_the_recent_failure_context():
    result = handle_companion_turn(
        CompanionTurnRequest(
            history=[
                {"role": "user", "content": "I have failed"},
                {"role": "assistant", "content": "Would you like to tell me what happened?"},
            ],
            message="Can you help me with it?",
        )
    )

    assert "Yes. We can take it one step at a time." in result["reply"]
    assert "exam, an assignment, or something else" in result["reply"]


def test_overwhelm_message_gets_a_specific_open_question():
    result = handle_companion_turn(
        CompanionTurnRequest(message="I'm overwhelmed with everything right now")
    )

    assert result["reply"] == "That sounds overwhelming. What is weighing on you most right now?"


def test_mock_provider_no_longer_returns_one_canned_paragraph_for_every_message(
    monkeypatch,
):
    monkeypatch.setattr(
        "app.services.companion.get_ai_config",
        lambda: AIServiceConfig(provider="mock"),
    )
    result = handle_companion_turn(
        CompanionTurnRequest(
            message="I feel overwhelmed by my group project", consent_ai_processing=True
        )
    )

    assert result["reply"] == "That sounds overwhelming. What is weighing on you most right now?"
    assert "Navigating academic coursework" not in result["reply"]


def test_follow_up_about_coursework_uses_the_prior_turn():
    result = handle_companion_turn(
        CompanionTurnRequest(
            history=[
                {"role": "user", "content": "I have an assignment due tomorrow"},
                {"role": "assistant", "content": "What feels hardest about it?"},
            ],
            message="Can you help me with it?",
        )
    )

    assert "what is most urgent" in result["reply"]
    assert "That sounds like a lot to hold" not in result["reply"]


def test_greeting_does_not_use_the_ai_guidance_template():
    result = handle_companion_turn(
        CompanionTurnRequest(message="hello", consent_ai_processing=True)
    )

    assert result["reply"] == "Hi, I'm here with you. How are you feeling today?"


def test_feeling_unwell_gets_a_direct_supportive_response():
    result = handle_companion_turn(
        CompanionTurnRequest(message="im not feeling well help me", consent_ai_processing=True)
    )

    assert "I'm sorry you're feeling unwell" in result["reply"]
    assert "Navigating academic coursework" not in result["reply"]


def test_gemini_action_is_typed_and_persistent_actions_are_confirmation_gated(
    monkeypatch,
):
    class Provider:
        def generate_support(self, **_kwargs):
            assert "Reflect one specific detail" in _kwargs["system_instruction"]
            assert "at most 55 words" in _kwargs["system_instruction"]
            return ProviderRawResponse(
                raw_text=(
                    '{"reply":"I can add a short break. Would you like me to save it?",'
                    '"action":{"name":"create_reminder","title":"Add break",'
                    '"confirmation_required":false}}'
                ),
                model_name="test",
            )

    monkeypatch.setattr(
        "app.services.companion.get_ai_config",
        lambda: AIServiceConfig(provider="gemini", api_key="test-key"),
    )
    monkeypatch.setattr(
        "app.services.companion.get_ai_provider", lambda _cfg: Provider()
    )
    monkeypatch.setattr(
        "app.services.companion.rate_limiter.is_allowed", lambda *_a, **_k: True
    )
    monkeypatch.setattr(
        "app.services.companion.rate_limiter.record_call", lambda *_a: None
    )

    output = _gemini_agent_output(
        CompanionTurnRequest(message="Can you remind me to take a break?"),
        route="LOW",
        session_id="student-12345678",
    )

    assert output is not None
    assert output.action is not None
    assert output.action.name == "create_reminder"
    assert output.action.confirmation_required is True


def test_unknown_gemini_tool_is_rejected(monkeypatch):
    class Provider:
        def generate_support(self, **_kwargs):
            return ProviderRawResponse(
                raw_text='{"reply":"Let me help.","action":{"name":"delete_user","title":"Delete"}}',
                model_name="test",
            )

    monkeypatch.setattr(
        "app.services.companion.get_ai_config",
        lambda: AIServiceConfig(provider="gemini", api_key="test-key"),
    )
    monkeypatch.setattr(
        "app.services.companion.get_ai_provider", lambda _cfg: Provider()
    )
    monkeypatch.setattr(
        "app.services.companion.rate_limiter.is_allowed", lambda *_a, **_k: True
    )
    monkeypatch.setattr(
        "app.services.companion.rate_limiter.record_call", lambda *_a: None
    )

    output = _gemini_agent_output(
        CompanionTurnRequest(message="Help me"),
        route="LOW",
        session_id="student-12345678",
    )

    assert output is None


def test_elevenlabs_is_called_only_with_voice_consent(monkeypatch):
    payload = CompanionTurnRequest(
        message="Can you help me settle down?",
        voice_response=True,
        consent_voice_processing=True,
    )
    monkeypatch.setattr(
        companion_router,
        "handle_companion_turn",
        lambda *_args, **_kwargs: {
            "reply": "Let's take a slow breath.",
            "route": "LOW",
            "visual_state": "speaking",
            "action": None,
            "support_contacts": [],
        },
    )
    monkeypatch.setattr(
        VoiceProviderConfig,
        "from_env",
        classmethod(
            lambda _cls: VoiceProviderConfig(
                provider="elevenlabs", api_key="secret-test", voice_id="voice12345"
            )
        ),
    )
    monkeypatch.setattr(companion_router, "get_ai_config", lambda: AIServiceConfig())
    monkeypatch.setattr(
        companion_router.rate_limiter, "is_allowed", lambda *_args, **_kwargs: True
    )
    monkeypatch.setattr(
        companion_router.rate_limiter, "record_call", lambda *_args: None
    )
    monkeypatch.setattr(
        companion_router.ElevenLabsTTSProvider,
        "synthesize",
        lambda _self, _text: b"fake-mp3",
    )

    result = asyncio.run(
        companion_router.companion_turn(payload, session_id="student-12345678")
    )

    assert result["voice_provider"] == "elevenlabs"
    assert result["voice_status"] == "Speaking with ElevenLabs."
    assert base64.b64decode(result["speech_audio_base64"]) == b"fake-mp3"


def test_elevenlabs_is_skipped_without_explicit_voice_consent(monkeypatch):
    payload = CompanionTurnRequest(message="Hello", voice_response=True)
    monkeypatch.setattr(
        companion_router,
        "handle_companion_turn",
        lambda *_args, **_kwargs: {
            "reply": "Hi there.",
            "route": "LOW",
            "visual_state": "speaking",
            "action": None,
            "support_contacts": [],
        },
    )
    monkeypatch.setattr(
        companion_router.ElevenLabsTTSProvider,
        "synthesize",
        lambda *_args: (_ for _ in ()).throw(AssertionError("should not synthesize")),
    )

    result = asyncio.run(
        companion_router.companion_turn(payload, session_id="student-12345678")
    )

    assert result["voice_provider"] == "browser"
    assert "Turn on ElevenLabs" in result["voice_status"]
    assert result["speech_audio_base64"] is None


def test_elevenlabs_failure_returns_a_plain_browser_voice_status(monkeypatch):
    payload = CompanionTurnRequest(
        message="Hello", voice_response=True, consent_voice_processing=True
    )
    monkeypatch.setattr(
        VoiceProviderConfig,
        "from_env",
        classmethod(
            lambda _cls: VoiceProviderConfig(
                provider="elevenlabs", api_key="secret-test", voice_id="voice12345"
            )
        ),
    )
    monkeypatch.setattr(companion_router, "get_ai_config", lambda: AIServiceConfig())
    monkeypatch.setattr(
        companion_router.rate_limiter, "is_allowed", lambda *_args, **_kwargs: True
    )
    monkeypatch.setattr(
        companion_router.ElevenLabsTTSProvider,
        "synthesize",
        lambda *_args: (_ for _ in ()).throw(RuntimeError("unavailable")),
    )

    result = asyncio.run(
        companion_router.companion_turn(payload, session_id="student-12345678")
    )

    assert result["voice_provider"] == "browser"
    assert result["voice_status"] == (
        "ElevenLabs could not speak this reply, so Calm is using your device voice."
    )


def test_elevenlabs_api_key_is_sent_in_header_and_audio_is_validated(monkeypatch):
    class Response:
        def __init__(self):
            self.headers = {"content-type": "audio/mpeg"}
            self.content = b"fake-audio"

        def raise_for_status(self):
            return None

    class Client:
        def __init__(self, **_kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def post(self, url, *, headers, json):
            assert url == "https://api.elevenlabs.io/v1/text-to-speech/voice12345"
            assert headers["xi-api-key"] == "secret-test"
            assert "secret-test" not in url
            assert json["text"] == "A gentle reply."
            return Response()

    monkeypatch.setattr("app.services.voice_providers.httpx.Client", Client)
    provider = ElevenLabsTTSProvider(
        VoiceProviderConfig(
            provider="elevenlabs", api_key="secret-test", voice_id="voice12345"
        )
    )

    assert provider.synthesize("A gentle reply.") == b"fake-audio"
