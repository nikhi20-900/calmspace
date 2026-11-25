"""
Insights API Router
Computes weekly trends, averages, and plain-language summaries for Recharts.
Never uses diagnostic language.
"""

from datetime import datetime

from fastapi import APIRouter, Header

from app.models.schemas import InsightSummary
from app.services.storage import storage

router = APIRouter(prefix="/api/insights", tags=["Insights"])


@router.get("", response_model=InsightSummary)
async def get_insights(
    days: int = 7,
    x_session_id: str = Header(
        ..., min_length=1, max_length=128, pattern=r"^[A-Za-z0-9._-]+$"
    ),
):
    session_id = x_session_id
    all_checkins = storage.get_checkins(session_id)

    if not all_checkins:
        # Return empty state structure
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

    # Take the latest `days` records
    records = all_checkins[-days:]
    avg_mood = sum(c.mood for c in records) / len(records)
    avg_stress = sum(c.stress for c in records) / len(records)
    avg_sleep = sum(c.sleep_hours for c in records) / len(records)

    # Format trends for Recharts
    mood_trend = []
    sleep_trend = []
    stress_trend = []

    for idx, c in enumerate(records):
        try:
            dt = datetime.fromisoformat(c.timestamp)
            label = dt.strftime("%a %d")
        except (ValueError, TypeError):
            label = f"Entry {idx + 1}"

        mood_trend.append({"day": label, "mood": c.mood, "route": c.route})
        sleep_trend.append({"day": label, "sleep": c.sleep_hours})
        stress_trend.append({"day": label, "stress": c.stress})

    # Plain language accessible summary
    mood_word = (
        "very steady"
        if avg_mood >= 4
        else "generally okay"
        if avg_mood >= 2.8
        else "lower than usual"
    )
    stress_word = (
        "well managed"
        if avg_stress <= 2.5
        else "moderate"
        if avg_stress <= 3.8
        else "higher"
    )

    plain_summary = (
        f"Over your last {len(records)} check-ins, your mood averaged {avg_mood:.1f}/5 ({mood_word}) "
        f"with {avg_sleep:.1f} hours average sleep and {stress_word} stress levels."
    )

    return InsightSummary(
        average_mood=round(avg_mood, 1),
        average_stress=round(avg_stress, 1),
        average_sleep=round(avg_sleep, 1),
        check_in_count=len(records),
        plain_summary=plain_summary,
        mood_trend=mood_trend,
        sleep_trend=sleep_trend,
        stress_trend=stress_trend,
    )
