"""
Typed Schemas for Calm — Agentic AI Voice Wellbeing Companion
Strictly enforces input bounds, StrictBool consent, and structured tool payloads.
"""

from typing import Any, Literal

from pydantic import BaseModel, Field, StrictBool, field_validator

from app.models.schemas import SafetyEvaluation, SupportContact

BlobVisualState = Literal[
    "idle",
    "listening",
    "thinking",
    "speaking",
    "breathing",
    "support",
    "error",
]

AllowedToolName = Literal[
    "start_checkin",
    "commit_checkin",
    "start_breathing",
    "create_reminder",
    "get_wellbeing_insights",
    "generate_study_plan",
    "save_study_plan",
    "get_support_resources",
    "activate_crisis_support",
    "save_companion_preference",
]


class ReminderRecord(BaseModel):
    id: str
    session_id: str
    title: str
    category: Literal["break", "study", "hydration", "wellbeing"]
    delay_minutes: int
    remind_at: str
    active: bool = True
    created_at: str


class ReminderCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=120)
    category: Literal["break", "study", "hydration", "wellbeing"] = "break"
    delay_minutes: int = Field(25, ge=1, le=240)

    @field_validator("title")
    @classmethod
    def validate_non_blank_title(cls, v: str) -> str:
        stripped = v.strip()
        if len(stripped) < 2:
            raise ValueError(
                "Reminder title must contain at least 2 non-space characters."
            )
        return stripped


class ReminderSnoozeRequest(BaseModel):
    minutes: int = Field(10, ge=1, le=120)


class CompanionPreferences(BaseModel):
    study_goal: str | None = Field(None, max_length=200)
    preferred_study_block_minutes: int = Field(25, ge=10, le=90)
    preferred_break_minutes: int = Field(5, ge=3, le=30)
    preferred_tone: Literal["warm", "concise"] = "warm"

    @field_validator("study_goal")
    @classmethod
    def normalize_study_goal(cls, v: str | None) -> str | None:
        if v is None:
            return None
        stripped = v.strip()
        return stripped or None


class ToolExecutionRecord(BaseModel):
    tool_name: str
    status: Literal[
        "executed",
        "needs_info",
        "awaiting_confirmation",
        "rejected",
        "failed",
    ]
    summary: str
    data: dict[str, Any] = {}


class PendingConfirmation(BaseModel):
    action_id: str
    tool_name: str
    title: str
    description: str
    args: dict[str, Any]


class CompanionActionCard(BaseModel):
    card_type: Literal[
        "study_plan",
        "insights",
        "breathing",
        "checkin_prompt",
        "checkin_saved",
        "reminder",
        "support_resources",
        "crisis_support",
        "preference_saved",
    ]
    title: str
    data: dict[str, Any]


class CompanionTurnRequest(BaseModel):
    conversation_id: str | None = Field(
        None, min_length=6, max_length=64, pattern=r"^[A-Za-z0-9_-]{6,64}$"
    )
    message: str = Field(..., min_length=1, max_length=2000)
    consent_ai_processing: StrictBool = Field(
        False,
        description="Explicit consent for AI conversational processing of this session message",
    )
    input_mode: Literal["voice", "text"] = "voice"

    @field_validator("message")
    @classmethod
    def validate_non_blank_message(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Message cannot be empty or whitespace only.")
        return stripped


class CompanionConfirmRequest(BaseModel):
    conversation_id: str = Field(
        ..., min_length=6, max_length=64, pattern=r"^[A-Za-z0-9_-]{6,64}$"
    )
    action_id: str = Field(
        ..., min_length=6, max_length=64, pattern=r"^[A-Za-z0-9_-]{6,64}$"
    )
    approved: StrictBool


class CompanionTurnResponse(BaseModel):
    conversation_id: str
    reply: str
    blob_state: BlobVisualState
    safety: SafetyEvaluation
    follow_up_prompts: list[str] = []
    tool_calls: list[ToolExecutionRecord] = []
    pending_confirmation: PendingConfirmation | None = None
    action_cards: list[CompanionActionCard] = []
    support_contacts: list[SupportContact] = []
    generated_by_ai: bool = False
    fallback_used: bool = False
    ai_provider: str = "mock"
    disclaimer: str = "Calm is an AI wellbeing companion, not a human, therapist, or medical professional."


class CompanionStartResponse(BaseModel):
    conversation_id: str
    greeting: str
    blob_state: BlobVisualState = "idle"
    follow_up_prompts: list[str] = []
    ai_provider: str = "mock"
    reminders: list[ReminderRecord] = []
    preferences: CompanionPreferences = CompanionPreferences()
    disclaimer: str = "Calm is an AI wellbeing companion, not a human, therapist, or medical professional."
