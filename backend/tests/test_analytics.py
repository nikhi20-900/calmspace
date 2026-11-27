"""
Tests for Issue #14: Analytics data-access layer & privacy-safe aggregation
"""

import os
import tempfile
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.schemas import UserSettings
from app.services.analytics import (
    compute_session_insights,
    compute_session_insights_v2,
)
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
    assert (
        "mood was 4 out of 5, sleep was 7.5 hours, and stress was rated 2 out of 5"
        in insights.plain_summary
    )
    assert "well-managed" not in insights.plain_summary
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


def test_v2_brand_new_and_empty_window_states(temp_storage):
    """V2 distinguishes zero history from an empty time window without falling back."""
    now = datetime(2026, 11, 27, 12, 0, tzinfo=UTC)

    brand_new = compute_session_insights_v2(
        "v2-brand-new",
        days=7,
        timezone_name="UTC",
        storage_engine=temp_storage,
        now=now,
    )
    assert brand_new.state == "brand_new"
    assert brand_new.check_in_count == 0
    assert brand_new.total_stored_count == 0
    assert brand_new.timeline_entries == []
    assert brand_new.daily_series == []
    assert brand_new.pattern_highlights == []
    assert "No check-ins yet" in brand_new.plain_summary

    session_id = "v2-empty-window"
    temp_storage.add_checkin(
        session_id,
        mood=3,
        stress=3,
        sleep_hours=6.5,
        route="MEDIUM",
        timestamp=(now - timedelta(days=11)).isoformat(),
    )
    temp_storage.add_checkin(
        session_id,
        mood=4,
        stress=2,
        sleep_hours=7.5,
        route="LOW",
        timestamp=(now - timedelta(days=10)).isoformat(),
    )

    empty_7d = compute_session_insights_v2(
        session_id, days=7, timezone_name="UTC", storage_engine=temp_storage, now=now
    )
    assert empty_7d.state == "empty_window"
    assert empty_7d.check_in_count == 0
    assert empty_7d.total_stored_count == 2
    assert empty_7d.timeline_entries == []
    assert empty_7d.daily_series == []
    assert empty_7d.pattern_highlights == []
    assert "No check-ins logged in the last 7 days" in empty_7d.plain_summary

    window_14d = compute_session_insights_v2(
        session_id, days=14, timezone_name="UTC", storage_engine=temp_storage, now=now
    )
    assert window_14d.state == "building_baseline"
    assert window_14d.check_in_count == 2
    assert window_14d.total_stored_count == 2


def test_v2_same_day_checkins_preserve_entries_and_daily_presentation(temp_storage):
    """Scenario A: same-day entries stay distinct in timeline_entries and aggregate for charts."""
    session_id = "v2-scenario-a"
    now = datetime(2026, 11, 27, 17, 0, tzinfo=UTC)

    temp_storage.add_checkin(
        session_id,
        mood=3,
        stress=4,
        sleep_hours=5.5,
        route="MEDIUM",
        timestamp="2026-11-27T04:00:00Z",  # 09:30 Asia/Kolkata
    )
    temp_storage.add_checkin(
        session_id,
        mood=4,
        stress=2,
        sleep_hours=5.5,
        route="LOW",
        timestamp="2026-11-27T16:15:00Z",  # 21:45 Asia/Kolkata
    )

    insights = compute_session_insights_v2(
        session_id,
        days=7,
        timezone_name="Asia/Kolkata",
        storage_engine=temp_storage,
        now=now,
    )
    assert insights.timezone == "Asia/Kolkata"
    assert insights.state == "building_baseline"
    assert insights.check_in_count == 2
    assert insights.distinct_local_days == 1
    assert insights.pattern_highlights == []

    # Individual entries stay untouched and keep route for the history table only
    assert len(insights.timeline_entries) == 2
    assert [e.local_time_label for e in insights.timeline_entries] == ["09:30", "21:45"]
    assert [e.route for e in insights.timeline_entries] == ["MEDIUM", "LOW"]

    # Daily presentation point uses deterministic averages and omits route
    assert len(insights.daily_series) == 1
    day_point = insights.daily_series[0]
    assert day_point.date_key == "2026-11-27"
    assert day_point.entry_count == 2
    assert day_point.average_mood == 3.5
    assert day_point.average_stress == 3.0
    assert day_point.average_sleep == 5.5
    assert "route" not in day_point.model_dump()


def test_v2_iana_timezone_bucketing_utc_fallback_and_malformed_timestamps(temp_storage):
    """Validates IANA day grouping, UTC fallback for bad zones, naive UTC, and invalid rows."""
    session_id = "v2-tz-session"
    now = datetime(2026, 11, 28, 1, 0, tzinfo=UTC)

    temp_storage.add_checkin(
        session_id,
        mood=4,
        stress=2,
        sleep_hours=7.0,
        route="LOW",
        timestamp="2026-11-27T20:00:00Z",  # 2026-11-28 01:30 in Asia/Kolkata
    )
    temp_storage.add_checkin(
        session_id,
        mood=3,
        stress=3,
        sleep_hours=6.5,
        route="MEDIUM",
        timestamp="2026-11-27T14:30:00",  # Legacy naive UTC
    )
    temp_storage.add_checkin(
        session_id,
        mood=2,
        stress=4,
        sleep_hours=5.0,
        route="HIGH",
        timestamp="not-a-valid-timestamp",
    )

    kolkata = compute_session_insights_v2(
        session_id,
        days=7,
        timezone_name="Asia/Kolkata",
        storage_engine=temp_storage,
        now=now,
    )
    assert kolkata.timezone == "Asia/Kolkata"
    assert kolkata.check_in_count == 2
    assert kolkata.total_stored_count == 3
    assert [e.date_key for e in kolkata.timeline_entries] == [
        "2026-11-27",
        "2026-11-28",
    ]

    fallback_utc = compute_session_insights_v2(
        session_id,
        days=7,
        timezone_name="Invalid/Timezone",
        storage_engine=temp_storage,
        now=now,
    )
    assert fallback_utc.timezone == "UTC"
    assert [e.date_key for e in fallback_utc.timeline_entries] == [
        "2026-11-27",
        "2026-11-27",
    ]


def test_v2_steady_rhythm_vs_varied_rhythm_thresholds(temp_storage):
    """Scenario B produces steady_rhythm; wide swings with zero shift delta yield varied_rhythm."""
    now = datetime(2026, 11, 27, 18, 0, tzinfo=UTC)
    steady_session = "v2-scenario-b"
    steady_rows = [
        (4, 2, 7.5),
        (4, 2, 7.0),
        (4, 2, 8.0),
        (4, 1, 7.5),
        (5, 2, 7.5),
    ]
    for offset, (mood, stress, sleep_hours) in enumerate(reversed(steady_rows)):
        temp_storage.add_checkin(
            steady_session,
            mood=mood,
            stress=stress,
            sleep_hours=sleep_hours,
            route="LOW",
            timestamp=(now - timedelta(days=offset, hours=2)).isoformat(),
        )

    steady = compute_session_insights_v2(
        steady_session,
        days=7,
        timezone_name="UTC",
        storage_engine=temp_storage,
        now=now,
    )
    assert steady.state == "active"
    assert steady.sleep_7h_plus_count == 5
    assert [h.category for h in steady.pattern_highlights] == ["steady_rhythm"]

    varied_session = "v2-varied-rhythm"
    varied_rows = [(1, 5, 4.5), (5, 1, 8.5), (1, 5, 4.5), (5, 1, 8.5)]
    for offset, (mood, stress, sleep_hours) in enumerate(reversed(varied_rows)):
        temp_storage.add_checkin(
            varied_session,
            mood=mood,
            stress=stress,
            sleep_hours=sleep_hours,
            route="LOW",
            timestamp=(now - timedelta(days=offset, hours=2)).isoformat(),
        )

    varied = compute_session_insights_v2(
        varied_session,
        days=7,
        timezone_name="UTC",
        storage_engine=temp_storage,
        now=now,
    )
    assert varied.state == "active"
    assert [h.category for h in varied.pattern_highlights] == ["varied_rhythm"]


def test_v2_directional_shifts_and_co_observation_gates(temp_storage):
    """Scenario C triggers shifts + sleep co-observation; insufficient distinct days blocks co-obs."""
    now = datetime(2026, 11, 27, 20, 0, tzinfo=UTC)
    session_c = "v2-scenario-c"
    entries = [
        (5, 12, 2, 4, 5.5),
        (4, 12, 2, 5, 5.0),
        (3, 12, 3, 4, 6.0),
        (2, 12, 4, 2, 7.5),
        (1, 12, 4, 2, 8.0),
        (0, 9, 4, 2, 7.5),
        (0, 18, 5, 1, 7.5),
    ]
    for days_ago, hour, mood, stress, sleep_hours in entries:
        ts = datetime(2026, 11, 27, hour, 0, tzinfo=UTC) - timedelta(days=days_ago)
        temp_storage.add_checkin(
            session_c,
            mood=mood,
            stress=stress,
            sleep_hours=sleep_hours,
            route="LOW" if stress <= 2 else "MEDIUM",
            timestamp=ts.isoformat(),
        )

    insights = compute_session_insights_v2(
        session_c, days=7, timezone_name="UTC", storage_engine=temp_storage, now=now
    )
    assert insights.state == "active"
    assert insights.check_in_count == 7
    assert insights.distinct_local_days == 6
    assert insights.sleep_7h_plus_count == 4
    assert len(insights.timeline_entries) == 7
    assert len(insights.daily_series) == 6
    categories = {h.category for h in insights.pattern_highlights}
    assert "directional_shift" in categories
    assert "co_observation" in categories

    # Same 5+ entries concentrated in only 2 distinct local days must NOT emit co_observation
    dense_two_day = "v2-two-days-only"
    for hour_offset, (mood, stress, sleep_hours) in enumerate(
        [(2, 4, 5.0), (2, 5, 5.5), (2, 4, 5.0), (5, 1, 8.0), (5, 1, 8.5)]
    ):
        day_shift = 0 if hour_offset < 3 else 1
        ts = now - timedelta(days=day_shift, hours=hour_offset + 1)
        temp_storage.add_checkin(
            dense_two_day,
            mood=mood,
            stress=stress,
            sleep_hours=sleep_hours,
            route="LOW",
            timestamp=ts.isoformat(),
        )

    dense = compute_session_insights_v2(
        dense_two_day, days=7, timezone_name="UTC", storage_engine=temp_storage, now=now
    )
    assert dense.distinct_local_days == 2
    assert "co_observation" not in {h.category for h in dense.pattern_highlights}


def test_v2_retention_metadata_single_window_copy_and_language_guardrails(temp_storage):
    """Enforces authoritative retention_days, accurate 1-in-window copy, and zero clinical/causal words."""
    now = datetime(2026, 11, 27, 18, 0, tzinfo=UTC)
    session_id = "v2-retention-guardrails"
    temp_storage.update_settings(
        session_id,
        UserSettings(data_retention_days=14),
    )

    # Older check-in inside 14-day retention but outside 7-day window
    temp_storage.add_checkin(
        session_id,
        mood=1,
        stress=5,
        sleep_hours=3.0,
        route="HIGH",
        timestamp=(now - timedelta(days=10)).isoformat(),
    )
    temp_storage.add_checkin(
        session_id,
        mood=4,
        stress=2,
        sleep_hours=7.5,
        route="LOW",
        timestamp=(now - timedelta(hours=2)).isoformat(),
    )

    view_7d = compute_session_insights_v2(
        session_id, days=7, timezone_name="UTC", storage_engine=temp_storage, now=now
    )
    assert view_7d.retention_days == 14
    assert view_7d.check_in_count == 1
    assert view_7d.total_stored_count == 2
    assert "first check-in" not in view_7d.plain_summary.lower()

    # Add 4 more entries to inspect 30d active text and pattern highlights against guardrails
    for days_ago, mood, stress, sleep_hours in [
        (8, 2, 4, 5.0),
        (5, 2, 4, 5.5),
        (2, 4, 2, 7.5),
        (1, 5, 1, 8.0),
    ]:
        temp_storage.add_checkin(
            session_id,
            mood=mood,
            stress=stress,
            sleep_hours=sleep_hours,
            route="LOW",
            timestamp=(now - timedelta(days=days_ago)).isoformat(),
        )

    view_30d = compute_session_insights_v2(
        session_id, days=30, timezone_name="UTC", storage_engine=temp_storage, now=now
    )
    assert view_30d.retention_days == 14
    assert view_30d.state == "active"

    all_text = " ".join(
        [
            view_7d.plain_summary,
            view_30d.plain_summary,
            *(
                part
                for h in view_30d.pattern_highlights
                for part in (h.title, h.summary, h.sample_basis)
            ),
        ]
    ).lower()
    forbidden_terms = [
        "diagnos",
        "disorder",
        "symptom",
        "depress",
        "anxiety",
        "patholog",
        "treatment",
        "clinical",
        "cured",
        "therapy",
        "illness",
        "cause",
        "caused",
        "causes",
        "causing",
        "leads to",
        "led to",
        "makes your",
        "fixes",
        "prevents",
    ]
    for term in forbidden_terms:
        assert term not in all_text


def test_v2_malformed_only_history_reports_empty_window_not_brand_new(temp_storage):
    """Sessions with only malformed stored timestamps report empty_window, not brand_new."""
    now = datetime(2026, 11, 27, 12, 0, tzinfo=UTC)
    session_id = "v2-malformed-only"
    temp_storage.add_checkin(
        session_id,
        mood=3,
        stress=3,
        sleep_hours=6.0,
        route="MEDIUM",
        timestamp="not-a-timestamp",
    )
    temp_storage.add_checkin(
        session_id,
        mood=4,
        stress=2,
        sleep_hours=7.0,
        route="LOW",
        timestamp="",
    )

    insights = compute_session_insights_v2(
        session_id, days=7, timezone_name="UTC", storage_engine=temp_storage, now=now
    )
    assert insights.state == "empty_window"
    assert insights.total_stored_count == 2
    assert insights.check_in_count == 0
    assert insights.timeline_entries == []
    assert insights.daily_series == []
    assert insights.pattern_highlights == []


def test_v2_even_count_directional_shifts_and_exact_inclusive_thresholds(
    temp_storage,
):
    """Verifies exact 4-entry symmetric split and inclusive 0.5 / 0.5 / 0.75 thresholds."""
    now = datetime(2026, 11, 27, 18, 0, tzinfo=UTC)
    exact_session = "v2-even-exact"
    # Even count 4 -> earlier=[0, 1], recent=[2, 3]:
    # delta_mood = 3.5 - 3.0 = +0.5, delta_stress = 2.5 - 3.0 = -0.5, delta_sleep = 6.75 - 6.0 = +0.75
    rows = [
        (3, 3, 6.0),
        (3, 3, 6.0),
        (4, 2, 6.5),
        (3, 3, 7.0),
    ]
    for offset, (mood, stress, sleep_hours) in enumerate(reversed(rows)):
        temp_storage.add_checkin(
            exact_session,
            mood=mood,
            stress=stress,
            sleep_hours=sleep_hours,
            route="LOW",
            timestamp=(now - timedelta(days=offset, hours=2)).isoformat(),
        )

    exact = compute_session_insights_v2(
        exact_session, days=7, timezone_name="UTC", storage_engine=temp_storage, now=now
    )
    assert exact.state == "active"
    assert [h.id for h in exact.pattern_highlights] == [
        "shift-mood",
        "shift-stress",
        "shift-sleep",
    ]


def test_v2_co_observation_bucket_minimum_and_exact_diff_boundary(temp_storage):
    """Requires >= 2 entries per sleep bucket and verifies inclusive 0.6 diff boundary."""
    now = datetime(2026, 11, 27, 18, 0, tzinfo=UTC)

    # 5 distinct local days, but < 7h bucket has only 1 entry -> co_observation blocked
    one_in_bucket = "v2-co-obs-bucket-1"
    rows_bucket_1 = [
        (4, 1, 5, 5.0),
        (3, 5, 1, 8.0),
        (2, 5, 1, 8.0),
        (1, 5, 1, 8.0),
        (0, 5, 1, 8.0),
    ]
    for days_ago, mood, stress, sleep_hours in rows_bucket_1:
        temp_storage.add_checkin(
            one_in_bucket,
            mood=mood,
            stress=stress,
            sleep_hours=sleep_hours,
            route="LOW",
            timestamp=(now - timedelta(days=days_ago, hours=1)).isoformat(),
        )

    blocked = compute_session_insights_v2(
        one_in_bucket, days=7, timezone_name="UTC", storage_engine=temp_storage, now=now
    )
    assert blocked.distinct_local_days == 5
    assert "co_observation" not in {h.category for h in blocked.pattern_highlights}

    # Exact 0.6 inclusive boundary: <7h (2 entries, mean 3.0) vs >=7h (5 entries, mean 3.6) -> diff = 0.6
    exact_diff_session = "v2-co-obs-exact-06"
    rows_exact = [
        (6, 3, 2, 6.0),
        (5, 3, 2, 6.5),
        (4, 3, 2, 7.5),
        (3, 4, 2, 7.5),
        (2, 4, 2, 8.0),
        (1, 3, 2, 7.5),
        (0, 4, 2, 8.0),
    ]
    for days_ago, mood, stress, sleep_hours in rows_exact:
        temp_storage.add_checkin(
            exact_diff_session,
            mood=mood,
            stress=stress,
            sleep_hours=sleep_hours,
            route="LOW",
            timestamp=(now - timedelta(days=days_ago, hours=1)).isoformat(),
        )

    included = compute_session_insights_v2(
        exact_diff_session,
        days=7,
        timezone_name="UTC",
        storage_engine=temp_storage,
        now=now,
    )
    assert [
        h.id for h in included.pattern_highlights if h.category == "co_observation"
    ] == ["co-observation-sleep-mood"]


def test_v2_daily_fractional_rounding_and_invalid_retention_fallback():
    """Verifies 1-decimal rounding on daily chart points and 30d fallback for invalid retention."""
    now = datetime(2026, 11, 27, 18, 0, tzinfo=UTC)

    class StubSettings:
        data_retention_days = 999

    class StubStorage:
        def cleanup_expired_records(self, session_id, now=None):
            return 0

        def get_settings(self, session_id):
            return StubSettings()

        def get_checkins(self, session_id):
            from app.models.schemas import CheckInRecord

            return [
                CheckInRecord(
                    id="c1",
                    session_id=session_id,
                    timestamp="2026-11-27T08:00:00Z",
                    mood=3,
                    stress=1,
                    sleep_hours=6.2,
                    route="LOW",
                ),
                CheckInRecord(
                    id="c2",
                    session_id=session_id,
                    timestamp="2026-11-27T12:00:00Z",
                    mood=4,
                    stress=2,
                    sleep_hours=6.3,
                    route="LOW",
                ),
                CheckInRecord(
                    id="c3",
                    session_id=session_id,
                    timestamp="2026-11-27T16:00:00Z",
                    mood=4,
                    stress=2,
                    sleep_hours=6.2,
                    route="MEDIUM",
                ),
            ]

    insights = compute_session_insights_v2(
        "stub-session",
        days=7,
        timezone_name="UTC",
        storage_engine=StubStorage(),
        now=now,
    )
    assert insights.retention_days == 30
    assert len(insights.daily_series) == 1
    day = insights.daily_series[0]
    assert day.entry_count == 3
    assert day.average_mood == 3.7
    assert day.average_stress == 1.7
    assert day.average_sleep == 6.2
