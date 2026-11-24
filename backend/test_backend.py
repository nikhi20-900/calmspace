"""
Calmspace Safety & Backend Tests
Verifies core safety rules, privacy retention, and routing.
"""
from app.services.safety_evaluator import evaluate_wellbeing_route
from app.services.storage import storage
from app.services.ai_guidance import generate_supportive_guidance
from app.services.support_directory import get_support_directory

def test_safety_rules():
    print("Testing Safety Rules Engine...")
    
    # 1. Low Route
    low_res = evaluate_wellbeing_route(mood=4, stress=2, sleep_hours=8.0, reflection="Had a calm study session.")
    assert low_res.route == "LOW", f"Expected LOW, got {low_res.route}"
    assert low_res.ai_eligible is True
    assert low_res.requires_human_escalation is False
    print("✓ Low route verified")

    # 2. Medium Route
    med_res = evaluate_wellbeing_route(mood=2, stress=3, sleep_hours=5.5, reflection="Stressed about physics midterm.")
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
        mood=3, stress=3, sleep_hours=7.0,
        reflection="I feel completely hopeless and want to end it all"
    )
    assert high_keyword.route == "HIGH", "Must detect crisis indicator"
    assert high_keyword.ai_eligible is False
    assert high_keyword.requires_human_escalation is True
    print("✓ High route (crisis keyword detection) verified")

def test_ai_guidance_bypass():
    print("Testing AI Guidance Bypass on High Route...")
    guidance = generate_supportive_guidance(route="HIGH", mood=1, stress=5, sleep_hours=4.0)
    assert guidance is None, "AI guidance must return None for HIGH route"
    print("✓ AI bypass verified for HIGH route")

def test_privacy_storage():
    print("Testing Privacy & Data Retention...")
    session_id = "test-session-privacy"
    
    # Store checkin
    rec = storage.add_checkin(session_id, mood=4, stress=2, sleep_hours=7.5, route="LOW")
    assert not hasattr(rec, "reflection"), "Reflection must never exist in CheckInRecord"
    
    # Verify records
    history = storage.get_checkins(session_id)
    assert len(history) == 1
    assert history[0].mood == 4
    
    # Purge all data
    storage.delete_all_data(session_id)
    assert len(storage.get_checkins(session_id)) == 0
    print("✓ Privacy data retention and full purge verified")

def test_support_resources():
    print("Testing Verified Support Directory...")
    resources = get_support_directory()
    assert len(resources) >= 4
    for r in resources:
        assert r.verification_source, f"Missing verification source on {r.name}"
        assert r.last_verified_date, f"Missing last verified date on {r.name}"
        assert r.contact_number, f"Missing contact number on {r.name}"
    print("✓ Support directory verification verified")

if __name__ == "__main__":
    test_safety_rules()
    test_ai_guidance_bypass()
    test_privacy_storage()
    test_support_resources()
    print("\nALL BACKEND SAFETY & PRIVACY TESTS PASSED!")
