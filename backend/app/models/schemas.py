"""
Calmspace Safety & Support Models and Schemas
Strictly typed for privacy and safety integrity.
"""

from typing import Literal

from pydantic import BaseModel, Field, StrictBool, field_validator

RiskRoute = Literal["LOW", "MEDIUM", "HIGH"]


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


class StudyTaskUpdate(BaseModel):
    title: str | None = Field(None, min_length=2, max_length=120)
    estimated_minutes: int | None = Field(None, ge=5, le=240)
    category: str | None = None


class UserSettings(BaseModel):
    nickname: str = "Student"
    break_reminders_enabled: bool = True
    reminder_interval_minutes: int = 45
    share_anonymous_analytics: bool = False
    data_retention_days: int = 30

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
