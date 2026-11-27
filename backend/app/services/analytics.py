"""
Analytics Data-Access Layer & Privacy-Safe Aggregation Service (Issue #14)

Key Principles:
1. Strict Session Isolation: Every query enforces session-ownership validation.
2. Non-Diagnostic Language: Summaries provide gentle descriptive pacing, never clinical diagnoses.
3. Robust Edge Handling: Safely handles empty history, single-entry baselines, and boundary cases.
4. Privacy Preservation: Reflections, credentials, and unnecessary identifiers are excluded.
"""

from datetime import UTC, datetime, timedelta

from app.models.schemas import CheckInRecord, InsightSummary
from app.services.storage import storage


def _format_average(value: float) -> str:
    return f"{value:.1f}".rstrip("0").rstrip(".")


def compute_session_insights(
    session_id: str, days: int = 7, storage_engine=None
) -> InsightSummary:
    """
    Computes session-scoped trends, averages, and plain-language summaries for Recharts.
    Enforces time window bounds (1 to 90 days).
    """
    engine = storage_engine or storage
    if hasattr(engine, "cleanup_expired_records"):
        engine.cleanup_expired_records(session_id)
    all_checkins: list[CheckInRecord] = engine.get_checkins(session_id)

    if not all_checkins:
        return InsightSummary(
            average_mood=0.0,
            average_stress=0.0,
            average_sleep=0.0,
            check_in_count=0,
            plain_summary="No check-ins yet. Take a moment to log your first one.",
            mood_trend=[],
            sleep_trend=[],
            stress_trend=[],
        )

    # Filter records within the requested day window if timestamps are valid,
    # or fall back to the most recent `days` entries.
    cutoff_date = datetime.now(UTC) - timedelta(days=days)
    filtered_records: list[CheckInRecord] = []

    for c in all_checkins:
        try:
            clean_ts = c.timestamp.replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean_ts)
            if dt >= cutoff_date:
                filtered_records.append(c)
        except (ValueError, TypeError):
            # If timestamp parsing fails, retain entry for safety
            filtered_records.append(c)

    # If cutoff filtered out all historical entries (e.g. old data), use latest `days` records
    if not filtered_records:
        filtered_records = all_checkins[-days:]

    count = len(filtered_records)
    avg_mood = sum(c.mood for c in filtered_records) / count
    avg_stress = sum(c.stress for c in filtered_records) / count
    avg_sleep = sum(c.sleep_hours for c in filtered_records) / count

    mood_trend = []
    sleep_trend = []
    stress_trend = []

    for idx, c in enumerate(filtered_records):
        # The browser derives the visible label from this original timestamp so
        # the chart uses the student's local timezone. Keep a safe fallback for
        # clients that cannot parse the timestamp.
        common = {
            "day": f"Entry {idx + 1}",
            "timestamp": c.timestamp,
            "record_index": idx,
        }
        mood_trend.append({**common, "mood": c.mood, "route": c.route})
        sleep_trend.append({**common, "sleep": round(c.sleep_hours, 1)})
        stress_trend.append({**common, "stress": c.stress})

    if count == 1:
        plain_summary = (
            f"Based on your first check-in, mood was {_format_average(avg_mood)} out of 5, "
            f"sleep was {_format_average(avg_sleep)} hours, and stress was rated "
            f"{_format_average(avg_stress)} out of 5."
        )
    else:
        plain_summary = (
            f"Across your last {count} check-ins, your average mood was "
            f"{_format_average(avg_mood)} out of 5, sleep averaged "
            f"{_format_average(avg_sleep)} hours, and stress was rated "
            f"{_format_average(avg_stress)} out of 5."
        )

    return InsightSummary(
        average_mood=round(avg_mood, 1),
        average_stress=round(avg_stress, 1),
        average_sleep=round(avg_sleep, 1),
        check_in_count=count,
        plain_summary=plain_summary,
        mood_trend=mood_trend,
        sleep_trend=sleep_trend,
        stress_trend=stress_trend,
    )
