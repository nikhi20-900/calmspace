"""
Allowlisted Agentic Tools for Calm
Enforces:
1. Strict allowlist of typed tools with Pydantic validation.
2. Session ownership on every data read/write.
3. Explicit user confirmation gate before saving sensitive data or persistent actions.
4. Execution strictly via existing Calmspace services (safety_evaluator, analytics, storage, support_directory).
5. Honest error reporting — never claims success when execution fails.
"""

import logging
import uuid
from dataclasses import dataclass
from typing import Any, Literal

from pydantic import BaseModel, Field, ValidationError, field_validator

from app.models.companion_schemas import (
    CompanionActionCard,
    CompanionPreferences,
    PendingConfirmation,
    ToolExecutionRecord,
)
from app.services.analytics import compute_session_insights
from app.services.safety_evaluator import evaluate_wellbeing_route
from app.services.storage import storage
from app.services.support_directory import get_support_directory, get_urgent_contacts

logger = logging.getLogger("calmspace.companion_tools")


# ============================================================================
# TYPED TOOL INPUT SCHEMAS
# ============================================================================


class StartCheckinArgs(BaseModel):
    mood: int | None = Field(None, ge=1, le=5)
    stress: int | None = Field(None, ge=1, le=5)
    sleep_hours: float | None = Field(None, ge=0.0, le=24.0)


class CommitCheckinArgs(BaseModel):
    mood: int = Field(..., ge=1, le=5)
    stress: int = Field(..., ge=1, le=5)
    sleep_hours: float = Field(..., ge=0.0, le=24.0)


class StartBreathingArgs(BaseModel):
    pattern: Literal["calm_4_4", "box", "4-7-8"] = "calm_4_4"
    duration_minutes: int = Field(2, ge=1, le=10)


class CreateReminderArgs(BaseModel):
    title: str = Field(..., min_length=2, max_length=120)
    delay_minutes: int = Field(25, ge=1, le=240)
    category: Literal["break", "study", "hydration", "wellbeing"] = "break"

    @field_validator("title")
    @classmethod
    def clean_title(cls, v: str) -> str:
        stripped = v.strip()
        if len(stripped) < 2:
            raise ValueError(
                "Reminder title must have at least 2 non-space characters."
            )
        return stripped


class GetWellbeingInsightsArgs(BaseModel):
    days: int = Field(7, ge=1, le=90)


class GenerateStudyPlanArgs(BaseModel):
    subjects: list[str] = Field(default_factory=list, max_length=8)
    exam_timeline: str | None = Field(None, max_length=120)
    daily_hours: float = Field(2.5, ge=0.5, le=10.0)
    save_to_planner: bool = False

    @field_validator("subjects")
    @classmethod
    def clean_subjects(cls, v: list[str]) -> list[str]:
        cleaned = [s.strip() for s in v if isinstance(s, str) and s.strip()]
        return cleaned[:8]


class StudyPlanBlockInput(BaseModel):
    title: str = Field(..., min_length=2, max_length=120)
    estimated_minutes: int = Field(25, ge=5, le=240)
    category: str = Field("Study", min_length=2, max_length=40)


class SaveStudyPlanArgs(BaseModel):
    blocks: list[StudyPlanBlockInput] = Field(..., min_length=1, max_length=12)


class GetSupportResourcesArgs(BaseModel):
    category: Literal["all", "campus", "helpline", "emergency"] = "all"


class ActivateCrisisSupportArgs(BaseModel):
    reason: str | None = Field(None, max_length=200)


class SaveCompanionPreferenceArgs(BaseModel):
    study_goal: str | None = Field(None, max_length=200)
    preferred_study_block_minutes: int = Field(25, ge=10, le=90)
    preferred_break_minutes: int = Field(5, ge=3, le=30)
    preferred_tone: Literal["warm", "concise"] = "warm"


# ============================================================================
# TOOL METADATA & GEMINI FUNCTION DECLARATIONS
# ============================================================================


@dataclass(frozen=True)
class ToolSpec:
    name: str
    schema: type[BaseModel]
    requires_confirmation: bool


ALLOWED_TOOLS: dict[str, ToolSpec] = {
    "start_checkin": ToolSpec("start_checkin", StartCheckinArgs, False),
    "commit_checkin": ToolSpec("commit_checkin", CommitCheckinArgs, True),
    "start_breathing": ToolSpec("start_breathing", StartBreathingArgs, False),
    "create_reminder": ToolSpec("create_reminder", CreateReminderArgs, True),
    "get_wellbeing_insights": ToolSpec(
        "get_wellbeing_insights", GetWellbeingInsightsArgs, False
    ),
    "generate_study_plan": ToolSpec(
        "generate_study_plan", GenerateStudyPlanArgs, False
    ),
    "save_study_plan": ToolSpec("save_study_plan", SaveStudyPlanArgs, True),
    "get_support_resources": ToolSpec(
        "get_support_resources", GetSupportResourcesArgs, False
    ),
    "activate_crisis_support": ToolSpec(
        "activate_crisis_support", ActivateCrisisSupportArgs, False
    ),
    "save_companion_preference": ToolSpec(
        "save_companion_preference", SaveCompanionPreferenceArgs, True
    ),
}


GEMINI_FUNCTION_DECLARATIONS: list[dict[str, Any]] = [
    {
        "name": "start_checkin",
        "description": (
            "Offer or prepare a wellbeing check-in when a student shares stress, mood, or sleep details. "
            "Pass mood (1-5), stress (1-5), and sleep_hours (0-24) only if the student explicitly provided them."
        ),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "mood": {
                    "type": "INTEGER",
                    "description": "Mood rating 1 (very low) to 5 (great)",
                },
                "stress": {
                    "type": "INTEGER",
                    "description": "Stress level 1 (very low) to 5 (very high)",
                },
                "sleep_hours": {"type": "NUMBER", "description": "Hours slept (0-24)"},
            },
        },
    },
    {
        "name": "start_breathing",
        "description": "Launch a guided breathing exercise synchronized with the 3D blob to help the student relax.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "pattern": {
                    "type": "STRING",
                    "enum": ["calm_4_4", "box", "4-7-8"],
                    "description": "Breathing cadence pattern",
                },
                "duration_minutes": {
                    "type": "INTEGER",
                    "description": "Duration in minutes (1-10)",
                },
            },
        },
    },
    {
        "name": "create_reminder",
        "description": (
            "Propose a study break, hydration, or wellbeing reminder. "
            "This always pauses for explicit user confirmation before saving."
        ),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "title": {
                    "type": "STRING",
                    "description": "Short reminder label, e.g. 'Take a 5-min stretch break'",
                },
                "delay_minutes": {
                    "type": "INTEGER",
                    "description": "Minutes from now (5-240)",
                },
                "category": {
                    "type": "STRING",
                    "enum": ["break", "study", "hydration", "wellbeing"],
                },
            },
            "required": ["title"],
        },
    },
    {
        "name": "get_wellbeing_insights",
        "description": "Retrieve the student's recent mood, stress, and sleep trends from their session check-in history.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "days": {
                    "type": "INTEGER",
                    "description": "Window in days (1-90), default 7",
                },
            },
        },
    },
    {
        "name": "generate_study_plan",
        "description": (
            "Generate a personalized, break-balanced study plan. Only pass subjects the student explicitly named. "
            "If subjects are unknown, ask the student first or call with empty subjects to check missing details."
        ),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "subjects": {
                    "type": "ARRAY",
                    "items": {"type": "STRING"},
                    "description": "List of subjects or courses the student needs to prepare for",
                },
                "exam_timeline": {
                    "type": "STRING",
                    "description": "When the first exam is or timeline (e.g. 'in 4 days', 'Monday')",
                },
                "daily_hours": {
                    "type": "NUMBER",
                    "description": "Target daily study hours (0.5-10)",
                },
                "save_to_planner": {
                    "type": "BOOLEAN",
                    "description": "Set true only if user explicitly asks to save the plan to Study Planner",
                },
            },
        },
    },
    {
        "name": "get_support_resources",
        "description": "Display verified campus and national human support resources when a student wants to talk to someone.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "category": {
                    "type": "STRING",
                    "enum": ["all", "campus", "helpline", "emergency"],
                },
            },
        },
    },
    {
        "name": "activate_crisis_support",
        "description": "Activate immediate verified crisis support resources when the student expresses urgent distress or asks for urgent help.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "reason": {"type": "STRING"},
            },
        },
    },
    {
        "name": "save_companion_preference",
        "description": "Propose saving study goals or preferred pacing settings (requires explicit user confirmation).",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "study_goal": {"type": "STRING"},
                "preferred_study_block_minutes": {"type": "INTEGER"},
                "preferred_break_minutes": {"type": "INTEGER"},
                "preferred_tone": {"type": "STRING", "enum": ["warm", "concise"]},
            },
        },
    },
]


# ============================================================================
# STUDY PLAN & BREATHING HELPERS
# ============================================================================


BREATHING_PATTERNS: dict[str, dict[str, Any]] = {
    "calm_4_4": {
        "pattern": "calm_4_4",
        "label": "Gentle 4-4 Breathing",
        "inhale_seconds": 4,
        "hold_seconds": 0,
        "exhale_seconds": 4,
        "hold_after_exhale_seconds": 0,
    },
    "box": {
        "pattern": "box",
        "label": "Box Breathing (4-4-4-4)",
        "inhale_seconds": 4,
        "hold_seconds": 4,
        "exhale_seconds": 4,
        "hold_after_exhale_seconds": 4,
    },
    "4-7-8": {
        "pattern": "4-7-8",
        "label": "Calming 4-7-8 Breath",
        "inhale_seconds": 4,
        "hold_seconds": 7,
        "exhale_seconds": 8,
        "hold_after_exhale_seconds": 0,
    },
}


def build_personalized_study_plan(
    subjects: list[str],
    exam_timeline: str | None,
    daily_hours: float,
    session_id: str,
) -> dict[str, Any]:
    """Builds a realistic, non-overwhelming study plan adapted to recent check-ins and saved preferences."""
    prefs = storage.get_companion_preferences(session_id)
    insights = compute_session_insights(session_id=session_id, days=7)

    block_minutes = prefs.preferred_study_block_minutes
    break_minutes = prefs.preferred_break_minutes

    # Adapt block length gently when recent stress is high or sleep is short
    pacing_note = f"Paced in {block_minutes}-minute focus blocks with {break_minutes}-minute breaks so your mind stays fresh."
    if insights.check_in_count > 0 and (
        insights.average_stress >= 4.0 or insights.average_sleep < 6.0
    ):
        block_minutes = min(block_minutes, 25)
        break_minutes = max(break_minutes, 8)
        pacing_note = (
            f"Since things have felt intense recently, we kept blocks to {block_minutes} minutes "
            f"with {break_minutes}-minute rest breaks."
        )

    total_minutes = round(daily_hours * 60)
    blocks: list[dict[str, Any]] = []
    used_minutes = 0
    focus_modes = [
        ("Revision", "Key concepts & active recall"),
        ("Study", "Core practice problems"),
        ("Reading", "Summary review & weak spots"),
    ]

    idx = 0
    while used_minutes < total_minutes and len(blocks) < 6:
        subj = subjects[idx % len(subjects)]
        cat, focus_desc = focus_modes[(idx // len(subjects)) % len(focus_modes)]
        remaining = total_minutes - used_minutes
        dur = min(block_minutes, max(15, remaining))
        blocks.append(
            {
                "subject": subj,
                "title": f"{subj}: {focus_desc}",
                "estimated_minutes": dur,
                "break_minutes": break_minutes,
                "category": cat,
            }
        )
        used_minutes += dur + break_minutes
        idx += 1

    return {
        "subjects": subjects,
        "exam_timeline": exam_timeline,
        "daily_hours": daily_hours,
        "blocks": blocks,
        "pacing_note": pacing_note,
        "saved_to_planner": False,
    }


# ============================================================================
# TOOL EXECUTION ENGINE
# ============================================================================


@dataclass
class ToolOutcome:
    record: ToolExecutionRecord
    pending_confirmation: PendingConfirmation | None = None
    action_card: CompanionActionCard | None = None
    blob_state_hint: str | None = None
    support_contacts: list[Any] | None = None


def _make_pending(
    tool_name: str,
    title: str,
    description: str,
    args: dict[str, Any],
) -> PendingConfirmation:
    return PendingConfirmation(
        action_id=f"act-{uuid.uuid4().hex[:10]}",
        tool_name=tool_name,
        title=title,
        description=description,
        args=args,
    )


def execute_validated_tool(
    tool_name: str,
    raw_args: dict[str, Any] | None,
    session_id: str,
    *,
    confirmed_by_user: bool = False,
) -> ToolOutcome:
    """
    Validates tool name against allowlist, validates arguments via Pydantic,
    enforces confirmation gate for persistent/sensitive actions, and executes
    through existing application services.
    """
    spec = ALLOWED_TOOLS.get(tool_name)
    if spec is None:
        logger.warning("Rejected unauthorized tool call: %s", tool_name)
        return ToolOutcome(
            record=ToolExecutionRecord(
                tool_name=tool_name,
                status="rejected",
                summary=f"Tool '{tool_name}' is not authorized.",
            )
        )

    try:
        validated = spec.schema.model_validate(raw_args or {})
    except ValidationError as exc:
        logger.warning(
            "Rejected malformed arguments for tool %s (%d errors)",
            tool_name,
            len(exc.errors()),
        )
        return ToolOutcome(
            record=ToolExecutionRecord(
                tool_name=tool_name,
                status="rejected",
                summary=f"Invalid parameters for '{tool_name}'.",
            )
        )

    # Gate persistent or sensitive actions unless explicitly confirmed
    if spec.requires_confirmation and not confirmed_by_user:
        pending = _build_pending_confirmation(tool_name, validated)
        return ToolOutcome(
            record=ToolExecutionRecord(
                tool_name=tool_name,
                status="awaiting_confirmation",
                summary=f"Waiting for user confirmation: {pending.title}",
                data={"action_id": pending.action_id},
            ),
            pending_confirmation=pending,
        )

    # Execute allowlisted tool safely
    try:
        return _dispatch_tool(
            tool_name, validated, session_id, confirmed_by_user=confirmed_by_user
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("Tool execution failed for %s (%s)", tool_name, type(exc).__name__)
        return ToolOutcome(
            record=ToolExecutionRecord(
                tool_name=tool_name,
                status="failed",
                summary=f"Could not complete '{tool_name}' right now. Please try again.",
            ),
            blob_state_hint="error",
        )


def _build_pending_confirmation(tool_name: str, args: BaseModel) -> PendingConfirmation:
    if tool_name == "create_reminder":
        assert isinstance(args, CreateReminderArgs)
        return _make_pending(
            tool_name="create_reminder",
            title=f"Set reminder: {args.title}",
            description=f"Remind you in {args.delay_minutes} minutes ({args.category}).",
            args=args.model_dump(),
        )
    if tool_name == "commit_checkin":
        assert isinstance(args, CommitCheckinArgs)
        return _make_pending(
            tool_name="commit_checkin",
            title="Save your wellbeing check-in",
            description=(
                f"Save mood {args.mood}/5, stress {args.stress}/5, and {args.sleep_hours:.1f}h sleep "
                "to your anonymous session history (no transcript is stored)."
            ),
            args=args.model_dump(),
        )
    if tool_name == "save_study_plan":
        assert isinstance(args, SaveStudyPlanArgs)
        return _make_pending(
            tool_name="save_study_plan",
            title=f"Save {len(args.blocks)} study blocks to Study Planner",
            description="Adds these study and break sessions to your Study Planner list.",
            args=args.model_dump(),
        )
    if tool_name == "save_companion_preference":
        assert isinstance(args, SaveCompanionPreferenceArgs)
        return _make_pending(
            tool_name="save_companion_preference",
            title="Save study & pacing preferences",
            description=(
                f"Save study block ({args.preferred_study_block_minutes}m), break ({args.preferred_break_minutes}m)"
                + (f", and goal '{args.study_goal}'" if args.study_goal else "")
                + "."
            ),
            args=args.model_dump(),
        )
    raise ValueError(f"Unsupported confirmation tool: {tool_name}")


def _dispatch_tool(
    tool_name: str,
    args: BaseModel,
    session_id: str,
    *,
    confirmed_by_user: bool,
) -> ToolOutcome:
    if tool_name == "start_checkin":
        assert isinstance(args, StartCheckinArgs)
        missing = []
        if args.mood is None:
            missing.append("mood (1-5)")
        if args.stress is None:
            missing.append("stress (1-5)")
        if args.sleep_hours is None:
            missing.append("sleep_hours (0-24)")

        if missing:
            return ToolOutcome(
                record=ToolExecutionRecord(
                    tool_name="start_checkin",
                    status="needs_info",
                    summary=f"Check-in needs: {', '.join(missing)}",
                    data={"missing": missing},
                ),
                action_card=CompanionActionCard(
                    card_type="checkin_prompt",
                    title="Quick Stress & Wellbeing Check-in",
                    data={
                        "mood": args.mood,
                        "stress": args.stress,
                        "sleep_hours": args.sleep_hours,
                        "missing": missing,
                    },
                ),
            )

        # All metrics present -> request explicit permission before saving check-in
        commit_args = CommitCheckinArgs(
            mood=args.mood,  # type: ignore[arg-type]
            stress=args.stress,  # type: ignore[arg-type]
            sleep_hours=args.sleep_hours,  # type: ignore[arg-type]
        )
        pending = _build_pending_confirmation("commit_checkin", commit_args)
        return ToolOutcome(
            record=ToolExecutionRecord(
                tool_name="start_checkin",
                status="awaiting_confirmation",
                summary="Ready to save check-in after explicit confirmation.",
                data={"action_id": pending.action_id, **commit_args.model_dump()},
            ),
            pending_confirmation=pending,
        )

    if tool_name == "commit_checkin":
        assert isinstance(args, CommitCheckinArgs)
        storage.cleanup_expired_records(session_id)
        recent_records = [
            {"mood": c.mood, "stress": c.stress, "sleep_hours": c.sleep_hours}
            for c in storage.get_checkins(session_id)[-5:]
        ]
        safety = evaluate_wellbeing_route(
            mood=args.mood,
            stress=args.stress,
            sleep_hours=args.sleep_hours,
            reflection="",
            recent_history=recent_records,
        )
        record = storage.add_checkin(
            session_id=session_id,
            mood=args.mood,
            stress=args.stress,
            sleep_hours=args.sleep_hours,
            route=safety.route,
        )
        contacts = get_urgent_contacts() if safety.route == "HIGH" else []
        return ToolOutcome(
            record=ToolExecutionRecord(
                tool_name="commit_checkin",
                status="executed",
                summary=f"Saved check-in ({safety.route} route).",
                data={"record": record.model_dump(), "route": safety.route},
            ),
            action_card=CompanionActionCard(
                card_type="checkin_saved",
                title="Check-in Saved",
                data={
                    "record": record.model_dump(),
                    "safety": safety.model_dump(),
                },
            ),
            blob_state_hint="support" if safety.route == "HIGH" else "speaking",
            support_contacts=contacts or None,
        )

    if tool_name == "start_breathing":
        assert isinstance(args, StartBreathingArgs)
        cfg = {
            **BREATHING_PATTERNS[args.pattern],
            "duration_minutes": args.duration_minutes,
        }
        return ToolOutcome(
            record=ToolExecutionRecord(
                tool_name="start_breathing",
                status="executed",
                summary=f"Started {cfg['label']} for {args.duration_minutes} minute(s).",
                data=cfg,
            ),
            action_card=CompanionActionCard(
                card_type="breathing",
                title=cfg["label"],
                data=cfg,
            ),
            blob_state_hint="breathing",
        )

    if tool_name == "create_reminder":
        assert isinstance(args, CreateReminderArgs)
        reminder = storage.add_reminder(
            session_id=session_id,
            title=args.title,
            category=args.category,
            delay_minutes=args.delay_minutes,
        )
        return ToolOutcome(
            record=ToolExecutionRecord(
                tool_name="create_reminder",
                status="executed",
                summary=f"Created reminder '{reminder.title}' for {reminder.delay_minutes} mins from now.",
                data=reminder.model_dump(),
            ),
            action_card=CompanionActionCard(
                card_type="reminder",
                title="Reminder Scheduled",
                data=reminder.model_dump(),
            ),
        )

    if tool_name == "get_wellbeing_insights":
        assert isinstance(args, GetWellbeingInsightsArgs)
        storage.cleanup_expired_records(session_id)
        insights = compute_session_insights(session_id=session_id, days=args.days)
        return ToolOutcome(
            record=ToolExecutionRecord(
                tool_name="get_wellbeing_insights",
                status="executed",
                summary=insights.plain_summary,
                data=insights.model_dump(),
            ),
            action_card=CompanionActionCard(
                card_type="insights",
                title=f"Your Last {args.days} Days",
                data=insights.model_dump(),
            ),
        )

    if tool_name == "generate_study_plan":
        assert isinstance(args, GenerateStudyPlanArgs)
        if not args.subjects:
            return ToolOutcome(
                record=ToolExecutionRecord(
                    tool_name="generate_study_plan",
                    status="needs_info",
                    summary="Need subjects and first exam timeline to personalize the study plan.",
                    data={"missing": ["subjects", "exam_timeline"]},
                )
            )
        plan = build_personalized_study_plan(
            subjects=args.subjects,
            exam_timeline=args.exam_timeline,
            daily_hours=args.daily_hours,
            session_id=session_id,
        )
        pending = None
        if args.save_to_planner:
            save_args = SaveStudyPlanArgs(
                blocks=[
                    StudyPlanBlockInput(
                        title=b["title"],
                        estimated_minutes=b["estimated_minutes"],
                        category=b["category"],
                    )
                    for b in plan["blocks"]
                ]
            )
            pending = _build_pending_confirmation("save_study_plan", save_args)

        return ToolOutcome(
            record=ToolExecutionRecord(
                tool_name="generate_study_plan",
                status="executed",
                summary=f"Generated personalized study plan across {len(args.subjects)} subject(s).",
                data=plan,
            ),
            pending_confirmation=pending,
            action_card=CompanionActionCard(
                card_type="study_plan",
                title="Personalized Study Plan",
                data=plan,
            ),
        )

    if tool_name == "save_study_plan":
        assert isinstance(args, SaveStudyPlanArgs)
        storage.mark_planner_seeded(session_id)
        created_tasks = [
            storage.add_task(
                session_id=session_id,
                title=block.title,
                estimated_minutes=block.estimated_minutes,
                category=block.category,
            ).model_dump()
            for block in args.blocks
        ]
        return ToolOutcome(
            record=ToolExecutionRecord(
                tool_name="save_study_plan",
                status="executed",
                summary=f"Saved {len(created_tasks)} study blocks to your Study Planner.",
                data={"saved_count": len(created_tasks), "tasks": created_tasks},
            ),
            action_card=CompanionActionCard(
                card_type="study_plan",
                title="Saved to Study Planner",
                data={
                    "blocks": [
                        {
                            "subject": t["category"],
                            "title": t["title"],
                            "estimated_minutes": t["estimated_minutes"],
                            "break_minutes": 5,
                            "category": t["category"],
                        }
                        for t in created_tasks
                    ],
                    "pacing_note": "Added to your Study Planner.",
                    "saved_to_planner": True,
                },
            ),
        )

    if tool_name == "get_support_resources":
        assert isinstance(args, GetSupportResourcesArgs)
        contacts = get_support_directory(active_only=True)
        if args.category != "all":
            contacts = [c for c in contacts if c.category == args.category]
        return ToolOutcome(
            record=ToolExecutionRecord(
                tool_name="get_support_resources",
                status="executed",
                summary=f"Loaded {len(contacts)} verified support contact(s).",
                data={"count": len(contacts)},
            ),
            action_card=CompanionActionCard(
                card_type="support_resources",
                title="Verified Support Resources",
                data={"contacts": [c.model_dump() for c in contacts]},
            ),
            blob_state_hint="support",
            support_contacts=contacts,
        )

    if tool_name == "activate_crisis_support":
        assert isinstance(args, ActivateCrisisSupportArgs)
        contacts = get_urgent_contacts(active_only=True)
        return ToolOutcome(
            record=ToolExecutionRecord(
                tool_name="activate_crisis_support",
                status="executed",
                summary="Activated immediate verified crisis and human support directory.",
                data={"count": len(contacts)},
            ),
            action_card=CompanionActionCard(
                card_type="crisis_support",
                title="Immediate Human Support Available",
                data={"contacts": [c.model_dump() for c in contacts]},
            ),
            blob_state_hint="support",
            support_contacts=contacts,
        )

    if tool_name == "save_companion_preference":
        assert isinstance(args, SaveCompanionPreferenceArgs)
        current = storage.get_companion_preferences(session_id)
        updated = CompanionPreferences(
            study_goal=args.study_goal
            if args.study_goal is not None
            else current.study_goal,
            preferred_study_block_minutes=args.preferred_study_block_minutes,
            preferred_break_minutes=args.preferred_break_minutes,
            preferred_tone=args.preferred_tone,
        )
        saved = storage.update_companion_preferences(session_id, updated)
        return ToolOutcome(
            record=ToolExecutionRecord(
                tool_name="save_companion_preference",
                status="executed",
                summary="Saved your pacing and study preferences.",
                data=saved.model_dump(),
            ),
            action_card=CompanionActionCard(
                card_type="preference_saved",
                title="Preferences Saved",
                data=saved.model_dump(),
            ),
        )

    raise ValueError(f"Unhandled tool {tool_name}")
