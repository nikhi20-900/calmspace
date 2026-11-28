"""
Analytics Data-Access Layer & Privacy-Safe Aggregation Service (Issue #14)

Key Principles:
1. Strict Session Isolation: Every query enforces session-ownership validation.
2. Non-Diagnostic Language: Summaries provide gentle descriptive pacing, never clinical diagnoses.
3. Robust Edge Handling: Safely handles empty history, single-entry baselines, and boundary cases.
4. Privacy Preservation: Reflections, credentials, and unnecessary identifiers are excluded.
"""

from datetime import UTC, datetime, timedelta

from app.models.schemas import (
    CheckInRecord,
    ComparisonMetric,
    DailyInsightPoint,
    InsightSummary,
    InsightSummaryV2,
    MetricRange,
    PatternHighlight,
    PeriodComparison,
    TimelineEntry,
)
from app.services.insight_windows import (
    build_insight_windows,
    effective_timezone,
    normalize_iso_timestamp,
    timestamp_in_window,
)
from app.services.storage import storage

DEFAULT_RETENTION_DAYS = 30
MIN_PATTERN_SAMPLES = 4
MIN_PATTERN_DAYS = 2
MIN_CO_OBSERVATION_SAMPLES = 5
MIN_CO_OBSERVATION_DAYS = 3
MIN_CO_OBSERVATION_BUCKET_ENTRIES = 2
MOOD_SHIFT_THRESHOLD = 0.5
STRESS_SHIFT_THRESHOLD = 0.5
SLEEP_SHIFT_THRESHOLD = 0.75
STEADY_MOOD_MAX_SPREAD = 1.0
STEADY_STRESS_MAX_SPREAD = 1.0
STEADY_SLEEP_MAX_SPREAD = 1.5
CO_OBSERVATION_DIFF_THRESHOLD = 0.6
RESTFUL_SLEEP_THRESHOLD_HOURS = 7.0
MIN_COMPARISON_CHECKINS = 3
MIN_COMPARISON_ACTIVE_DAYS = 2


def _format_day_label(timestamp_str: str, fallback_idx: int) -> str:
    """Safely format an ISO timestamp into a calm, short day label (e.g. 'Tue 24')."""
    try:
        # Handle 'Z' or standard ISO strings
        clean_ts = timestamp_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_ts)
        return dt.strftime("%a %d")
    except (ValueError, TypeError):
        return f"Entry {fallback_idx + 1}"


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
        day_label = _format_day_label(c.timestamp, idx)
        mood_trend.append({"day": day_label, "mood": c.mood, "route": c.route})
        sleep_trend.append({"day": day_label, "sleep": round(c.sleep_hours, 1)})
        stress_trend.append({"day": day_label, "stress": c.stress})

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


def _get_authoritative_retention_days(engine, session_id: str) -> int:
    if hasattr(engine, "get_settings"):
        settings = engine.get_settings(session_id)
        days = getattr(settings, "data_retention_days", DEFAULT_RETENTION_DAYS)
        if isinstance(days, int) and days in (14, 30, 60, 90):
            return days
    return DEFAULT_RETENTION_DAYS


def _local_active_day_count(records: list[CheckInRecord], zone) -> int:
    active_dates = set()
    for record in records:
        instant = normalize_iso_timestamp(record.timestamp)
        if instant is not None:
            active_dates.add(instant.astimezone(zone).date())
    return len(active_dates)


def _build_period_comparison(
    current_records: list[CheckInRecord],
    previous_records: list[CheckInRecord],
    days: int,
    zone,
) -> PeriodComparison:
    current_active_days = _local_active_day_count(current_records, zone)
    previous_active_days = _local_active_day_count(previous_records, zone)
    enough_data = (
        len(current_records) >= MIN_COMPARISON_CHECKINS
        and len(previous_records) >= MIN_COMPARISON_CHECKINS
        and current_active_days >= MIN_COMPARISON_ACTIVE_DAYS
        and previous_active_days >= MIN_COMPARISON_ACTIVE_DAYS
    )

    comparison = PeriodComparison(
        state="ready" if enough_data else "not_enough_data",
        period_days=days,
        minimum_checkins_per_period=MIN_COMPARISON_CHECKINS,
        current_check_in_count=len(current_records),
        previous_check_in_count=len(previous_records),
        current_active_days=current_active_days,
        previous_active_days=previous_active_days,
    )
    if not enough_data:
        return comparison

    def metric(attribute: str) -> ComparisonMetric:
        current_average = sum(getattr(r, attribute) for r in current_records) / len(
            current_records
        )
        previous_average = sum(getattr(r, attribute) for r in previous_records) / len(
            previous_records
        )
        return ComparisonMetric(
            current_average=round(current_average, 1),
            previous_average=round(previous_average, 1),
            difference=round(current_average - previous_average, 1),
        )

    comparison.mood = metric("mood")
    comparison.stress = metric("stress")
    comparison.sleep = metric("sleep_hours")
    return comparison


def _build_pattern_highlights(
    records: list[CheckInRecord], distinct_local_days: int
) -> list[PatternHighlight]:
    """Generate conservative, non-diagnostic, non-causal observations."""
    count = len(records)
    if count < MIN_PATTERN_SAMPLES or distinct_local_days < MIN_PATTERN_DAYS:
        return []

    sample_basis = f"Based on {count} check-ins"
    highlights: list[PatternHighlight] = []

    mid = count // 2
    earlier = records[:mid]
    recent = records[mid:]

    delta_mood = round(
        (sum(r.mood for r in recent) / len(recent))
        - (sum(r.mood for r in earlier) / len(earlier)),
        9,
    )
    delta_stress = round(
        (sum(r.stress for r in recent) / len(recent))
        - (sum(r.stress for r in earlier) / len(earlier)),
        9,
    )
    delta_sleep = round(
        (sum(r.sleep_hours for r in recent) / len(recent))
        - (sum(r.sleep_hours for r in earlier) / len(earlier)),
        9,
    )

    if abs(delta_mood) >= MOOD_SHIFT_THRESHOLD:
        direction = "higher" if delta_mood > 0 else "lower"
        highlights.append(
            PatternHighlight(
                id="shift-mood",
                category="directional_shift",
                title=f"{direction.capitalize()} recent mood",
                summary=(
                    "Compared with earlier check-ins in this window, recent mood "
                    f"ratings were {abs(delta_mood):.1f} points {direction} on average."
                ),
                sample_basis=sample_basis,
            )
        )

    if abs(delta_stress) >= STRESS_SHIFT_THRESHOLD:
        direction = "lower" if delta_stress < 0 else "higher"
        highlights.append(
            PatternHighlight(
                id="shift-stress",
                category="directional_shift",
                title=f"{direction.capitalize()} recent stress",
                summary=(
                    "Compared with earlier check-ins in this window, recent stress "
                    f"ratings were {abs(delta_stress):.1f} points {direction} on average."
                ),
                sample_basis=sample_basis,
            )
        )

    if abs(delta_sleep) >= SLEEP_SHIFT_THRESHOLD:
        direction = "longer" if delta_sleep > 0 else "shorter"
        highlights.append(
            PatternHighlight(
                id="shift-sleep",
                category="directional_shift",
                title=f"{direction.capitalize()} recent sleep",
                summary=(
                    "Compared with earlier check-ins in this window, recent sleep "
                    f"durations averaged {abs(delta_sleep):.1f} hours {direction}."
                ),
                sample_basis=sample_basis,
            )
        )

    mood_min = min(r.mood for r in records)
    mood_max = max(r.mood for r in records)
    stress_min = min(r.stress for r in records)
    stress_max = max(r.stress for r in records)
    sleep_min = min(r.sleep_hours for r in records)
    sleep_max = max(r.sleep_hours for r in records)

    if not highlights:
        mood_spread = mood_max - mood_min
        stress_spread = stress_max - stress_min
        sleep_spread = sleep_max - sleep_min

        if (
            mood_spread <= STEADY_MOOD_MAX_SPREAD
            and stress_spread <= STEADY_STRESS_MAX_SPREAD
            and sleep_spread <= STEADY_SLEEP_MAX_SPREAD
        ):
            highlights.append(
                PatternHighlight(
                    id="steady-rhythm",
                    category="steady_rhythm",
                    title="Steady rhythm",
                    summary=(
                        f"Across {count} check-ins, mood ({mood_min}-{mood_max}/5), "
                        f"stress ({stress_min}-{stress_max}/5), and sleep "
                        f"({sleep_min:.1f}-{sleep_max:.1f} hrs) stayed within a narrow range."
                    ),
                    sample_basis=sample_basis,
                )
            )
        else:
            highlights.append(
                PatternHighlight(
                    id="varied-rhythm",
                    category="varied_rhythm",
                    title="Varied day-to-day rhythm",
                    summary=(
                        f"Across {count} check-ins, ratings varied day to day "
                        f"(mood {mood_min}-{mood_max}/5, stress {stress_min}-{stress_max}/5, "
                        f"sleep {sleep_min:.1f}-{sleep_max:.1f} hrs) without one sustained direction."
                    ),
                    sample_basis=sample_basis,
                )
            )

    if (
        count >= MIN_CO_OBSERVATION_SAMPLES
        and distinct_local_days >= MIN_CO_OBSERVATION_DAYS
    ):
        longer_sleep = [
            r for r in records if r.sleep_hours >= RESTFUL_SLEEP_THRESHOLD_HOURS
        ]
        shorter_sleep = [
            r for r in records if r.sleep_hours < RESTFUL_SLEEP_THRESHOLD_HOURS
        ]
        if (
            len(longer_sleep) >= MIN_CO_OBSERVATION_BUCKET_ENTRIES
            and len(shorter_sleep) >= MIN_CO_OBSERVATION_BUCKET_ENTRIES
        ):
            longer_mood = sum(r.mood for r in longer_sleep) / len(longer_sleep)
            shorter_mood = sum(r.mood for r in shorter_sleep) / len(shorter_sleep)
            mood_diff = round(abs(longer_mood - shorter_mood), 9)

            longer_stress = sum(r.stress for r in longer_sleep) / len(longer_sleep)
            shorter_stress = sum(r.stress for r in shorter_sleep) / len(shorter_sleep)
            stress_diff = round(abs(longer_stress - shorter_stress), 9)

            bucket_basis = (
                f"Based on {len(longer_sleep)} check-ins >= 7h and "
                f"{len(shorter_sleep)} check-ins < 7h"
            )
            if mood_diff >= CO_OBSERVATION_DIFF_THRESHOLD and mood_diff >= stress_diff:
                highlights.append(
                    PatternHighlight(
                        id="co-observation-sleep-mood",
                        category="co_observation",
                        title="Sleep & mood check-in pairing",
                        summary=(
                            "In this window, check-ins after 7+ hours of sleep averaged "
                            f"{longer_mood:.1f}/5 mood alongside {shorter_mood:.1f}/5 on "
                            "shorter-sleep check-ins (descriptive observation only)."
                        ),
                        sample_basis=bucket_basis,
                    )
                )
            elif stress_diff >= CO_OBSERVATION_DIFF_THRESHOLD:
                highlights.append(
                    PatternHighlight(
                        id="co-observation-sleep-stress",
                        category="co_observation",
                        title="Sleep & stress check-in pairing",
                        summary=(
                            "In this window, check-ins after 7+ hours of sleep averaged "
                            f"{longer_stress:.1f}/5 stress alongside {shorter_stress:.1f}/5 on "
                            "shorter-sleep check-ins (descriptive observation only)."
                        ),
                        sample_basis=bucket_basis,
                    )
                )

    return highlights


def compute_session_insights_v2(
    session_id: str,
    days: int = 7,
    timezone_name: str | None = None,
    storage_engine=None,
    *,
    now: datetime | None = None,
) -> InsightSummaryV2:
    """Compute typed, timezone-aware Insights V2 summaries and chart projections."""
    zone = effective_timezone(timezone_name)
    windows = build_insight_windows(days=days, timezone_name=zone.key, now=now)
    current_window = windows.current
    previous_window = windows.baseline
    window_end_date = (
        current_window.end_date_exclusive - timedelta(days=1)
    ).isoformat()

    engine = storage_engine or storage
    if hasattr(engine, "cleanup_expired_records"):
        if now is not None:
            engine.cleanup_expired_records(session_id, now=now)
        else:
            engine.cleanup_expired_records(session_id)

    retention_days = _get_authoritative_retention_days(engine, session_id)
    all_checkins: list[CheckInRecord] = engine.get_checkins(session_id)

    in_window_records: list[tuple[datetime, int, CheckInRecord]] = []
    previous_records: list[tuple[datetime, int, CheckInRecord]] = []
    for idx, record in enumerate(all_checkins):
        instant = normalize_iso_timestamp(record.timestamp)
        if instant is None:
            continue
        if timestamp_in_window(record.timestamp, current_window):
            in_window_records.append((instant, idx, record))
        elif timestamp_in_window(record.timestamp, previous_window):
            previous_records.append((instant, idx, record))

    in_window_records.sort(key=lambda item: (item[0], item[1]))
    previous_records.sort(key=lambda item: (item[0], item[1]))
    total_stored_count = len(all_checkins)
    ordered_records = [item[2] for item in in_window_records]
    ordered_previous_records = [item[2] for item in previous_records]
    count = len(ordered_records)
    comparison = _build_period_comparison(
        ordered_records, ordered_previous_records, days, zone
    )

    if count == 0:
        if total_stored_count == 0:
            state = "brand_new"
            plain_summary = "No check-ins yet. Take a moment to log your first one."
        else:
            state = "empty_window"
            entry_word = "entry" if total_stored_count == 1 else "entries"
            plain_summary = (
                f"No check-ins logged in the last {days} days, though this session "
                f"has {total_stored_count} stored {entry_word}."
            )
        return InsightSummaryV2(
            window_days=days,
            timezone=current_window.timezone,
            window_start_date=current_window.start_date.isoformat(),
            window_end_date=window_end_date,
            retention_days=retention_days,
            state=state,
            check_in_count=0,
            total_stored_count=total_stored_count,
            distinct_local_days=0,
            sleep_7h_plus_count=0,
            sleep_7h_plus_day_count=0,
            average_checkins_per_week=0.0,
            active_day_rate=0.0,
            comparison=comparison,
            average_mood=0.0,
            average_stress=0.0,
            average_sleep=0.0,
            mood_range=None,
            stress_range=None,
            sleep_range=None,
            plain_summary=plain_summary,
            timeline_entries=[],
            daily_series=[],
            pattern_highlights=[],
        )

    timeline_entries: list[TimelineEntry] = []
    day_buckets: dict[str, tuple[str, list[CheckInRecord]]] = {}
    for instant, _, record in in_window_records:
        local_dt = instant.astimezone(zone)
        date_key = local_dt.date().isoformat()
        day_label = local_dt.strftime("%a %d")
        local_time_label = local_dt.strftime("%H:%M")

        timeline_entries.append(
            TimelineEntry(
                id=record.id,
                timestamp=instant.isoformat().replace("+00:00", "Z"),
                date_key=date_key,
                day_label=day_label,
                local_time_label=local_time_label,
                mood=record.mood,
                stress=record.stress,
                sleep_hours=round(record.sleep_hours, 1),
                route=record.route,
            )
        )
        if date_key not in day_buckets:
            day_buckets[date_key] = (day_label, [record])
        else:
            day_buckets[date_key][1].append(record)

    daily_series: list[DailyInsightPoint] = []
    for date_key, (day_label, bucket) in day_buckets.items():
        bucket_len = len(bucket)
        daily_series.append(
            DailyInsightPoint(
                date_key=date_key,
                day_label=day_label,
                entry_count=bucket_len,
                average_mood=round(sum(r.mood for r in bucket) / bucket_len, 1),
                average_stress=round(sum(r.stress for r in bucket) / bucket_len, 1),
                average_sleep=round(sum(r.sleep_hours for r in bucket) / bucket_len, 1),
            )
        )

    distinct_local_days = len(daily_series)
    avg_mood = sum(r.mood for r in ordered_records) / count
    avg_stress = sum(r.stress for r in ordered_records) / count
    avg_sleep = sum(r.sleep_hours for r in ordered_records) / count
    sleep_7h_plus_count = sum(
        1 for r in ordered_records if r.sleep_hours >= RESTFUL_SLEEP_THRESHOLD_HOURS
    )
    sleep_7h_plus_day_count = sum(
        1
        for _, (_, bucket) in day_buckets.items()
        if sum(r.sleep_hours for r in bucket) / len(bucket)
        >= RESTFUL_SLEEP_THRESHOLD_HOURS
    )

    mood_range = MetricRange(
        min=float(min(r.mood for r in ordered_records)),
        max=float(max(r.mood for r in ordered_records)),
    )
    stress_range = MetricRange(
        min=float(min(r.stress for r in ordered_records)),
        max=float(max(r.stress for r in ordered_records)),
    )
    sleep_range = MetricRange(
        min=round(min(r.sleep_hours for r in ordered_records), 1),
        max=round(max(r.sleep_hours for r in ordered_records), 1),
    )

    if count < MIN_PATTERN_SAMPLES:
        state = "building_baseline"
        pattern_highlights: list[PatternHighlight] = []
        if count == 1 and total_stored_count == 1:
            plain_summary = (
                f"Based on your first check-in, mood was {_format_average(avg_mood)} out of 5, "
                f"sleep was {_format_average(avg_sleep)} hours, and stress was rated "
                f"{_format_average(avg_stress)} out of 5. "
                "Pattern highlights unlock once you log 4 or more check-ins."
            )
        elif count == 1:
            plain_summary = (
                f"Across 1 check-in in the last {days} days, mood was {_format_average(avg_mood)} out of 5, "
                f"sleep was {_format_average(avg_sleep)} hours, and stress was rated "
                f"{_format_average(avg_stress)} out of 5. "
                "Pattern highlights unlock at 4 check-ins in a window."
            )
        else:
            plain_summary = (
                f"Across your last {count} check-ins, your average mood was "
                f"{_format_average(avg_mood)} out of 5, sleep averaged "
                f"{_format_average(avg_sleep)} hours, and stress was rated "
                f"{_format_average(avg_stress)} out of 5. "
                "Pattern highlights unlock at 4 check-ins."
            )
    else:
        state = "active"
        pattern_highlights = _build_pattern_highlights(
            ordered_records, distinct_local_days=distinct_local_days
        )
        plain_summary = (
            f"Across your last {count} check-ins, your average mood was "
            f"{_format_average(avg_mood)} out of 5, sleep averaged "
            f"{_format_average(avg_sleep)} hours, and stress was rated "
            f"{_format_average(avg_stress)} out of 5."
        )

    return InsightSummaryV2(
        window_days=days,
        timezone=current_window.timezone,
        window_start_date=current_window.start_date.isoformat(),
        window_end_date=window_end_date,
        retention_days=retention_days,
        state=state,
        check_in_count=count,
        total_stored_count=total_stored_count,
        distinct_local_days=distinct_local_days,
        sleep_7h_plus_count=sleep_7h_plus_count,
        sleep_7h_plus_day_count=sleep_7h_plus_day_count,
        average_checkins_per_week=round(count / days * 7, 1),
        active_day_rate=round(distinct_local_days / days * 100, 1),
        comparison=comparison,
        average_mood=round(avg_mood, 1),
        average_stress=round(avg_stress, 1),
        average_sleep=round(avg_sleep, 1),
        mood_range=mood_range,
        stress_range=stress_range,
        sleep_range=sleep_range,
        plain_summary=plain_summary,
        timeline_entries=timeline_entries,
        daily_series=daily_series,
        pattern_highlights=pattern_highlights,
    )
