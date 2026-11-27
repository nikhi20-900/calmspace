"""Regression coverage for the isolated Insights V2 date/time utilities."""

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.insight_windows import (
    build_insight_windows,
    effective_timezone,
    normalize_iso_timestamp,
    timestamp_in_window,
)


def test_missing_and_invalid_timezones_fall_back_to_utc():
    assert effective_timezone(None).key == "UTC"
    assert effective_timezone("").key == "UTC"
    assert effective_timezone("Not/A_Real_Zone").key == "UTC"


def test_valid_timezone_uses_its_local_calendar_date():
    windows = build_insight_windows(
        7,
        "Asia/Kolkata",
        now=datetime(2026, 11, 27, 20, 0, tzinfo=UTC),
    )

    assert windows.current.timezone == "Asia/Kolkata"
    assert windows.current.start_date.isoformat() == "2026-11-22"
    assert windows.current.end_date_exclusive.isoformat() == "2026-11-29"


@pytest.mark.parametrize("days", [1, 7, 14, 30, 90])
def test_current_and_baseline_are_adjacent_equal_calendar_windows(days):
    windows = build_insight_windows(
        days,
        "UTC",
        now=datetime(2026, 11, 27, 23, 59, tzinfo=UTC),
    )

    assert windows.current.days == days
    assert windows.baseline.days == days
    assert windows.baseline.end_date_exclusive == windows.current.start_date
    assert windows.current.end_date_exclusive.isoformat() == "2026-11-28"
    assert windows.baseline.start_utc < windows.baseline.end_utc
    assert windows.baseline.end_utc == windows.current.start_utc


@pytest.mark.parametrize(
    ("local_now", "expected_hours"),
    [
        (datetime(2024, 3, 10, 12, tzinfo=UTC), 23),
        (datetime(2024, 11, 3, 12, tzinfo=UTC), 25),
    ],
)
def test_dst_windows_keep_calendar_day_count(local_now, expected_hours):
    windows = build_insight_windows(1, "America/New_York", now=local_now)

    assert windows.current.days == 1
    assert windows.current.end_utc - windows.current.start_utc == timedelta(
        hours=expected_hours
    )


def test_window_uses_inclusive_start_and_exclusive_end():
    window = build_insight_windows(
        1, "UTC", now=datetime(2026, 11, 27, 12, tzinfo=UTC)
    ).current

    assert timestamp_in_window("2026-11-27T00:00:00Z", window)
    assert not timestamp_in_window("2026-11-26T23:59:59.999999Z", window)
    assert timestamp_in_window("2026-11-27T23:59:59.999999Z", window)
    assert not timestamp_in_window("2026-11-28T00:00:00Z", window)


def test_explicit_offsets_are_normalized_before_window_comparison():
    instant = normalize_iso_timestamp("2026-11-27T20:00:00+05:30")
    assert instant == datetime(2026, 11, 27, 14, 30, tzinfo=UTC)

    window = build_insight_windows(
        1, "UTC", now=datetime(2026, 11, 27, 12, tzinfo=UTC)
    ).current
    assert timestamp_in_window("2026-11-27T20:00:00+05:30", window)


def test_legacy_naive_timestamps_are_interpreted_as_utc():
    assert normalize_iso_timestamp("2026-11-27T14:30:00") == datetime(
        2026, 11, 27, 14, 30, tzinfo=UTC
    )
    assert normalize_iso_timestamp("2026-11-27T14:30:00z") == datetime(
        2026, 11, 27, 14, 30, tzinfo=UTC
    )


@pytest.mark.parametrize("value", [None, "", "not-a-timestamp", "2026-99-99"])
def test_invalid_timestamps_are_excluded(value):
    window = build_insight_windows(
        1, "UTC", now=datetime(2026, 11, 27, 12, tzinfo=UTC)
    ).current

    assert normalize_iso_timestamp(value) is None
    assert not timestamp_in_window(value, window)


def test_empty_selected_window_does_not_substitute_older_records():
    window = build_insight_windows(
        7,
        "UTC",
        now=datetime(2026, 11, 27, 12, tzinfo=UTC),
    ).current
    timestamps = ["2020-01-01T12:00:00Z", "2020-01-02T12:00:00Z"]

    selected = [value for value in timestamps if timestamp_in_window(value, window)]

    assert selected == []


def test_v1_insights_endpoint_contract_remains_available():
    response = TestClient(app).get(
        "/api/insights", headers={"X-Session-ID": "insights-v1-compatibility"}
    )

    assert response.status_code == 200
    assert set(response.json()) == {
        "average_mood",
        "average_stress",
        "average_sleep",
        "check_in_count",
        "plain_summary",
        "mood_trend",
        "sleep_trend",
        "stress_trend",
    }


@pytest.mark.parametrize("days", [0, -1, 91, True, 7.0])
def test_window_builder_rejects_invalid_day_counts(days):
    with pytest.raises(ValueError, match="days must be an integer"):
        build_insight_windows(days, "UTC")
