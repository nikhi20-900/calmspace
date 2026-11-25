"""
Tests for Issue #14: Analytics data-access layer & privacy-safe aggregation
"""

import os
import tempfile

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.analytics import compute_session_insights
from app.services.storage import CalmspaceStorage


@pytest.fixture
def temp_storage():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        temp_path = f.name
    storage = CalmspaceStorage(db_path=temp_path)
    yield storage
    storage.close()
    if os.path.exists(temp_path):
        os.remove(temp_path)


def test_empty_checkin_history(temp_storage):
    """Empty history returns zero counts and a welcoming prompt."""
    insights = compute_session_insights(
        "new-student-session", days=7, storage_engine=temp_storage
    )

    assert insights.check_in_count == 0
    assert insights.average_mood == 0.0
    assert insights.average_stress == 0.0
    assert insights.average_sleep == 0.0
    assert "No check-ins yet" in insights.plain_summary
    assert len(insights.mood_trend) == 0
    assert len(insights.sleep_trend) == 0
    assert len(insights.stress_trend) == 0


def test_single_checkin_summary(temp_storage):
    """A single check-in provides a gentle baseline without claiming a trend."""
    session_id = "single-entry-session"
    temp_storage.add_checkin(session_id, mood=4, stress=2, sleep_hours=7.5, route="LOW")

    insights = compute_session_insights(session_id, days=7, storage_engine=temp_storage)

    assert insights.check_in_count == 1
    assert insights.average_mood == 4.0
    assert insights.average_stress == 2.0
    assert insights.average_sleep == 7.5
    assert "Based on your first check-in" in insights.plain_summary
    assert len(insights.mood_trend) == 1
    assert insights.mood_trend[0]["mood"] == 4


def test_multi_day_aggregation(temp_storage):
    """Aggregates multiple records with correct math and rounded values."""
    session_id = "multi-entry-session"
    temp_storage.add_checkin(
        session_id, mood=3, stress=3, sleep_hours=6.0, route="MEDIUM"
    )
    temp_storage.add_checkin(session_id, mood=5, stress=1, sleep_hours=8.0, route="LOW")
    temp_storage.add_checkin(session_id, mood=4, stress=2, sleep_hours=7.0, route="LOW")

    insights = compute_session_insights(session_id, days=7, storage_engine=temp_storage)

    assert insights.check_in_count == 3
    # (3+5+4)/3 = 4.0
    assert insights.average_mood == 4.0
    # (3+1+2)/3 = 2.0
    assert insights.average_stress == 2.0
    # (6+8+7)/3 = 7.0
    assert insights.average_sleep == 7.0
    assert len(insights.mood_trend) == 3


def test_session_isolation_analytics(temp_storage):
    """Session A's analytics cannot be accessed by Session B."""
    session_a = "session-alice"
    session_b = "session-bob"

    temp_storage.add_checkin(session_a, mood=5, stress=1, sleep_hours=8.0, route="LOW")
    temp_storage.add_checkin(session_a, mood=4, stress=2, sleep_hours=7.5, route="LOW")

    insights_a = compute_session_insights(
        session_a, days=7, storage_engine=temp_storage
    )
    insights_b = compute_session_insights(
        session_b, days=7, storage_engine=temp_storage
    )

    assert insights_a.check_in_count == 2
    assert insights_b.check_in_count == 0


def test_non_diagnostic_language_guardrails(temp_storage):
    """Summaries must never contain medical or clinical diagnostic phrases."""
    session_id = "guardrail-session"
    temp_storage.add_checkin(
        session_id, mood=1, stress=5, sleep_hours=3.0, route="HIGH"
    )

    insights = compute_session_insights(session_id, days=7, storage_engine=temp_storage)

    forbidden_clinical_words = [
        "diagnos",
        "disorder",
        "symptom",
        "depress",
        "patholog",
        "treatment",
        "clinically",
        "cured",
    ]
    summary_lower = insights.plain_summary.lower()
    for word in forbidden_clinical_words:
        assert word not in summary_lower


def test_api_insights_endpoint():
    """Verify FastAPI router integration and header validation."""
    client = TestClient(app)
    response = client.get("/api/insights", headers={"X-Session-ID": "test-api-session"})
    assert response.status_code == 200
    data = response.json()
    assert "average_mood" in data
    assert "plain_summary" in data
    assert "mood_trend" in data
