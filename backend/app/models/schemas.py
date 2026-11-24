"""
Calmspace Safety & Support Models and Schemas
Strictly typed for privacy and safety integrity.
"""
from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from datetime import datetime

RiskRoute = Literal["LOW", "MEDIUM", "HIGH"]

class CheckInRequest(BaseModel):
    mood: int = Field(..., ge=1, le=5, description="1: Very low, 2: Low, 3: Okay, 4: Good, 5: Great")
    stress: int = Field(..., ge=1, le=5, description="1: Very low, 2: Low, 3: Moderate, 4: High, 5: Very high")
    sleep_hours: float = Field(..., ge=0.0, le=24.0, description="Sleep duration in hours")
    reflection: Optional[str] = Field(None, max_length=1500, description="Optional personal reflection")
    consent_ai_processing: bool = Field(False, description="Explicit consent if reflection is evaluated for guidance")

class RuleTrigger(BaseModel):
    rule_id: str
    name: str
    points: int
    rationale: str

class SafetyEvaluation(BaseModel):
    route: RiskRoute
    level: Optional[RiskRoute] = None  # Alias for route per Issue #2
    score: int = 0
    crisis_flag: bool = False
    triggered_rules: List[RuleTrigger] = []
    status_label: str
    status_summary: str
    requires_human_escalation: bool
    ai_eligible: bool
    reasons: List[str]

class SupportiveGuidance(BaseModel):
    message: str
    suggestion_chips: List[str]
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
    email: Optional[str] = None
    hours: str
    is_urgent: bool = False
    verification_source: str
    last_verified_date: str
    badge_label: str

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
    guidance: Optional[SupportiveGuidance] = None
    support_contacts: List[SupportContact]

class InsightSummary(BaseModel):
    average_mood: float
    average_stress: float
    average_sleep: float
    check_in_count: int
    plain_summary: str
    mood_trend: List[dict]
    sleep_trend: List[dict]
    stress_trend: List[dict]

class StudyTask(BaseModel):
    id: str
    title: str
    estimated_minutes: int
    category: str # "Study", "Reading", "Revision", "Project"
    completed: bool = False
    created_at: str

class StudyTaskCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=120)
    estimated_minutes: int = Field(25, ge=5, le=240)
    category: str = "Study"

class UserSettings(BaseModel):
    nickname: str = "Student"
    break_reminders_enabled: bool = True
    reminder_interval_minutes: int = 45
    share_anonymous_analytics: bool = False
    data_retention_days: int = 30
