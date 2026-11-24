"""
Calmspace Safety & Backend Tests
Verifies core safety rules, privacy retention, and routing.
"""

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
    resources = get_support_directory()
    assert len(resources) >= 5

    # 1. Tele-MANAS verified contract
    tele_manas = next(r for r in resources if r.id == "tele-manas")
    assert tele_manas.official_source_url == "https://telemanas.mohfw.gov.in"
    assert tele_manas.contact_number == "14416"
    assert tele_manas.is_urgent is True
    assert tele_manas.is_demo_placeholder is False
    assert "mohfw" in tele_manas.verification_source.lower()

    # 2. National Emergency 112 verified contract
    emergency = next(r for r in resources if r.id == "national-emergency")
    assert emergency.official_source_url == "https://erss.in"
    assert emergency.contact_number == "112"
    assert emergency.is_urgent is True
    assert emergency.is_demo_placeholder is False

    # 3. iCALL (TISS) official hours and source alignment
    icall = next(r for r in resources if r.id == "icall-tiss")
    assert icall.contact_number == "02225521111"
    assert icall.official_source_url == "https://icallhelpline.org"
    assert "08:00 – 21:00" in icall.hours
    assert icall.is_demo_placeholder is False

    # 4. Campus Demo Placeholder contract
    campus = next(r for r in resources if r.id == "campus-counselling")
    assert campus.is_demo_placeholder is True
    assert "demo" in campus.badge_label.lower()
    assert campus.placeholder_note is not None
    assert campus.email is None, (
        "Campus demo placeholder must not provide an active email"
    )
    assert "demo" in campus.verification_source.lower()

    # 5. All resources must have non-empty source and verified dates
    for r in resources:
        assert r.verification_source, f"Missing verification source on {r.name}"
        assert r.last_verified_date, f"Missing last verified date on {r.name}"
        assert r.contact_number, f"Missing contact number on {r.name}"
    print("✓ Support directory verification verified")


if __name__ == "__main__":
    test_safety_rules()
    test_ai_guidance_bypass()
    test_privacy_storage()
    test_high_risk_data_retention_and_safe_exit_purge()
    test_support_resources()
    print("\nALL BACKEND SAFETY & PRIVACY TESTS PASSED!")
