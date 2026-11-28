"""
Calmspace Safety & Support Models and Schemas
Strictly typed for privacy and safety integrity.
"""

from typing import Literal

from pydantic import BaseModel, Field, StrictBool, field_validator

RiskRoute = Literal["LOW", "MEDIUM", "HIGH"]
InsightWindowState = Literal[
    "brand_new",
    "empty_window",
    "building_baseline",
    "active",
]
PatternCategory = Literal[
    "steady_rhythm",
    "directional_shift",
    "co_observation",
    "varied_rhythm",
]
ComparisonState = Literal["ready", "not_enough_data"]


class SessionCreateResponse(BaseModel):
    session_id: str
    session_secret: str
    expires_at: str
    token_type: Literal["Bearer"] = "Bearer"


class SessionRevokeResponse(BaseModel):
    status: str
    message: str


class CheckInRequest(BaseModel):
    mood: int = Field(
        ..., ge=1, le=5, description="1: Very low, 2: Low, 3: Okay, 4: Good, 5: Great"
    )
    stress: int = Field(
        ...,
        ge=1,
        le=5,
        description="1: Very low, 2: Low, 3: Moderate, 4: High, 5: Very high",
    )
    sleep_hours: float = Field(
        ..., ge=0.0, le=24.0, description="Sleep duration in hours"
    )
    reflection: str | None = Field(
        None, max_length=2000, description="Optional personal reflection"
    )
    consent_ai_processing: StrictBool = Field(
        False, description="Explicit consent if reflection is evaluated for guidance"
    )


class RuleTrigger(BaseModel):
    rule_id: str
    name: str
    points: int
    rationale: str


class SafetyEvaluation(BaseModel):
    route: RiskRoute
    level: RiskRoute | None = None  # Alias for route per Issue #2
    score: int = 0
    crisis_flag: bool = False
    triggered_rules: list[RuleTrigger] = []
    status_label: str
    status_summary: str
    requires_human_escalation: bool
    ai_eligible: bool
    reasons: list[str]


class SupportiveGuidance(BaseModel):
    message: str
    suggestion_chips: list[str]
    disclaimer: str = "This is supportive guidance, not medical advice."
    generated_by_ai: bool
    fallback_used: bool


class SupportContact(BaseModel):
    id: str
    name: str
    category: Literal["campus", "helpline", "emergency"]
    description: str
    contact_number: str
    display_phone: str
    email: str | None = None
    hours: str
    is_urgent: bool = False
    verification_source: str
    official_source_url: str | None = None
    last_verified_date: str
    badge_label: str
    is_demo_placeholder: bool = False
    placeholder_note: str | None = None
    is_active: bool = True


class CheckInRecord(BaseModel):
    id: str
    session_id: str
    timestamp: str
    mood: int
    stress: int
    sleep_hours: float
    route: RiskRoute
    # Notice: reflection is NEVER stored here to protect student privacy!


class CheckInResponse(BaseModel):
    record: CheckInRecord
    safety: SafetyEvaluation
    guidance: SupportiveGuidance | None = None
    support_contacts: list[SupportContact]


class InsightSummary(BaseModel):
    average_mood: float
    average_stress: float
    average_sleep: float
    check_in_count: int
    plain_summary: str
    mood_trend: list[dict]
    sleep_trend: list[dict]
    stress_trend: list[dict]


class TimelineEntry(BaseModel):
    """Individual check-in record projected into the caller's local calendar."""

    id: str
    timestamp: str
    date_key: str
    day_label: str
    local_time_label: str
    mood: int
    stress: int
    sleep_hours: float
    route: RiskRoute


class DailyInsightPoint(BaseModel):
    """Deterministic daily chart point aggregated strictly for presentation."""

    date_key: str
    day_label: str
    entry_count: int
    average_mood: float
    average_stress: float
    average_sleep: float


class MetricRange(BaseModel):
    """Inclusive minimum and maximum observed within the active window."""

    min: float
    max: float


class PatternHighlight(BaseModel):
    """Conservative, non-diagnostic, non-causal descriptive observation."""

    id: str
    category: PatternCategory
    title: str
    summary: str
    sample_basis: str


class ComparisonMetric(BaseModel):
    current_average: float
    previous_average: float
    difference: float


class PeriodComparison(BaseModel):
    state: ComparisonState
    period_days: int
    minimum_checkins_per_period: int
    current_check_in_count: int
    previous_check_in_count: int
    current_active_days: int
    previous_active_days: int
    mood: ComparisonMetric | None = None
    stress: ComparisonMetric | None = None
    sleep: ComparisonMetric | None = None


class InsightSummaryV2(BaseModel):
    """Typed Insights V2 response keeping individual records as source of truth."""

    window_days: int
    timezone: str
    window_start_date: str
    window_end_date: str
    retention_days: int
    state: InsightWindowState
    check_in_count: int
    total_stored_count: int
    distinct_local_days: int
    sleep_7h_plus_count: int
    sleep_7h_plus_day_count: int
    average_checkins_per_week: float
    active_day_rate: float
    comparison: PeriodComparison
    average_mood: float
    average_stress: float
    average_sleep: float
    mood_range: MetricRange | None = None
    stress_range: MetricRange | None = None
    sleep_range: MetricRange | None = None
    plain_summary: str
    timeline_entries: list[TimelineEntry]
    daily_series: list[DailyInsightPoint]
    pattern_highlights: list[PatternHighlight]


class StudyTask(BaseModel):
    id: str
    title: str
    estimated_minutes: int
    category: str  # "Study", "Reading", "Revision", "Project"
    completed: bool = False
    created_at: str


class StudyTaskCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=120)
    estimated_minutes: int = Field(25, ge=5, le=240)
    category: str = "Study"

    @field_validator("title")
    @classmethod
    def validate_non_blank_title(cls, v: str) -> str:
        stripped = v.strip()
        if len(stripped) < 2:
            raise ValueError("Task title must contain at least 2 non-space characters.")
        return stripped


class StudyTaskUpdate(BaseModel):
    title: str | None = Field(None, min_length=2, max_length=120)
    estimated_minutes: int | None = Field(None, ge=5, le=240)
    category: str | None = None

    @field_validator("title")
    @classmethod
    def validate_optional_non_blank_title(cls, v: str | None) -> str | None:
        if v is None:
            return None
        stripped = v.strip()
        if len(stripped) < 2:
            raise ValueError("Task title must contain at least 2 non-space characters.")
        return stripped


class UserSettings(BaseModel):
    nickname: str = Field("Student", min_length=1, max_length=60)
    break_reminders_enabled: bool = True
    reminder_interval_minutes: int = Field(45, ge=5, le=240)
    share_anonymous_analytics: bool = False
    data_retention_days: int = 30

    @field_validator("nickname")
    @classmethod
    def validate_non_blank_nickname(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Nickname cannot be empty or whitespace only.")
        return stripped

    @field_validator("data_retention_days", mode="before")
    @classmethod
    def validate_retention_days(cls, v: int | None) -> int:
        try:
            val = int(v)  # type: ignore[arg-type]
            if val not in (14, 30, 60, 90):
                return 30
            return val
        except (ValueError, TypeError):
            return 30
