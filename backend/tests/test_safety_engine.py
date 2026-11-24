"""
Comprehensive Unit Tests for Safety Evaluator Engine (Issue #2)
================================================================
Covers:
- Input validation (valid/invalid mood, stress, sleep)
- Pure deterministic execution (no I/O, no LLM)
- Stable rule identifiers and decision trace
- Cumulative scoring interaction: mood<=2 (+2) + sleep<4 (+2) + stress>=4 (+2) = 6 -> HIGH
- Immediate crisis-override precedence
- Negation handling in text reflections
- Consecutive 3-entry low mood trend
- Non-diagnostic copy validation
- Complete AI service bypass on HIGH route
"""

import os
import sys
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.services.ai_guidance import generate_supportive_guidance
from app.services.safety_evaluator import (
    RULE_CONSECUTIVE_LOW_MOOD,
    RULE_CRISIS_OVERRIDE,
    RULE_DISTRESS_KEYWORD,
    RULE_MOOD_LOW,
    RULE_SLEEP_CRITICAL,
    RULE_STRESS_HIGH,
    RULE_STRESS_MODERATE,
    evaluate,
    evaluate_wellbeing_route,
    validate_checkin_inputs,
)


def test_input_validation():
    print("Testing Input Validation...")
    # Valid boundaries
    validate_checkin_inputs(1, 1, 0.0)
    validate_checkin_inputs(5, 5, 24.0)
    validate_checkin_inputs(3, 3, 7.5)

    # Invalid mood
    for bad_mood in [0, 6, -1, "3", True, None]:
        try:
            validate_checkin_inputs(bad_mood, 3, 7.0)
            assert False, f"Expected ValueError for mood={bad_mood}"
        except ValueError:
            pass

    # Invalid stress
    for bad_stress in [0, 6, -2, "5", False, None]:
        try:
            validate_checkin_inputs(3, bad_stress, 7.0)
            assert False, f"Expected ValueError for stress={bad_stress}"
        except ValueError:
            pass

    # Invalid sleep
    for bad_sleep in [-0.5, 24.5, 30.0, "8", None]:
        try:
            validate_checkin_inputs(3, 3, bad_sleep)
            assert False, f"Expected ValueError for sleep={bad_sleep}"
        except ValueError:
            pass

    print("✓ Input validation strictly rejects invalid values")


def test_agreed_score_interaction_issue_2():
    print("Testing Agreed Score Interaction from Issue #2...")
    # mood <= 2 (+2), sleep < 4 (+2), stress >= 4 (+2) produces score 6 and therefore High
    result = evaluate(
        {
            "mood": 2,  # +2 (RULE_MOOD_LOW)
            "stress": 4,  # +2 (RULE_STRESS_HIGH)
            "sleep_hours": 3.5,  # +2 (RULE_SLEEP_CRITICAL)
            "reflection": "",
        }
    )

    assert result.route == "HIGH", f"Expected HIGH, got {result.route}"
    assert result.level == "HIGH"
    assert result.score == 6, f"Expected score 6, got {result.score}"
    assert result.requires_human_escalation is True
    assert result.ai_eligible is False

    rule_ids = [r.rule_id for r in result.triggered_rules]
    assert RULE_MOOD_LOW in rule_ids
    assert RULE_STRESS_HIGH in rule_ids
    assert RULE_SLEEP_CRITICAL in rule_ids
    print("✓ mood<=2 (+2) + sleep<4 (+2) + stress>=4 (+2) = score 6 -> HIGH confirmed")


def test_cumulative_score_tiers():
    print("Testing Cumulative Score Thresholds...")
    # Tier 1: LOW (score <= 1)
    res_low = evaluate({"mood": 4, "stress": 2, "sleep_hours": 8.0})
    assert res_low.score == 0
    assert res_low.route == "LOW"
    assert res_low.ai_eligible is True

    res_low_1 = evaluate(
        {"mood": 4, "stress": 3, "sleep_hours": 8.0}
    )  # stress=3 gives +1
    assert res_low_1.score == 1
    assert res_low_1.route == "LOW"

    # Tier 2: MEDIUM (score 2 to 4)
    res_med_2 = evaluate(
        {"mood": 3, "stress": 4, "sleep_hours": 8.0}
    )  # stress=4 gives +2
    assert res_med_2.score == 2
    assert res_med_2.route == "MEDIUM"

    res_med_4 = evaluate(
        {"mood": 2, "stress": 4, "sleep_hours": 7.0}
    )  # mood=2 (+2) + stress=4 (+2) = 4
    assert res_med_4.score == 4
    assert res_med_4.route == "MEDIUM"

    # Tier 3: HIGH (score >= 5 without acute crisis)
    res_high_5 = evaluate(
        {"mood": 2, "stress": 4, "sleep_hours": 5.0}
    )  # mood=2 (+2) + stress=4 (+2) + sleep=5 (+1) = 5
    assert res_high_5.score == 5
    assert res_high_5.route == "HIGH"
    assert res_high_5.ai_eligible is False
    print("✓ Score tiers (<=1 LOW, 2–4 MEDIUM, >=5 HIGH) verified")


def test_acute_crisis_override_precedence():
    print("Testing Acute Crisis Override Precedence...")
    # Even if mood is 5 and stress is 1 and sleep is 8, a crisis phrase must immediately override to HIGH
    res = evaluate(
        {
            "mood": 5,
            "stress": 1,
            "sleep_hours": 8.0,
            "reflection": "I have been thinking about suicide lately.",
        }
    )
    assert res.route == "HIGH"
    assert res.crisis_flag is True
    assert res.ai_eligible is False
    assert res.requires_human_escalation is True
    assert any(r.rule_id == RULE_CRISIS_OVERRIDE for r in res.triggered_rules)

    # Single acute quantitative metrics trigger crisis override
    res_mood_1 = evaluate({"mood": 1, "stress": 2, "sleep_hours": 8.0})
    assert res_mood_1.route == "HIGH"
    assert res_mood_1.crisis_flag is True

    res_stress_5 = evaluate({"mood": 4, "stress": 5, "sleep_hours": 8.0})
    assert res_stress_5.route == "HIGH"
    assert res_stress_5.crisis_flag is True
    print("✓ Acute crisis overrides take absolute precedence")


def test_negation_handling():
    print("Testing Negation Handling in Reflections...")
    # Negated phrases should NOT trigger crisis overrides
    res_negated_1 = evaluate(
        {
            "mood": 3,
            "stress": 2,
            "sleep_hours": 7.0,
            "reflection": "I am not suicidal and I want to live.",
        }
    )
    assert res_negated_1.crisis_flag is False
    assert res_negated_1.route != "HIGH"

    res_negated_2 = evaluate(
        {
            "mood": 3,
            "stress": 2,
            "sleep_hours": 7.0,
            "reflection": "I don't want to die, just feeling stressed about tests.",
        }
    )
    assert res_negated_2.crisis_flag is False
    assert res_negated_2.route != "HIGH"

    res_negated_3 = evaluate(
        {
            "mood": 3,
            "stress": 2,
            "sleep_hours": 7.0,
            "reflection": "I would never hurt myself or self-harm.",
        }
    )
    assert res_negated_3.crisis_flag is False
    assert res_negated_3.route != "HIGH"

    res_negated_4 = evaluate(
        {
            "mood": 3,
            "stress": 2,
            "sleep_hours": 7.0,
            "reflection": "I feel terrible today, but I am not suicidal.",
        }
    )
    assert res_negated_4.crisis_flag is False
    assert res_negated_4.route != "HIGH"

    res_negated_5 = evaluate(
        {
            "mood": 3,
            "stress": 2,
            "sleep_hours": 7.0,
            "reflection": "I have no thoughts of suicide.",
        }
    )
    assert res_negated_5.crisis_flag is False
    assert res_negated_5.route != "HIGH"
    print("✓ Negations ('not suicidal', 'don't want to die') correctly filtered")


def test_negation_sentence_boundary_isolation():
    print("Testing Sentence Boundary Isolation in Negations...")
    # Negation in preceding sentence or clause must NEVER suppress a genuine crisis phrase in the next
    critical_statements = [
        "I am not hungry. I want to die.",
        "I am not happy. I want to kill myself.",
        "I am not doing well, but I want to end my life.",
        "I am not okay and I want to die.",
        "I don't know what to do anymore. I want to die.",
        "I am not tired; I cannot go on anymore.",
        "Not feeling great today.\nI want to end it all.",
        "I have no reason to be sad, but I have no reason to live.",
        "I'm not doing fine, I want to take my own life.",
    ]

    for stmt in critical_statements:
        res = evaluate(
            {
                "mood": 3,
                "stress": 2,
                "sleep_hours": 7.0,
                "reflection": stmt,
            }
        )
        assert res.crisis_flag is True, f"Failed to detect crisis in: '{stmt}'"
        assert res.route == "HIGH", f"Expected HIGH route for: '{stmt}'"
        assert res.requires_human_escalation is True
        assert res.ai_eligible is False
        assert any(r.rule_id == RULE_CRISIS_OVERRIDE for r in res.triggered_rules)
    print(
        "✓ Sentence boundaries (. ! ? ; \\n) and contrastive conjunctions strictly isolate negations"
    )


def test_consecutive_low_mood_trend():
    print("Testing 3 Consecutive Low-Mood Check-in Rule...")
    history_low = [
        {"mood": 2, "stress": 2, "sleep_hours": 7.0},
        {"mood": 1, "stress": 2, "sleep_hours": 7.0},
    ]
    # Current mood is 2, with past 2 <= 2 -> triggers consecutive low mood (+2)
    res_trend = evaluate(
        {"mood": 2, "stress": 2, "sleep_hours": 7.0}, history=history_low
    )

    assert any(
        r.rule_id == RULE_CONSECUTIVE_LOW_MOOD for r in res_trend.triggered_rules
    )
    assert res_trend.score == 4  # mood=2 (+2) + consecutive (+2) = 4
    assert res_trend.route == "MEDIUM"

    # If past check-ins were high, rule must not trigger
    history_mixed = [
        {"mood": 4, "stress": 2, "sleep_hours": 7.0},
        {"mood": 2, "stress": 2, "sleep_hours": 7.0},
    ]
    res_no_trend = evaluate(
        {"mood": 2, "stress": 2, "sleep_hours": 7.0}, history=history_mixed
    )
    assert not any(
        r.rule_id == RULE_CONSECUTIVE_LOW_MOOD for r in res_no_trend.triggered_rules
    )
    assert res_no_trend.score == 2
    print("✓ Consecutive 3-entry low mood trend accurately detected")


def test_non_diagnostic_copy_and_ai_bypass():
    print("Testing Non-Diagnostic Copy & AI Bypass...")
    res_high = evaluate({"mood": 1, "stress": 5, "sleep_hours": 3.0})
    # Must never describe High as a diagnosis
    diagnostic_words = ["diagnosed", "depression", "clinical", "pathology", "disorder"]
    for word in diagnostic_words:
        assert word not in res_high.status_label.lower()
        assert word not in res_high.status_summary.lower()

    # Must never describe Low as proof of safety
    res_low = evaluate({"mood": 5, "stress": 1, "sleep_hours": 8.0})
    guarantee_words = ["100% safe", "guaranteed fine", "cured", "proof"]
    for word in guarantee_words:
        assert word not in res_low.status_label.lower()
        assert word not in res_low.status_summary.lower()

    # AI bypass verification
    guidance = generate_supportive_guidance(
        route="HIGH", mood=1, stress=5, sleep_hours=3.0
    )
    assert guidance is None, "AI guidance MUST return None for HIGH route"
    print("✓ Copy is supportive and non-diagnostic; AI bypass fully verified")


def test_broader_distress_keyword():
    print("Testing Broader Distress Keywords...")
    res = evaluate(
        {
            "mood": 3,
            "stress": 2,
            "sleep_hours": 7.0,
            "reflection": "Feeling completely overwhelmed and burned out with exams.",
        }
    )
    assert any(r.rule_id == RULE_DISTRESS_KEYWORD for r in res.triggered_rules)
    assert res.crisis_flag is False
    assert res.route == "LOW"
    assert res.score == 1
    print("✓ Broader non-crisis distress phrases properly detected")


def test_convenience_alias_and_object_history():
    print("Testing Convenience Alias & Object History...")
    from app.models.schemas import CheckInRecord

    history = [
        CheckInRecord(
            id="rec-1",
            session_id="s1",
            timestamp="2026-11-20T10:00:00Z",
            mood=2,
            stress=2,
            sleep_hours=7.0,
            route="MEDIUM",
        ),
        CheckInRecord(
            id="rec-2",
            session_id="s1",
            timestamp="2026-11-21T10:00:00Z",
            mood=2,
            stress=3,
            sleep_hours=6.5,
            route="MEDIUM",
        ),
    ]

    res = evaluate_wellbeing_route(
        mood=2,
        stress=3,
        sleep_hours=7.0,
        reflection="Manageable day.",
        recent_history=history,
    )
    assert any(r.rule_id == RULE_CONSECUTIVE_LOW_MOOD for r in res.triggered_rules)
    assert any(r.rule_id == RULE_STRESS_MODERATE for r in res.triggered_rules)
    assert any(r.rule_id == RULE_MOOD_LOW for r in res.triggered_rules)
    assert res.score == 5  # mood=2 (+2) + stress=3 (+1) + consecutive (+2) = 5 -> HIGH
    assert res.route == "HIGH"
    print("✓ evaluate_wellbeing_route works with CheckInRecord objects in history")


# ============================================================================
# ADDITIONAL REGRESSION & INTEGRATION TESTS
# ============================================================================


@pytest.mark.parametrize(
    "sleep_hours",
    [
        float("nan"),
        float("inf"),
        float("-inf"),
    ],
)
def test_sleep_rejects_non_finite_values(sleep_hours):
    """Test A: Ensure sleep input rejects NaN, inf, and -inf explicitly."""
    with pytest.raises(ValueError):
        validate_checkin_inputs(
            mood=3,
            stress=2,
            sleep_hours=sleep_hours,
        )


def test_fastapi_endpoint_ai_bypass_on_high():
    """Test B: Test actual FastAPI checkin endpoint; verify AI guidance service is bypassed on HIGH."""
    client = TestClient(app)
    with patch("app.routers.checkin.generate_supportive_guidance") as mock_ai:
        response = client.post(
            "/api/checkin",
            json={
                "mood": 1,
                "stress": 5,
                "sleep_hours": 3.0,
                "reflection": "I want to end my life",
                "consent_ai_processing": True,
            },
            headers={"x-session-id": "test-session-bypass-high"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["safety"]["route"] == "HIGH"
        assert data["safety"]["ai_eligible"] is False
        assert data["guidance"] is None
        mock_ai.assert_not_called()
    print("✓ FastAPI endpoint guarantees zero AI calls on HIGH safety route")


def test_fastapi_endpoint_ai_called_on_eligible_route():
    """Verify AI guidance is called on LOW/MEDIUM when consented."""
    client = TestClient(app)
    with patch("app.routers.checkin.generate_supportive_guidance") as mock_ai:
        mock_ai.return_value = {
            "message": "Take it steady today.",
            "suggestion_chips": ["Rest"],
            "disclaimer": "This is supportive guidance, not medical advice.",
            "generated_by_ai": False,
            "fallback_used": True,
        }
        response = client.post(
            "/api/checkin",
            json={
                "mood": 4,
                "stress": 2,
                "sleep_hours": 8.0,
                "reflection": "Feeling steady.",
                "consent_ai_processing": True,
            },
            headers={"x-session-id": "test-session-eligible-ai"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["safety"]["route"] == "LOW"
        assert data["safety"]["ai_eligible"] is True
        assert data["guidance"] is not None
        mock_ai.assert_called_once()
    print("✓ FastAPI endpoint invokes guidance service on eligible non-high route")


def test_malformed_history_resilience():
    """Test C: Ensure history parsing is resilient against missing, invalid, or malformed entries."""
    # 1. Corrupted history ending with 2 valid low moods triggers consecutive low mood
    malformed_history = [
        None,
        {"mood": "invalid"},
        {"other": 123},
        {"mood": float("nan")},
        {"mood": 2},
        {"mood": 1},
    ]
    res = evaluate(
        {"mood": 2, "stress": 2, "sleep_hours": 7.0}, history=malformed_history
    )
    assert any(r.rule_id == RULE_CONSECUTIVE_LOW_MOOD for r in res.triggered_rules)

    # 2. Corrupted history in recent positions does NOT crash and does NOT trigger rule
    corrupted_history = [None, {"mood": "bad"}]
    res2 = evaluate(
        {"mood": 2, "stress": 2, "sleep_hours": 7.0}, history=corrupted_history
    )
    assert not any(r.rule_id == RULE_CONSECUTIVE_LOW_MOOD for r in res2.triggered_rules)

    # 3. Missing mood in history
    missing_mood_history = [{"stress": 4}, {"sleep_hours": 5.0}]
    res3 = evaluate(
        {"mood": 2, "stress": 2, "sleep_hours": 7.0}, history=missing_mood_history
    )
    assert not any(r.rule_id == RULE_CONSECUTIVE_LOW_MOOD for r in res3.triggered_rules)

    # 4. Invalid mood types (bool, nan, out of range)
    invalid_type_history = [{"mood": True}, {"mood": float("nan")}, {"mood": 6}]
    res4 = evaluate(
        {"mood": 2, "stress": 2, "sleep_hours": 7.0}, history=invalid_type_history
    )
    assert not any(r.rule_id == RULE_CONSECUTIVE_LOW_MOOD for r in res4.triggered_rules)
    print("✓ History evaluation handles malformed, NaN, and invalid entries gracefully")


if __name__ == "__main__":
    test_input_validation()
    test_agreed_score_interaction_issue_2()
    test_cumulative_score_tiers()
    test_acute_crisis_override_precedence()
    test_negation_handling()
    test_negation_sentence_boundary_isolation()
    test_consecutive_low_mood_trend()
    test_non_diagnostic_copy_and_ai_bypass()
    test_broader_distress_keyword()
    test_convenience_alias_and_object_history()
    for s in [float("nan"), float("inf"), float("-inf")]:
        test_sleep_rejects_non_finite_values(s)
    test_fastapi_endpoint_ai_bypass_on_high()
    test_fastapi_endpoint_ai_called_on_eligible_route()
    test_malformed_history_resilience()
    print("\nALL UNIT TESTS FOR ISSUE #2 PASSED SUCCESSFULLY!")
