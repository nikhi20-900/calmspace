"""
Calmspace AI Supportive Guidance Service
Rule: "AI writes the language. Rules decide safety. Humans help."

Guarantees:
1. High-route / crisis requests strictly cause ZERO provider calls.
2. Only Low and Medium routes are eligible for supportive language generation.
3. Input minimization: only approved metrics are sent; reflections are forwarded only with explicit consent.
4. Prompt isolation: untrusted user reflection is contained and guarded against prompt injection.
5. Strict output validation: non-clinical, 3-5 sentences, zero diagnosis or prescriptions.
6. Safe deterministic fallback: returned on timeouts, errors, validation failures, or unconsented requests.
7. Fail closed: invalid provider configurations or missing credentials return safe fallback without silent mock substitution.
"""

import logging
import time
from datetime import UTC, datetime

from app.core.config import AIServiceConfig, get_ai_config
from app.models.schemas import RiskRoute, SupportiveGuidance
from app.services.ai_providers import BaseAIProvider, get_ai_provider
from app.services.ai_validation import (
    SYSTEM_INSTRUCTION_V1,
    build_user_prompt,
    validate_ai_guidance_output,
)

logger = logging.getLogger("calmspace.ai_guidance")


class AIRateLimiter:
    """
    Process-local rate limiter tracking sliding per-minute windows and daily caps.

    GUARANTEE & SCOPE:
    Single-process in-memory limiter for development, tests, and single-instance demo.
    Multi-instance or multi-worker production deployments must configure a distributed
    shared store (e.g. Redis). If allow_process_local_rate_limiter is False in production,
    calls fail closed to the safe deterministic fallback.
    """

    def __init__(self):
        self._session_timestamps: dict[str, list[float]] = {}
        self._daily_count: int = 0
        self._current_day: str = datetime.now(UTC).strftime("%Y-%m-%d")

    def _reset_daily_if_new_day(self):
        today = datetime.now(UTC).strftime("%Y-%m-%d")
        if today != self._current_day:
            self._current_day = today
            self._daily_count = 0
            self._session_timestamps.clear()

    def is_allowed(
        self,
        session_id: str,
        rate_limit_per_minute: int,
        daily_budget_limit: int,
        allow_local: bool = True,
    ) -> bool:
        if not allow_local:
            logger.warning(
                "Process-local rate limiting is blocked for multi-worker production without shared store. Failing closed."
            )
            return False

        self._reset_daily_if_new_day()

        if self._daily_count >= daily_budget_limit:
            logger.warning(
                "AI guidance daily budget limit reached (%d)", daily_budget_limit
            )
            return False

        now = time.time()
        timestamps = self._session_timestamps.get(session_id, [])
        # Retain only timestamps from the last 60 seconds
        recent = [t for t in timestamps if now - t < 60.0]
        self._session_timestamps[session_id] = recent

        if len(recent) >= rate_limit_per_minute:
            logger.warning("AI guidance per-minute rate limit reached for session")
            return False

        return True

    def record_call(self, session_id: str):
        now = time.time()
        self._session_timestamps.setdefault(session_id, []).append(now)
        self._daily_count += 1

    def reset(self):
        self._session_timestamps.clear()
        self._daily_count = 0
        self._current_day = datetime.now(UTC).strftime("%Y-%m-%d")


rate_limiter = AIRateLimiter()


def get_deterministic_fallback(
    route: RiskRoute, mood: int, stress: int, sleep_hours: float
) -> SupportiveGuidance:
    """
    Returns approved, peer-reviewed, warm, non-clinical supportive guidance.
    Used when AI is unconsented, disabled, timed out, rate-limited, misconfigured, or failed validation.
    """
    if route == "LOW":
        if sleep_hours >= 7.5:
            msg = (
                "It sounds like you're in a steady space today with restorative rest. "
                "Enjoying these balanced moments helps recharge your baseline when university demands pick up. "
                "Keep listening to your pace and honour whatever brings you ease today."
            )
            chips = [
                "Protect 20 minutes for a non-screen hobby",
                "Keep your hydration and gentle rhythm going",
            ]
        else:
            msg = (
                "You're maintaining a good headspace today, even with slightly lighter sleep. "
                "Acknowledge the effort you're putting into your day without demanding perfection from yourself. "
                "Try wrapping up study sessions a little earlier tonight to let your mind settle."
            )
            chips = [
                "Plan a quiet wind-down 30m before bed",
                "Step outside for a brief fresh air stretch",
            ]
        return SupportiveGuidance(
            message=msg,
            suggestion_chips=chips,
            disclaimer="This is supportive guidance, not medical advice.",
            generated_by_ai=False,
            fallback_used=True,
        )

    # MEDIUM route fallback
    if stress >= 4:
        msg = (
            "Deadlines and coursework can feel heavy when they stack up all at once. "
            "Remember that you don't have to resolve every upcoming assignment before this evening ends. "
            "Focus on just one small, manageable step right now, and give your nervous system permission to pause."
        )
        chips = [
            "Take a 5-minute box breathing break",
            "Write down just 1 priority for today",
        ]
    elif sleep_hours < 5.5:
        msg = (
            "Operating on low sleep naturally makes every small task feel twice as difficult. "
            "Be extraordinarily gentle with your expectations today and give yourself permission to lower the bar. "
            "Taking short micro-breaks between tasks will help you navigate the afternoon without burning out."
        )
        chips = [
            "Take a 10-minute eyes-closed rest",
            "Prioritise a warm drink and early bedtime",
        ]
    else:
        msg = (
            "Navigating days where mood feels a little flat or uncertain is part of being human. "
            "You don't have to force yourself to feel energetic or completely upbeat right now. "
            "Treat yourself with the kindness you would readily offer a close friend who was feeling tired."
        )
        chips = [
            "Step away from your desk for a brief walk",
            "Reach out to a peer or trusted person",
        ]

    return SupportiveGuidance(
        message=msg,
        suggestion_chips=chips,
        disclaimer="This is supportive guidance, not medical advice.",
        generated_by_ai=False,
        fallback_used=True,
    )


def generate_supportive_guidance(
    route: RiskRoute,
    mood: int,
    stress: int,
    sleep_hours: float,
    reflection: str | None = None,
    consent_given: bool = False,
    session_id: str | None = None,
    provider: BaseAIProvider | None = None,
    config: AIServiceConfig | None = None,
) -> SupportiveGuidance | None:
    """
    Generates gentle, human-centred, 3-5 sentence guidance with practical suggestion chips.
    Strictly follows safety constraints:
    1. HIGH route immediately returns None (zero AI calls).
    2. Non-consented check-in returns approved deterministic fallback without calling provider.
    3. Failure paths (timeout, rate limit, schema/safety violation, misconfiguration) return safe fallback.
    """
    # Safety Boundary 1: HIGH route / Crisis — ZERO AI CALL GUARANTEE
    if route == "HIGH":
        return None

    # Safety Boundary 2: Only Low and Medium routes are eligible
    if route not in ("LOW", "MEDIUM"):
        return None

    # Safe deterministic fallback ready for any failure or unconsented path
    fallback = get_deterministic_fallback(
        route=route, mood=mood, stress=stress, sleep_hours=sleep_hours
    )

    # Consent Check: If student did not grant explicit consent for this request, return fallback
    if not consent_given:
        return fallback

    # Configuration & Master switch (fail closed on invalid configuration)
    try:
        cfg = config or get_ai_config()
    except Exception as cfg_exc:  # noqa: BLE001
        logger.warning(
            "AI guidance configuration error (%s). Failing closed to safe fallback.",
            cfg_exc,
        )
        return fallback

    if not cfg.enabled:
        return fallback

    # Rate Limiting & Daily Usage Checks (enforces local vs distributed policy)
    sid = session_id or "anonymous-default"
    if not rate_limiter.is_allowed(
        sid,
        rate_limit_per_minute=cfg.rate_limit_per_minute,
        daily_budget_limit=cfg.daily_budget_limit,
        allow_local=cfg.allow_process_local_rate_limiter,
    ):
        return fallback

    # Resolve active provider (fail closed if provider or credentials invalid)
    try:
        active_provider = provider or get_ai_provider(cfg)
    except Exception as prov_exc:  # noqa: BLE001
        logger.warning(
            "AI guidance provider resolution error (%s). Failing closed to safe fallback.",
            prov_exc,
        )
        return fallback

    # Build prompt with input minimization and untrusted content isolation
    user_prompt = build_user_prompt(
        mood=mood,
        stress=stress,
        sleep_hours=sleep_hours,
        route=route,
        reflection=reflection if consent_given else None,
    )

    # Invoke provider with bounded timeout and safe exception containment
    try:
        raw_response = active_provider.generate_support(
            system_instruction=SYSTEM_INSTRUCTION_V1,
            user_prompt=user_prompt,
            timeout_seconds=cfg.timeout_seconds,
            max_tokens=cfg.max_tokens,
        )
        rate_limiter.record_call(sid)
    except Exception as exc:  # noqa: BLE001
        # Sanitize logs: never log private student reflection or API secrets
        logger.warning(
            "AI guidance provider call failed safely (%s). Returning safe fallback.",
            type(exc).__name__,
        )
        return fallback

    # Validate output schema and safety constraints
    validated = validate_ai_guidance_output(raw_response.raw_text)
    if validated is None:
        logger.warning(
            "AI guidance output rejected by safety/schema validator. Returning safe fallback."
        )
        return fallback

    return SupportiveGuidance(
        message=validated.message,
        suggestion_chips=validated.suggestion_chips,
        disclaimer="This is supportive guidance, not medical advice.",
        generated_by_ai=True,
        fallback_used=False,
    )
