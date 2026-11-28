"""
Comprehensive Regression & Acceptance Tests for Calm — Agentic Voice Companion
Covers:
- All 15 acceptance criteria (greeting, contextual follow-ups, multi-turn memory,
  breathing, check-in, reminder confirmation, insights, study plan, support, crisis bypass)
- Unauthorized/malformed tool call rejection
- Execution failure honesty (never claims success on failure)
- Gemini tool-calling header transport & safety output validation
- Strict session ownership, cross-session isolation, and zero transcript persistence
"""

import sqlite3
from uuid import uuid4

import httpx
from fastapi.testclient import TestClient

from app.core.config import AIServiceConfig
from app.main import app
from app.services.ai_providers.base import (
    BaseAIProvider,
    CompanionProviderTurn,
    ProviderRawResponse,
)
from app.services.companion_agent import process_companion_turn
from app.services.companion_memory import companion_memory
from app.services.companion_tools import execute_validated_tool
from app.services.storage import storage

client = TestClient(app)


def _headers(prefix: str = "calm-test") -> tuple[str, dict[str, str]]:
    sid = f"{prefix}-{uuid4().hex[:12]}"
    return sid, {"X-Session-ID": sid}


def test_companion_routes_require_valid_session_header():
    for bad_headers in ({}, {"X-Session-ID": "short"}, {"X-Session-ID": "anonymous"}):
        assert (
            client.post("/api/companion/start", headers=bad_headers).status_code == 422
        )
        assert (
            client.post(
                "/api/companion/turn",
                json={"message": "Hi"},
                headers=bad_headers,
            ).status_code
            == 422
        )
        assert (
            client.post(
                "/api/companion/confirm",
                json={
                    "conversation_id": "conv-123456",
                    "action_id": "act-123456",
                    "approved": True,
                },
                headers=bad_headers,
            ).status_code
            == 422
        )
        assert (
            client.get("/api/companion/reminders", headers=bad_headers).status_code
            == 422
        )


def test_multi_turn_example_conversation_and_study_plan_persistence():
    _sid, headers = _headers("study")
    try:
        start = client.post("/api/companion/start", headers=headers)
        assert start.status_code == 200
        start_data = start.json()
        cid = start_data["conversation_id"]
        assert "calm" in start_data["greeting"].lower()
        assert "ai wellbeing companion" in start_data["disclaimer"].lower()

        # Turn 1: Student says "Hi, how are you?"
        t1 = client.post(
            "/api/companion/turn",
            headers=headers,
            json={
                "conversation_id": cid,
                "message": "Hi, how are you?",
                "consent_ai_processing": False,
                "input_mode": "voice",
            },
        ).json()
        assert "feeling today" in t1["reply"].lower()

        # Turn 2: Student says they're stressed about exams
        t2 = client.post(
            "/api/companion/turn",
            headers=headers,
            json={
                "conversation_id": cid,
                "message": "I'm really stressed about my exams.",
                "consent_ai_processing": False,
                "input_mode": "voice",
            },
        ).json()
        assert "study" in t2["reply"].lower() or "results" in t2["reply"].lower()

        # Turn 3: Student has too much to study -> offers study plan
        t3 = client.post(
            "/api/companion/turn",
            headers=headers,
            json={
                "conversation_id": cid,
                "message": "I have too much to study.",
                "consent_ai_processing": False,
                "input_mode": "voice",
            },
        ).json()
        assert "study plan" in t3["reply"].lower()

        # Turn 4: Student says "Yes, please" -> asks subjects & first exam
        t4 = client.post(
            "/api/companion/turn",
            headers=headers,
            json={
                "conversation_id": cid,
                "message": "Yes, please.",
                "consent_ai_processing": False,
                "input_mode": "voice",
            },
        ).json()
        assert "subjects" in t4["reply"].lower()
        assert "exam" in t4["reply"].lower()

        # Turn 5: Student provides subjects & exam timeline -> generates study plan + asks save confirmation
        t5 = client.post(
            "/api/companion/turn",
            headers=headers,
            json={
                "conversation_id": cid,
                "message": "3 subjects: Calculus, Biology, and History, first exam in 4 days",
                "consent_ai_processing": False,
                "input_mode": "voice",
            },
        ).json()
        assert any(tc["tool_name"] == "generate_study_plan" for tc in t5["tool_calls"])
        plan_cards = [c for c in t5["action_cards"] if c["card_type"] == "study_plan"]
        assert len(plan_cards) == 1
        blocks = plan_cards[0]["data"]["blocks"]
        assert len(blocks) >= 3
        assert any("Calculus" in b["title"] for b in blocks)
        assert t5["pending_confirmation"] is not None
        assert t5["pending_confirmation"]["tool_name"] == "save_study_plan"

        # Confirm saving study plan -> real tasks saved to planner
        confirm = client.post(
            "/api/companion/confirm",
            headers=headers,
            json={
                "conversation_id": cid,
                "action_id": t5["pending_confirmation"]["action_id"],
                "approved": True,
            },
        ).json()
        assert confirm["tool_calls"][0]["status"] == "executed"
        tasks = client.get("/api/planner/tasks", headers=headers).json()
        assert any("Calculus" in t["title"] for t in tasks)
    finally:
        client.delete("/api/settings/data", headers=headers)


def test_breathing_insights_support_and_urgent_help_tools():
    _sid, headers = _headers("tools")
    try:
        cid = client.post("/api/companion/start", headers=headers).json()[
            "conversation_id"
        ]

        # 1. Guided breathing
        breath = client.post(
            "/api/companion/turn",
            headers=headers,
            json={
                "conversation_id": cid,
                "message": "Help me relax, I want to breathe",
            },
        ).json()
        assert breath["blob_state"] == "breathing"
        assert breath["action_cards"][0]["card_type"] == "breathing"

        # 2. Check-in flow -> confirmation -> insights retrieval
        checkin_req = client.post(
            "/api/companion/turn",
            headers=headers,
            json={
                "conversation_id": cid,
                "message": "Start check-in with mood 4, stress 2, sleep 7.5 hours",
            },
        ).json()
        assert checkin_req["pending_confirmation"]["tool_name"] == "commit_checkin"

        saved_ci = client.post(
            "/api/companion/confirm",
            headers=headers,
            json={
                "conversation_id": cid,
                "action_id": checkin_req["pending_confirmation"]["action_id"],
                "approved": True,
            },
        ).json()
        assert saved_ci["action_cards"][0]["card_type"] == "checkin_saved"

        insights = client.post(
            "/api/companion/turn",
            headers=headers,
            json={"conversation_id": cid, "message": "How have I been feeling lately?"},
        ).json()
        assert insights["tool_calls"][0]["tool_name"] == "get_wellbeing_insights"
        assert "4.0/5" in insights["reply"]

        # 3. Support resources
        support = client.post(
            "/api/companion/turn",
            headers=headers,
            json={"conversation_id": cid, "message": "I want to talk to someone"},
        ).json()
        assert support["blob_state"] == "support"
        assert len(support["support_contacts"]) >= 1

        # 4. Urgent help
        urgent = client.post(
            "/api/companion/turn",
            headers=headers,
            json={"conversation_id": cid, "message": "I need urgent help"},
        ).json()
        assert urgent["blob_state"] == "support"
        assert any(c["id"] == "tele-manas" for c in urgent["support_contacts"])
    finally:
        client.delete("/api/settings/data", headers=headers)


def test_reminder_requires_confirmation_and_supports_cancel():
    _sid, headers = _headers("rem")
    try:
        cid = client.post("/api/companion/start", headers=headers).json()[
            "conversation_id"
        ]

        # Request reminder -> must NOT persist before confirmation
        r1 = client.post(
            "/api/companion/turn",
            headers=headers,
            json={
                "conversation_id": cid,
                "message": "Remind me to take a break in 20 minutes",
            },
        ).json()
        assert r1["pending_confirmation"] is not None
        assert r1["pending_confirmation"]["tool_name"] == "create_reminder"
        assert client.get("/api/companion/reminders", headers=headers).json() == []

        # Decline first reminder -> stays empty
        declined = client.post(
            "/api/companion/confirm",
            headers=headers,
            json={
                "conversation_id": cid,
                "action_id": r1["pending_confirmation"]["action_id"],
                "approved": False,
            },
        ).json()
        assert declined["tool_calls"][0]["status"] == "rejected"
        assert client.get("/api/companion/reminders", headers=headers).json() == []

        # Request again and approve verbally with "Yes, please"
        r2 = client.post(
            "/api/companion/turn",
            headers=headers,
            json={
                "conversation_id": cid,
                "message": "Remind me to drink water in 15 minutes",
            },
        ).json()
        assert r2["pending_confirmation"] is not None

        approved = client.post(
            "/api/companion/turn",
            headers=headers,
            json={"conversation_id": cid, "message": "Yes, please"},
        ).json()
        assert approved["tool_calls"][0]["status"] == "executed"
        reminders = client.get("/api/companion/reminders", headers=headers).json()
        assert len(reminders) == 1
        assert reminders[0]["delay_minutes"] == 15
    finally:
        client.delete("/api/settings/data", headers=headers)


def test_crisis_statement_bypasses_ai_provider_completely():
    class SpyProvider(BaseAIProvider):
        def __init__(self):
            self.called = 0

        def generate_support(
            self, system_instruction, user_prompt, timeout_seconds=5.0, max_tokens=350
        ):
            self.called += 1
            return ProviderRawResponse(raw_text="{}", model_name="spy")

        def generate_companion_turn(
            self,
            system_instruction,
            contents,
            tool_declarations,
            timeout_seconds=8.0,
            max_tokens=350,
        ):
            self.called += 1
            return CompanionProviderTurn(
                reply_text="Should never be called", model_name="spy"
            )

    sid, headers = _headers("crisis")
    spy = SpyProvider()
    try:
        res = process_companion_turn(
            session_id=sid,
            message="I want to end my life right now",
            consent_ai_processing=True,
            provider=spy,
            config=AIServiceConfig(provider="mock", enabled=True),
        )
        assert spy.called == 0, "Crisis message must NEVER invoke AI provider!"
        assert res.safety.route == "HIGH"
        assert res.safety.crisis_flag is True
        assert res.blob_state == "support"
        assert res.generated_by_ai is False
        assert any(c.id == "tele-manas" for c in res.support_contacts)
    finally:
        client.delete("/api/settings/data", headers=headers)


def test_unauthorized_and_malformed_tool_calls_rejected_and_failures_honest(
    monkeypatch,
):
    sid, headers = _headers("toolval")
    try:
        # 1. Unknown / unauthorized tool rejected
        unknown = execute_validated_tool("delete_database", {"table": "checkins"}, sid)
        assert unknown.record.status == "rejected"

        # 2. Malformed parameters rejected
        bad_args = execute_validated_tool(
            "create_reminder", {"title": " ", "delay_minutes": 999}, sid
        )
        assert bad_args.record.status == "rejected"

        bad_checkin = execute_validated_tool(
            "commit_checkin", {"mood": 99, "stress": -1, "sleep_hours": 50}, sid
        )
        assert bad_checkin.record.status == "rejected"

        # 3. Direct persistent call without confirmation is gated
        gated = execute_validated_tool(
            "create_reminder",
            {"title": "Take a stretch break", "delay_minutes": 20, "category": "break"},
            sid,
            confirmed_by_user=False,
        )
        assert gated.record.status == "awaiting_confirmation"
        assert gated.pending_confirmation is not None

        # 4. Execution failure returns failed and never claims success
        def boom(*args, **kwargs):
            raise RuntimeError("Simulated DB failure")

        monkeypatch.setattr(storage, "add_reminder", boom)
        failed = execute_validated_tool(
            "create_reminder",
            {"title": "Take a stretch break", "delay_minutes": 20, "category": "break"},
            sid,
            confirmed_by_user=True,
        )
        assert failed.record.status == "failed"
        assert failed.blob_state_hint == "error"
    finally:
        client.delete("/api/settings/data", headers=headers)


def test_gemini_companion_tool_calling_and_safety_filter(monkeypatch):
    sid, headers = _headers("gem")
    captured = []
    responses = [
        # Round 1: Gemini chooses start_breathing tool
        {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "functionCall": {
                                    "name": "start_breathing",
                                    "args": {"pattern": "box", "duration_minutes": 2},
                                }
                            }
                        ]
                    }
                }
            ]
        },
        # Round 2: Gemini generates final warm spoken reply after tool response
        {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "text": "Let's take a gentle box breath together. Inhale for four, hold for four, and soften your shoulders."
                            }
                        ]
                    }
                }
            ]
        },
    ]

    def mock_post(self_client, url, *args, **kwargs):
        captured.append((url, kwargs.get("headers", {}), kwargs.get("json", {})))
        payload = responses.pop(0)
        return httpx.Response(200, json=payload, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.Client, "post", mock_post)

    try:
        cfg = AIServiceConfig(
            provider="gemini",
            model="gemini-1.5-flash",
            api_key="test-gemini-secret",
            enabled=True,
        )
        res = process_companion_turn(
            session_id=sid,
            message="Can you guide me through box breathing?",
            consent_ai_processing=True,
            config=cfg,
        )
        assert res.generated_by_ai is True
        assert res.blob_state == "breathing"
        assert res.tool_calls[0].tool_name == "start_breathing"
        assert len(captured) == 2
        assert captured[0][1].get("x-goog-api-key") == "test-gemini-secret"
        assert "test-gemini-secret" not in captured[0][0]
    finally:
        client.delete("/api/settings/data", headers=headers)


def test_cross_session_isolation_and_zero_transcript_persistence():
    sid_a, headers_a = _headers("iso-a")
    _sid_b, headers_b = _headers("iso-b")
    secret_phrase = "UNIQUE_VOICE_TRANSCRIPT_SHOULD_NEVER_BE_IN_SQLITE"
    try:
        cid_a = client.post("/api/companion/start", headers=headers_a).json()[
            "conversation_id"
        ]
        turn_a = client.post(
            "/api/companion/turn",
            headers=headers_a,
            json={
                "conversation_id": cid_a,
                "message": f"Remind me to rest: {secret_phrase}",
            },
        ).json()
        action_id = turn_a["pending_confirmation"]["action_id"]

        # Session B cannot use Session A's conversation_id or confirm its pending action
        cross_turn = client.post(
            "/api/companion/turn",
            headers=headers_b,
            json={"conversation_id": cid_a, "message": "Hello"},
        )
        assert cross_turn.status_code == 404

        cross_confirm = client.post(
            "/api/companion/confirm",
            headers=headers_b,
            json={"conversation_id": cid_a, "action_id": action_id, "approved": True},
        )
        assert cross_confirm.status_code == 404

        # End conversation clears volatile memory
        end_res = client.delete(f"/api/companion/session/{cid_a}", headers=headers_a)
        assert end_res.status_code == 200
        assert companion_memory.get(sid_a, cid_a) is None

        # Verify SQLite has ZERO stored conversation transcripts
        conn: sqlite3.Connection = storage._get_connection()
        for table in (
            "checkins",
            "tasks",
            "reminders",
            "companion_preferences",
            "user_settings",
        ):
            rows = conn.execute(
                f"SELECT * FROM {table} WHERE session_id = ?;", (sid_a,)
            ).fetchall()
            for r in rows:
                assert secret_phrase not in str(dict(r))
    finally:
        client.delete("/api/settings/data", headers=headers_a)
        client.delete("/api/settings/data", headers=headers_b)


def test_reminder_lifecycle_complete_snooze_and_isolation():
    _sid_a, headers_a = _headers("rem-life-a")
    _sid_b, headers_b = _headers("rem-life-b")
    try:
        created = client.post(
            "/api/companion/reminders",
            headers=headers_a,
            json={
                "title": "Stand and stretch",
                "category": "break",
                "delay_minutes": 1,
            },
        )
        assert created.status_code == 200
        rem = created.json()
        rid = rem["id"]
        assert rem["delay_minutes"] == 1
        assert rem["active"] is True

        # Session B cannot snooze or complete Session A's reminder
        assert (
            client.patch(
                f"/api/companion/reminders/{rid}/snooze",
                headers=headers_b,
                json={"minutes": 10},
            ).status_code
            == 404
        )
        assert (
            client.patch(
                f"/api/companion/reminders/{rid}/complete",
                headers=headers_b,
            ).status_code
            == 404
        )

        # Snooze updates delay and remind_at
        snoozed = client.patch(
            f"/api/companion/reminders/{rid}/snooze",
            headers=headers_a,
            json={"minutes": 10},
        )
        assert snoozed.status_code == 200
        assert snoozed.json()["delay_minutes"] == 10

        # Complete removes from active reminders list
        completed = client.patch(
            f"/api/companion/reminders/{rid}/complete",
            headers=headers_a,
        )
        assert completed.status_code == 200
        assert client.get("/api/companion/reminders", headers=headers_a).json() == []
    finally:
        client.delete("/api/settings/data", headers=headers_a)
        client.delete("/api/settings/data", headers=headers_b)


def test_security_audit_consent_rate_limit_and_secret_containment(monkeypatch, caplog):
    import logging

    from app.services.ai_guidance import rate_limiter
    from app.services.ai_providers.gemini_provider import GeminiAIProvider

    rate_limiter.reset()
    sid, headers = _headers("audit")
    secret_key = "super-secret-gemini-audit-key"
    private_msg = "CANARY_PRIVATE_COMPANION_MSG_98765"

    try:
        # 1. StrictBool rejects non-bool consent_ai_processing without echoing private message
        bad_consent = client.post(
            "/api/companion/turn",
            headers=headers,
            json={"message": private_msg, "consent_ai_processing": "true"},
        )
        assert bad_consent.status_code == 422
        assert private_msg not in bad_consent.text

        # 2. Gemini 401 failure falls back honestly without leaking key or user message
        def mock_post_401(self_client, url, *args, **kwargs):
            return httpx.Response(
                401,
                json={"error": {"message": f"Bad key {secret_key}"}},
                request=httpx.Request("POST", url),
            )

        monkeypatch.setattr(httpx.Client, "post", mock_post_401)
        cfg = AIServiceConfig(
            provider="gemini",
            model="gemini-1.5-flash",
            api_key=secret_key,
            rate_limit_per_minute=1,
            enabled=True,
        )
        provider = GeminiAIProvider(api_key=secret_key, model="gemini-1.5-flash")

        with caplog.at_level(logging.WARNING):
            res_fail = process_companion_turn(
                session_id=sid,
                message=f"Hi, {private_msg}",
                consent_ai_processing=True,
                provider=provider,
                config=cfg,
            )
        assert res_fail.generated_by_ai is False
        assert res_fail.fallback_used is True
        assert secret_key not in caplog.text
        assert private_msg not in caplog.text

        # 3. Rate-limit exceeded reports fallback_used=True and makes zero provider calls
        class CountingProvider(BaseAIProvider):
            called = 0

            def generate_support(self, *args, **kwargs):
                self.called += 1
                return ProviderRawResponse(raw_text="{}", model_name="cnt")

            def generate_companion_turn(self, *args, **kwargs):
                self.called += 1
                return CompanionProviderTurn(reply_text="Hi there", model_name="cnt")

        rate_limiter.reset()
        cnt = CountingProvider()
        cfg_rl = AIServiceConfig(
            provider="gemini",
            api_key=secret_key,
            rate_limit_per_minute=1,
            enabled=True,
        )
        r1 = process_companion_turn(
            session_id=sid,
            message="Hi there",
            consent_ai_processing=True,
            provider=cnt,
            config=cfg_rl,
        )
        assert r1.generated_by_ai is True
        r2 = process_companion_turn(
            session_id=sid,
            message="How are you?",
            consent_ai_processing=True,
            provider=cnt,
            config=cfg_rl,
        )
        assert r2.generated_by_ai is False
        assert r2.fallback_used is True
        assert r2.ai_provider == "rate-limited-fallback"
        assert cnt.called == 1
    finally:
        rate_limiter.reset()
        client.delete("/api/settings/data", headers=headers)
