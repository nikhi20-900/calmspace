"""Timezone-aware date windows for privacy-scoped insight calculations.

These helpers are intentionally independent of the existing V1 analytics path.
They calculate exact calendar windows and normalize timestamps without changing
stored records or deciding which session owns a record.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


@dataclass(frozen=True)
class DateWindow:
    """A local-date range represented as UTC half-open instant bounds."""

    timezone: str
    start_date: date
    end_date_exclusive: date
    start_utc: datetime
    end_utc: datetime

    @property
    def days(self) -> int:
        """Number of local calendar dates covered by the window."""
        return (self.end_date_exclusive - self.start_date).days


@dataclass(frozen=True)
class InsightWindows:
    """Current and immediately preceding, equal-length insight windows."""

    current: DateWindow
    baseline: DateWindow


def effective_timezone(timezone_name: str | None) -> ZoneInfo:
    """Resolve an IANA timezone, falling back to UTC for absent or invalid input."""
    if not timezone_name:
        return ZoneInfo("UTC")

    try:
        return ZoneInfo(timezone_name)
    except (TypeError, ValueError, ZoneInfoNotFoundError):
        return ZoneInfo("UTC")


def _local_midnight_utc(day: date, timezone: ZoneInfo) -> datetime:
    """Convert a local calendar boundary to an aware UTC instant."""
    return datetime.combine(day, time.min, tzinfo=timezone).astimezone(UTC)


def _date_window(
    timezone: ZoneInfo, start_date: date, end_date_exclusive: date
) -> DateWindow:
    return DateWindow(
        timezone=timezone.key,
        start_date=start_date,
        end_date_exclusive=end_date_exclusive,
        start_utc=_local_midnight_utc(start_date, timezone),
        end_utc=_local_midnight_utc(end_date_exclusive, timezone),
    )


def build_insight_windows(
    days: int,
    timezone_name: str | None = None,
    *,
    now: datetime | None = None,
) -> InsightWindows:
    """Build adjacent current and baseline windows of local calendar dates.

    The current window includes the local date containing ``now``. Its bounds
    and the baseline bounds are converted independently from local midnight,
    so DST changes can make a window's elapsed UTC duration differ from N days.
    """
    if isinstance(days, bool) or not isinstance(days, int) or not 1 <= days <= 90:
        raise ValueError("days must be an integer between 1 and 90")

    zone = effective_timezone(timezone_name)
    instant = now or datetime.now(UTC)
    if instant.tzinfo is None or instant.utcoffset() is None:
        instant = instant.replace(tzinfo=UTC)

    local_today = instant.astimezone(zone).date()
    current_start = local_today - timedelta(days=days - 1)
    current_end = local_today + timedelta(days=1)
    baseline_start = current_start - timedelta(days=days)

    return InsightWindows(
        current=_date_window(zone, current_start, current_end),
        baseline=_date_window(zone, baseline_start, current_start),
    )


def normalize_iso_timestamp(timestamp: str | None) -> datetime | None:
    """Parse an ISO timestamp as a UTC-aware instant.

    Explicit offsets are honored, legacy naive timestamps are treated as UTC,
    and malformed values return ``None`` so callers can exclude them.
    """
    if not isinstance(timestamp, str):
        return None

    value = timestamp.strip()
    if not value:
        return None
    if value.endswith(("Z", "z")):
        value = f"{value[:-1]}+00:00"

    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None

    if parsed.tzinfo is None or parsed.utcoffset() is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def timestamp_in_window(timestamp: str | None, window: DateWindow) -> bool:
    """Return whether an ISO timestamp falls in ``[start_utc, end_utc)``."""
    instant = normalize_iso_timestamp(timestamp)
    return instant is not None and window.start_utc <= instant < window.end_utc
