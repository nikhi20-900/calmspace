"""
Calmspace Safety & Backend Tests
Verifies core safety rules, privacy retention, and routing.
"""

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.models.schemas import CheckInRequest
from app.services.ai_guidance import generate_supportive_guidance
from app.services.safety_evaluator import evaluate_wellbeing_route
from app.services.storage import storage
from app.services.support_directory import get_support_directory


def test_safety_rules():
    print("Testing Safety Rules Engine...")

    # 1. Low Route
    low_res = evaluate_wellbeing_route(
        mood=4, stress=2, sleep_hours=8.0, reflection="Had a calm study session."
    )
    assert low_res.route == "LOW", f"Expected LOW, got {low_res.route}"
    assert low_res.ai_eligible is True
    assert low_res.requires_human_escalation is False
    print("✓ Low route verified")

    # 2. Medium Route
    med_res = evaluate_wellbeing_route(
        mood=2, stress=3, sleep_hours=5.5, reflection="Stressed about physics midterm."
    )
    assert med_res.route == "MEDIUM", f"Expected MEDIUM, got {med_res.route}"
    assert med_res.ai_eligible is True
    assert med_res.requires_human_escalation is False
    print("✓ Medium route verified")

    # 3. High Route — Critical mood
    high_mood = evaluate_wellbeing_route(mood=1, stress=4, sleep_hours=6.0)
    assert high_mood.route == "HIGH", f"Expected HIGH, got {high_mood.route}"
    assert high_mood.ai_eligible is False, "High route must strictly bypass AI"
    assert high_mood.requires_human_escalation is True
    print("✓ High route (mood 1) verified")

    # 4. High Route — Critical stress
    high_stress = evaluate_wellbeing_route(mood=3, stress=5, sleep_hours=7.0)
    assert high_stress.route == "HIGH"
    assert high_stress.ai_eligible is False
    assert high_stress.requires_human_escalation is True
    print("✓ High route (stress 5) verified")

    # 5. High Route — Crisis keyword in reflection
    high_keyword = evaluate_wellbeing_route(
        mood=3,
        stress=3,
        sleep_hours=7.0,
        reflection="I feel completely hopeless and want to end it all",
    )
    assert high_keyword.route == "HIGH", "Must detect crisis indicator"
    assert high_keyword.ai_eligible is False
    assert high_keyword.requires_human_escalation is True
    print("✓ High route (crisis keyword detection) verified")


def test_ai_guidance_bypass():
    print("Testing AI Guidance Bypass on High Route...")
    guidance = generate_supportive_guidance(
        route="HIGH", mood=1, stress=5, sleep_hours=4.0
    )
    assert guidance is None, "AI guidance must return None for HIGH route"
    print("✓ AI bypass verified for HIGH route")


def test_privacy_storage():
    print("Testing Privacy & Data Retention...")
    session_id = "test-session-privacy"

    # Store checkin
    rec = storage.add_checkin(
        session_id, mood=4, stress=2, sleep_hours=7.5, route="LOW"
    )
    assert not hasattr(rec, "reflection"), (
        "Reflection must never exist in CheckInRecord"
    )

    # Verify records
    history = storage.get_checkins(session_id)
    assert len(history) == 1
    assert history[0].mood == 4

    # Purge all data
    storage.delete_all_data(session_id)
    assert len(storage.get_checkins(session_id)) == 0
    print("✓ Privacy data retention and full purge verified")


def test_high_risk_data_retention_and_safe_exit_purge():
    """
    Issue #4 Data-Retention & Safe-Exit Verification:
    1. High-risk check-in records must never store free-text reflection.
    2. High-risk check-in must return zero AI guidance (ai_eligible=False).
    3. Urgent human support contacts must be returned with verified national sources.
    4. Safe exit data deletion must completely and permanently purge all stored high-risk entries.
    """
    print("Testing High-Risk Escalation Data Retention & Safe-Exit Purge...")
    session_id = "test-session-high-risk-safe-exit"

    # Clean initial state
    storage.delete_all_data(session_id)

    # 1. High-risk evaluation
    eval_res = evaluate_wellbeing_route(
        mood=1,
        stress=5,
        sleep_hours=3.0,
        reflection="I want to end my life right now",
    )
    assert eval_res.route == "HIGH"
    assert eval_res.ai_eligible is False
    assert eval_res.requires_human_escalation is True

    # 2. Add to storage
    record = storage.add_checkin(
        session_id=session_id,
        mood=1,
        stress=5,
        sleep_hours=3.0,
        route=eval_res.route,
    )
    # Verify reflection text is never stored in persistence layer
    assert not hasattr(record, "reflection"), (
        "Reflection must never exist in CheckInRecord"
    )
    assert record.route == "HIGH"

    # 3. AI bypass verification
    guidance = generate_supportive_guidance(
        route=eval_res.route, mood=1, stress=5, sleep_hours=3.0
    )
    assert guidance is None, "AI guidance must strictly return None on HIGH route"

    # 4. Verified urgent contacts contract
    from app.services.support_directory import get_urgent_contacts

    urgent = get_urgent_contacts()
    tele_manas = next(c for c in urgent if c.id == "tele-manas")
    assert tele_manas.contact_number == "14416"
    assert tele_manas.official_source_url == "https://telemanas.mohfw.gov.in"
    assert tele_manas.is_demo_placeholder is False

    campus = next(c for c in urgent if c.id == "campus-counselling")
    assert campus.is_demo_placeholder is True
    assert campus.email is None, (
        "Campus demo placeholder must not provide an active email"
    )

    # 5. Verify records stored
    stored = storage.get_checkins(session_id)
    assert len(stored) == 1
    assert stored[0].route == "HIGH"

    # 6. Execute safe exit data purge
    storage.delete_all_data(session_id)
    assert len(storage.get_checkins(session_id)) == 0, (
        "Safe exit data purge must delete all records"
    )
    print("✓ High-risk data retention and safe-exit purge verified")


def test_support_resources():
    print("Testing Verified Support Directory & High-Risk Escalation Contracts...")
    from app.services.support_directory import (
        disable_resource,
        enable_resource,
        reset_support_directory,
    )

    client = TestClient(app)
    resources = get_support_directory()
    assert len(resources) >= 5

    # 1. Tele-MANAS verified contract
    tele_manas = next(r for r in resources if r.id == "tele-manas")
    assert tele_manas.official_source_url == "https://telemanas.mohfw.gov.in"
    assert tele_manas.contact_number == "14416"
    assert tele_manas.is_urgent is True
    assert tele_manas.is_demo_placeholder is False
    assert tele_manas.is_active is True
    assert "mohfw" in tele_manas.verification_source.lower()

    # 2. National Emergency 112 verified contract
    emergency = next(r for r in resources if r.id == "national-emergency")
    assert emergency.official_source_url == "https://erss.in"
    assert emergency.contact_number == "112"
    assert emergency.is_urgent is True
    assert emergency.is_demo_placeholder is False
    assert emergency.is_active is True

    # 3. iCALL (TISS) official hours and source alignment
    icall = next(r for r in resources if r.id == "icall-tiss")
    assert icall.contact_number == "02225521111"
    assert icall.official_source_url == "https://icallhelpline.org"
    assert "08:00 – 21:00" in icall.hours
    assert icall.is_demo_placeholder is False
    assert icall.is_active is True

    # 4. Campus Demo Placeholder contract (Strictly never presented as verified)
    campus = next(r for r in resources if r.id == "campus-counselling")
    assert campus.is_demo_placeholder is True
    assert campus.official_source_url is None, (
        "Campus demo placeholder must not claim an official verified URL"
    )
    assert "demo" in campus.badge_label.lower()
    assert campus.placeholder_note is not None
    assert campus.email is None, (
        "Campus demo placeholder must not provide an active email"
    )
    assert "demo" in campus.verification_source.lower()

    # 5. Provenance guarantees across all resources
    for r in resources:
        assert r.verification_source, f"Missing verification source on {r.name}"
        assert r.last_verified_date, f"Missing last verified date on {r.name}"
        assert r.contact_number, f"Missing contact number on {r.name}"
        assert r.is_active is True, f"Resource {r.name} must be active by default"
        if not r.is_demo_placeholder:
            assert r.official_source_url and r.official_source_url.startswith(
                "https://"
            ), f"Verified contact {r.name} must have a secure official source URL"

    # 6. Active/disabled filtering via API
    try:
        # Initially, all 5 resources returned via HTTP
        api_res = client.get("/api/support/resources")
        assert api_res.status_code == 200
        initial_ids = [c["id"] for c in api_res.json()]
        assert "vandrevala-foundation" in initial_ids

        # Disable a resource without changing frontend code
        assert disable_resource("vandrevala-foundation") is True

        # API must now omit the disabled resource
        filtered_res = client.get("/api/support/resources")
        assert filtered_res.status_code == 200
        filtered_ids = [c["id"] for c in filtered_res.json()]
        assert "vandrevala-foundation" not in filtered_ids
        assert len(filtered_ids) == len(initial_ids) - 1

        # Re-enable resource
        assert enable_resource("vandrevala-foundation") is True
        restored_res = client.get("/api/support/resources")
        assert "vandrevala-foundation" in [c["id"] for c in restored_res.json()]
    finally:
        reset_support_directory()

    print("✓ Support directory verification and active/disabled filtering verified")


def test_reflection_length_and_consent_contracts():
    client = TestClient(app)

    # 1. 2000 characters is valid in CheckInRequest schema
    valid_text = "a" * 2000
    req = CheckInRequest(
        mood=3,
        stress=2,
        sleep_hours=7.0,
        reflection=valid_text,
        consent_ai_processing=False,
    )
    assert req.reflection is not None
    assert len(req.reflection) == 2000

    # 2. 2001 characters raises ValidationError
    with pytest.raises(ValidationError):
        CheckInRequest(
            mood=3,
            stress=2,
            sleep_hours=7.0,
            reflection="a" * 2001,
            consent_ai_processing=False,
        )

    # 3. Unconsented reflection still triggers local deterministic safety evaluation
    # (escalating to HIGH route) while strictly bypassing AI guidance
    crisis_text = "I feel hopeless and want to kill myself"
    resp = client.post(
        "/api/checkin",
        headers={"X-Session-ID": "test-session-unconsented-safety"},
        json={
            "mood": 3,
            "stress": 3,
            "sleep_hours": 7.0,
            "reflection": crisis_text,
            "consent_ai_processing": False,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["safety"]["route"] == "HIGH"
    assert data["safety"]["ai_eligible"] is False
    assert data["guidance"] is None

    # 4. Unconsented non-crisis reflection receives fallback guidance without AI generation
    resp_benign = client.post(
        "/api/checkin",
        headers={"X-Session-ID": "test-session-unconsented-benign"},
        json={
            "mood": 4,
            "stress": 2,
            "sleep_hours": 8.0,
            "reflection": "Doing okay today.",
            "consent_ai_processing": False,
        },
    )
    assert resp_benign.status_code == 200
    data_benign = resp_benign.json()
    assert data_benign["safety"]["route"] == "LOW"
    assert data_benign["safety"]["ai_eligible"] is True
    assert data_benign["guidance"] is not None
    assert data_benign["guidance"]["generated_by_ai"] is False
    assert data_benign["guidance"]["fallback_used"] is True


def test_insights_endpoint_contracts():
    """
    Issue #8 Insights API Verification:
    1. Fresh session receives clean empty state structure with check_in_count = 0.
    2. Check-ins are strictly scoped to the requesting session ID (no cross-session leaks).
    3. Trends and averages correctly calculated without clinical diagnostic labels.
    4. Purging session data instantly clears insights.
    """
    client = TestClient(app)
    session_a = "test-session-insights-a"
    session_b = "test-session-insights-b"

    # 1. Fresh session empty state
    res_empty = client.get("/api/insights?days=7", headers={"X-Session-ID": session_a})
    assert res_empty.status_code == 200
    empty_data = res_empty.json()
    assert empty_data["check_in_count"] == 0
    assert empty_data["average_mood"] == 0.0
    assert empty_data["mood_trend"] == []
    assert empty_data["sleep_trend"] == []
    assert empty_data["stress_trend"] == []
    assert "No check-ins yet" in empty_data["plain_summary"]

    # 2. Add check-ins to session A
    storage.add_checkin(session_a, mood=4, stress=2, sleep_hours=8.0, route="LOW")
    storage.add_checkin(session_a, mood=3, stress=3, sleep_hours=6.5, route="MEDIUM")

    res_a = client.get("/api/insights?days=7", headers={"X-Session-ID": session_a})
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert data_a["check_in_count"] == 2
    assert data_a["average_mood"] == 3.5
    assert data_a["average_stress"] == 2.5
    assert data_a["average_sleep"] == 7.2
    assert len(data_a["mood_trend"]) == 2
    assert len(data_a["sleep_trend"]) == 2
    assert len(data_a["stress_trend"]) == 2

    # Check non-diagnostic tone (never clinical diagnosis)
    for forbidden in ["diagnos", "disorder", "clinical", "depress", "patholog"]:
        assert forbidden not in data_a["plain_summary"].lower()

    # 3. Verify session B is strictly isolated (zero cross-exposure)
    res_b = client.get("/api/insights?days=7", headers={"X-Session-ID": session_b})
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["check_in_count"] == 0
    assert data_b["mood_trend"] == []

    # Clean up test data
    storage.delete_all_data(session_a)
    storage.delete_all_data(session_b)
    res_purged = client.get("/api/insights?days=7", headers={"X-Session-ID": session_a})
    assert res_purged.json()["check_in_count"] == 0


def test_planner_task_lifecycle_and_session_isolation():
    """Validates full study planner lifecycle, persistent task editing, and session isolation."""
    client = TestClient(app)
    session_1 = "test-session-planner-alice"
    session_2 = "test-session-planner-bob"

    # Start with clean sessions
    storage.delete_all_data(session_1)
    storage.delete_all_data(session_2)

    # 1. Session 1 creates a study task
    create_res = client.post(
        "/api/planner/tasks",
        headers={"X-Session-ID": session_1},
        json={
            "title": "Organic Chemistry Revision",
            "estimated_minutes": 45,
            "category": "Revision",
        },
    )
    assert create_res.status_code == 200
    task_data = create_res.json()
    task_id = task_data["id"]
    assert task_data["title"] == "Organic Chemistry Revision"
    assert task_data["estimated_minutes"] == 45
    assert task_data["category"] == "Revision"
    assert task_data["completed"] is False

    # 2. Session 2 cannot view Session 1's newly created task
    list_res_2 = client.get(
        "/api/planner/tasks",
        headers={"X-Session-ID": session_2},
    )
    assert list_res_2.status_code == 200
    session_2_task_ids = [t["id"] for t in list_res_2.json()]
    assert task_id not in session_2_task_ids

    # 3. Session 2 cannot update Session 1's task (strict 404 isolation)
    intruder_patch = client.patch(
        f"/api/planner/tasks/{task_id}",
        headers={"X-Session-ID": session_2},
        json={"title": "Hacked Title"},
    )
    assert intruder_patch.status_code == 404

    # 4. Session 1 successfully updates the task (PATCH /api/planner/tasks/{id})
    update_res = client.patch(
        f"/api/planner/tasks/{task_id}",
        headers={"X-Session-ID": session_1},
        json={
            "title": "Advanced Organic Chemistry",
            "estimated_minutes": 60,
            "category": "Study",
        },
    )
    assert update_res.status_code == 200
    updated_task = update_res.json()
    assert updated_task["id"] == task_id
    assert updated_task["title"] == "Advanced Organic Chemistry"
    assert updated_task["estimated_minutes"] == 60
    assert updated_task["category"] == "Study"
    assert updated_task["completed"] is False

    # 5. Verify persistence across refresh (GET /api/planner/tasks)
    list_res_1 = client.get(
        "/api/planner/tasks",
        headers={"X-Session-ID": session_1},
    )
    assert list_res_1.status_code == 200
    tasks_1 = list_res_1.json()
    persisted_task = next(t for t in tasks_1 if t["id"] == task_id)
    assert persisted_task["title"] == "Advanced Organic Chemistry"
    assert persisted_task["estimated_minutes"] == 60
    assert persisted_task["category"] == "Study"
    assert persisted_task["completed"] is False

    # 6. Toggle completion
    toggle_res = client.patch(
        f"/api/planner/tasks/{task_id}/toggle",
        headers={"X-Session-ID": session_1},
    )
    assert toggle_res.status_code == 200
    assert toggle_res.json()["completed"] is True

    # 7. Delete task
    del_res = client.delete(
        f"/api/planner/tasks/{task_id}",
        headers={"X-Session-ID": session_1},
    )
    assert del_res.status_code == 200

    # Verify task is deleted
    list_after_del = client.get(
        "/api/planner/tasks",
        headers={"X-Session-ID": session_1},
    )
    assert task_id not in [t["id"] for t in list_after_del.json()]

    # Clean up
    storage.delete_all_data(session_1)
    storage.delete_all_data(session_2)


if __name__ == "__main__":
    test_safety_rules()
    test_ai_guidance_bypass()
    test_privacy_storage()
    test_high_risk_data_retention_and_safe_exit_purge()
    test_support_resources()
    test_reflection_length_and_consent_contracts()
    test_insights_endpoint_contracts()
    test_planner_task_lifecycle_and_session_isolation()
    print("\nALL BACKEND SAFETY & PRIVACY TESTS PASSED!")
