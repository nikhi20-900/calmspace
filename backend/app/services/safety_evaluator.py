"""
Deterministic Wellbeing Safety and Routing Engine
=================================================
"Rules decide safety. AI writes the language. Humans help."

Principles & Acceptance Criteria:
1. PURE & DETERMINISTIC: Contains no network calls, no disk/database I/O, and no LLM dependency.
2. INPUT VALIDATION: Enforces bounds on mood (1–5), stress (1–5), and sleep (0.0–24.0 hours).
3. STABLE IDENTIFIERS: Every rule has a unique, stable ID, point value, and documented rationale.
4. CRISIS OVERRIDE PRECEDENCE: Configured crisis phrases and acute single metrics immediately trigger HIGH.
5. CUMULATIVE SCORE PRECEDENCE:
   - Score >= 5 -> HIGH (e.g., mood<=2 (+2) + sleep<4 (+2) + stress>=4 (+2) = 6 -> HIGH)
   - Score 2..4 -> MEDIUM
   - Score <= 1 -> LOW
6. NON-DIAGNOSTIC COPY: High is never described as a diagnosis; Low is never described as proof of safety.
"""

import math
import re
from typing import Any

from app.models.schemas import CheckInRequest, RiskRoute, RuleTrigger, SafetyEvaluation

# ============================================================================
# STABLE RULE IDENTIFIERS & METADATA
# ============================================================================

RULE_CRISIS_OVERRIDE = "RULE_CRISIS_OVERRIDE"
RULE_MOOD_VERY_LOW = "RULE_MOOD_VERY_LOW"
RULE_MOOD_LOW = "RULE_MOOD_LOW"
RULE_STRESS_VERY_HIGH = "RULE_STRESS_VERY_HIGH"
RULE_STRESS_HIGH = "RULE_STRESS_HIGH"
RULE_STRESS_MODERATE = "RULE_STRESS_MODERATE"
RULE_SLEEP_CRITICAL = "RULE_SLEEP_CRITICAL"
RULE_SLEEP_SHORT = "RULE_SLEEP_SHORT"
RULE_CONSECUTIVE_LOW_MOOD = "RULE_CONSECUTIVE_LOW_MOOD"
RULE_DISTRESS_KEYWORD = "RULE_DISTRESS_KEYWORD"

# Verified Acute Crisis Patterns (Immediate Human Escalation Override)
ACUTE_CRISIS_PATTERNS = [
    r"\b(suicide|suicidal|suicidality|kill myself|end my life|end it all|want to die|take my own life)\b",
    r"\b(self-?harm|cutting myself|hurt myself|overdose|slit my)\b",
    r"\b(no reason to live|better off dead|cannot go on anymore|can't go on anymore)\b",
]

# Broader Emotional Distress Patterns (Contributes to cumulative score)
BROADER_DISTRESS_PATTERNS = [
    r"\b(hopeless|worthless|nobody cares|can't take this anymore|cannot take this anymore|severe panic|terrified|hallucinat|breaking down|falling apart)\b",
    r"\b(extremely overwhelmed|burned out|burnout|unbearable|drowning in work)\b",
]

# Common Negation Phrases (Prevent false-positive crisis triggers)
NEGATION_PREFIXES = r"\b(not|never|don't|dont|won't|wont|didn't|didnt|no longer|neither|without|stop thinking about)\s+(feeling\s+|thinking\s+|wanting\s+to\s+)?"

# ============================================================================
# INPUT VALIDATION
# ============================================================================


def validate_checkin_inputs(mood: Any, stress: Any, sleep_hours: Any) -> None:
    """
    Validates check-in inputs.
    Raises ValueError with descriptive context for out-of-bounds, non-finite, or invalid types.
    """
    if not isinstance(mood, int) or isinstance(mood, bool) or mood < 1 or mood > 5:
        raise ValueError(
            f"Mood must be an integer between 1 and 5 (1=Very low, 5=Great). Received: {mood}"
        )

    if (
        not isinstance(stress, int)
        or isinstance(stress, bool)
        or stress < 1
        or stress > 5
    ):
        raise ValueError(
            f"Stress must be an integer between 1 and 5 (1=Very low, 5=Very high). Received: {stress}"
        )

    if (
        not isinstance(sleep_hours, (int, float))
        or isinstance(sleep_hours, bool)
        or not math.isfinite(sleep_hours)
        or sleep_hours < 0.0
        or sleep_hours > 24.0
    ):
        raise ValueError(
            f"Sleep duration must be a finite number between 0.0 and 24.0 hours. Received: {sleep_hours}"
        )


def extract_valid_mood(entry: Any) -> int | None:
    """
    Safely extracts a valid mood integer (1-5) from a history entry.
    Handles dict, Pydantic/dataclass objects, or malformed/missing entries gracefully.
    Returns None if the entry is missing or invalid.
    """
    if entry is None:
        return None
    val = None
    if isinstance(entry, dict):
        val = entry.get("mood")
    elif hasattr(entry, "mood"):
        val = getattr(entry, "mood", None)

    if isinstance(val, int) and not isinstance(val, bool) and 1 <= val <= 5:
        return val
    return None


# ============================================================================
# PURE DETERMINISTIC EVALUATION ENGINE
# ============================================================================


def evaluate(
    checkin: dict | CheckInRequest, history: list[dict | Any] | None = None
) -> SafetyEvaluation:
    """
    Standard interface per Issue #2:
    evaluate(checkin, history) -> SafetyEvaluation (with level, score, triggered_rules, crisis_flag)

    Pure function: No I/O, no network calls, no database access, no LLM invocations.
    """
    # Extract fields with type flexibility
    if isinstance(checkin, dict):
        mood = checkin.get("mood")
        stress = checkin.get("stress")
        sleep_hours = checkin.get("sleep_hours")
        reflection = checkin.get("reflection") or ""
    else:
        mood = checkin.mood
        stress = checkin.stress
        sleep_hours = checkin.sleep_hours
        reflection = checkin.reflection or ""

    # Validate boundaries strictly
    validate_checkin_inputs(mood, stress, sleep_hours)
    sleep_float = float(sleep_hours)

    triggered_rules: list[RuleTrigger] = []
    reasons: list[str] = []
    crisis_flag = False

    # -------------------------------------------------------------------------
    # 1. CRISIS PHRASE & EMOTIONAL DISTRESS ANALYSIS WITH NEGATION HANDLING
    # -------------------------------------------------------------------------
    norm_text = reflection.strip().lower()
    if norm_text:
        # Check acute crisis indicators
        has_crisis_keyword = False
        for pattern in ACUTE_CRISIS_PATTERNS:
            for match in re.finditer(pattern, norm_text):
                # Check for preceding negation in the preceding 35 characters
                start_pos = max(0, match.start() - 35)
                preceding_text = norm_text[start_pos : match.start()]
                if re.search(NEGATION_PREFIXES, preceding_text):
                    continue  # Negated: "not suicidal", "don't want to hurt myself"
                has_crisis_keyword = True
                break
            if has_crisis_keyword:
                break

        if has_crisis_keyword:
            crisis_flag = True
            triggered_rules.append(
                RuleTrigger(
                    rule_id=RULE_CRISIS_OVERRIDE,
                    name="Acute Crisis Indicator Override",
                    points=10,
                    rationale="Language indicative of acute self-harm or suicidal ideation identified in reflection.",
                )
            )
            reasons.append(
                "Crisis or acute distress indicators identified in check-in reflection."
            )
        else:
            # Check broader distress language (non-crisis)
            for pattern in BROADER_DISTRESS_PATTERNS:
                if re.search(pattern, norm_text):
                    triggered_rules.append(
                        RuleTrigger(
                            rule_id=RULE_DISTRESS_KEYWORD,
                            name="Elevated Emotional Strain Language",
                            points=1,
                            rationale="Reflection indicates notable emotional strain or feelings of overwhelm.",
                        )
                    )
                    reasons.append(
                        "Notable emotional strain expressed in check-in reflection."
                    )
                    break

    # -------------------------------------------------------------------------
    # 2. QUANTITATIVE SCORE EVALUATION (Deterministic Point Scoring)
    # -------------------------------------------------------------------------
    # Mood scoring
    if mood == 1:
        crisis_flag = True
        triggered_rules.append(
            RuleTrigger(
                rule_id=RULE_MOOD_VERY_LOW,
                name="Critical Low Mood Override",
                points=3,
                rationale="Reported lowest mood level (1/5), indicating severe emotional depletion.",
            )
        )
        reasons.append("Reported very low mood (1/5).")
    elif mood == 2:
        triggered_rules.append(
            RuleTrigger(
                rule_id=RULE_MOOD_LOW,
                name="Low Mood Baseline",
                points=2,
                rationale="Reported lower mood level (2/5).",
            )
        )
        reasons.append("Mood is feeling low (2/5).")

    # Stress scoring
    if stress == 5:
        crisis_flag = True
        triggered_rules.append(
            RuleTrigger(
                rule_id=RULE_STRESS_VERY_HIGH,
                name="Severe Overwhelming Stress Override",
                points=3,
                rationale="Reported maximum stress rating (5/5), indicating acute overwhelming pressure.",
            )
        )
        reasons.append("Reported highest stress level (5/5).")
    elif stress == 4:
        triggered_rules.append(
            RuleTrigger(
                rule_id=RULE_STRESS_HIGH,
                name="High Academic/Life Stress",
                points=2,
                rationale="Reported high stress rating (4/5).",
            )
        )
        reasons.append("Elevated academic/life stress (4/5).")
    elif stress == 3:
        triggered_rules.append(
            RuleTrigger(
                rule_id=RULE_STRESS_MODERATE,
                name="Moderate Stress Level",
                points=1,
                rationale="Reported moderate stress rating (3/5).",
            )
        )
        reasons.append("Moderate stress noted (3/5).")

    # Sleep scoring
    if sleep_float < 4.0:
        triggered_rules.append(
            RuleTrigger(
                rule_id=RULE_SLEEP_CRITICAL,
                name="Severe Sleep Deficit",
                points=2,
                rationale="Reported severe sleep deprivation (< 4.0 hours), impairing cognitive regulation.",
            )
        )
        reasons.append(
            f"Critical sleep deprivation reported ({sleep_float:.1f} hours)."
        )
    elif sleep_float < 6.0:
        triggered_rules.append(
            RuleTrigger(
                rule_id=RULE_SLEEP_SHORT,
                name="Suboptimal Sleep Duration",
                points=1,
                rationale="Reported suboptimal sleep duration (< 6.0 hours).",
            )
        )
        reasons.append(f"Sleep duration was limited ({sleep_float:.1f} hrs).")

    # -------------------------------------------------------------------------
    # 3. CONSECUTIVE CHECK-IN HISTORY TREND
    # -------------------------------------------------------------------------
    # Precisely defined: 3 consecutive entries with mood <= 2
    # Current entry must be <= 2, and the immediately preceding 2 entries in history must also be valid mood <= 2
    if mood <= 2 and history and len(history) >= 2:
        recent_moods = [extract_valid_mood(entry) for entry in history[-2:]]
        if len(recent_moods) == 2 and all(
            m is not None and m <= 2 for m in recent_moods
        ):
            triggered_rules.append(
                RuleTrigger(
                    rule_id=RULE_CONSECUTIVE_LOW_MOOD,
                    name="Persistent Consecutive Low Mood",
                    points=2,
                    rationale="Observed 3 consecutive check-ins with low mood (<= 2).",
                )
            )
            reasons.append("Persistent low mood observed over consecutive check-ins.")

    # -------------------------------------------------------------------------
    # 4. CUMULATIVE SCORE & PRECEDENCE RESOLUTION
    # -------------------------------------------------------------------------
    # Compute total score from non-override rules
    cumulative_score = sum(
        r.points for r in triggered_rules if r.rule_id != RULE_CRISIS_OVERRIDE
    )

    # Precedence Rule:
    # 1. Any crisis flag (crisis phrase, mood 1, or stress 5) overrides immediately to HIGH.
    # 2. Cumulative score >= 5 routes to HIGH.
    #    (e.g., mood<=2 (+2) + sleep<4 (+2) + stress>=4 (+2) = 6 -> HIGH)
    # 3. Cumulative score between 2 and 4 routes to MEDIUM.
    # 4. Cumulative score <= 1 routes to LOW.
    if crisis_flag or cumulative_score >= 5:
        route: RiskRoute = "HIGH"
        status_label = "Let's get you support"
        status_summary = (
            "You don't have to carry this alone. Immediate human care is ready for you."
        )
        requires_human_escalation = True
        ai_eligible = False  # Strictly False: High routes bypass AI entirely
    elif cumulative_score >= 2:
        route = "MEDIUM"
        status_label = "Worth some support"
        status_summary = "Things feel challenging right now. Gentle pacing and helpful coping tools can help."
        requires_human_escalation = False
        ai_eligible = True
    else:
        route = "LOW"
        status_label = "Doing okay"
        status_summary = "Your baseline is steady today. Good time to maintain balance and protect your energy."
        requires_human_escalation = False
        ai_eligible = True
        if not reasons:
            reasons.append(
                "Healthy baseline mood, manageable stress, and sufficient rest."
            )

    return SafetyEvaluation(
        route=route,
        level=route,
        score=cumulative_score,
        crisis_flag=crisis_flag,
        triggered_rules=triggered_rules,
        status_label=status_label,
        status_summary=status_summary,
        requires_human_escalation=requires_human_escalation,
        ai_eligible=ai_eligible,
        reasons=reasons or ["Elevated stress and vulnerability detected."],
    )


# Backward-compatible convenience alias
def evaluate_wellbeing_route(
    mood: int,
    stress: int,
    sleep_hours: float,
    reflection: str = "",
    recent_history: list[dict] | None = None,
) -> SafetyEvaluation:
    """
    Convenience function preserving the existing signature for router compatibility.
    """
    checkin_data = {
        "mood": mood,
        "stress": stress,
        "sleep_hours": sleep_hours,
        "reflection": reflection,
    }
    return evaluate(checkin_data, history=recent_history)
