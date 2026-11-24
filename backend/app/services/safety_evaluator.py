"""
Safety Evaluator Engine — "Rules decide safety. AI writes the language. Humans help."
The frontend must NEVER calculate risk. All routing happens strictly here.
"""
import re
from typing import List, Tuple
from app.models.schemas import RiskRoute, SafetyEvaluation

# Verified High-Distress / Crisis Indicators (Case-insensitive keyword & pattern matches)
HIGH_RISK_PATTERNS = [
    r"\b(suicid|kill myself|end my life|end it all|want to die|take my own life)\b",
    r"\b(self-?harm|cutting myself|hurt myself|overdose|slit)\b",
    r"\b(no reason to live|better off dead|cannot go on|can't go on anymore)\b",
    r"\b(hopeless|nobody cares|worthless|can't take this anymore)\b",
    r"\b(severe panic|hallucinat|terrified|emergency|passing out)\b",
]

def evaluate_wellbeing_route(
    mood: int,
    stress: int,
    sleep_hours: float,
    reflection: str = "",
    recent_history: List[dict] = None
) -> SafetyEvaluation:
    """
    Deterministically evaluates student wellbeing route based on conservative safety rules.
    High routes bypass all AI generation immediately and route to human escalation.
    """
    reasons = []
    text = (reflection or "").strip().lower()

    # 1. Check for immediate crisis keywords in optional reflection text
    crisis_detected = False
    for pattern in HIGH_RISK_PATTERNS:
        if re.search(pattern, text):
            crisis_detected = True
            reasons.append("Crisis or acute distress indicators identified in check-in reflection.")
            break

    # 2. Check severe quantitative boundaries
    is_severe_mood = (mood == 1)
    is_severe_stress = (stress == 5)
    is_severe_sleep_deprivation = (sleep_hours < 3.5)

    if is_severe_mood:
        reasons.append("Reported very low mood (1/5).")
    if is_severe_stress:
        reasons.append("Reported highest stress level (5/5).")
    if is_severe_sleep_deprivation:
        reasons.append("Critical sleep deprivation reported (less than 3.5 hours).")

    # Trend check: if recent 3 check-ins have average mood <= 1.8
    consecutive_low_trend = False
    if recent_history and len(recent_history) >= 2:
        last_moods = [h.get("mood", 3) for h in recent_history[-2:]]
        if all(m <= 2 for m in last_moods) and mood <= 2:
            consecutive_low_trend = True
            reasons.append("Persistent low mood observed over consecutive check-ins.")

    # High Route Determination
    if crisis_detected or is_severe_mood or is_severe_stress or (is_severe_sleep_deprivation and mood <= 2):
        return SafetyEvaluation(
            route="HIGH",
            status_label="Let's get you support",
            status_summary="You don't have to carry this alone. Immediate human care is ready for you.",
            requires_human_escalation=True,
            ai_eligible=False, # Strictly False: High routes bypass AI
            reasons=reasons or ["Elevated stress and vulnerability detected."]
        )

    # 3. Medium Route Determination
    # Mood == 2, Stress >= 3, Sleep < 6, or consecutive low trend
    is_moderate_stress = (stress in [3, 4])
    is_low_mood = (mood == 2)
    is_short_sleep = (sleep_hours < 6.0)

    if is_low_mood or is_moderate_stress or is_short_sleep or consecutive_low_trend:
        medium_reasons = []
        if is_low_mood:
            medium_reasons.append("Mood is feeling low (2/5).")
        if is_moderate_stress:
            medium_reasons.append(f"Elevated academic/life stress ({stress}/5).")
        if is_short_sleep:
            medium_reasons.append(f"Sleep duration was limited ({sleep_hours:.1f} hrs).")
        if consecutive_low_trend:
            medium_reasons.append("Consecutive lower wellbeing scores noticed.")

        return SafetyEvaluation(
            route="MEDIUM",
            status_label="Worth some support",
            status_summary="Things feel challenging right now. Gentle pacing and helpful coping tools can help.",
            requires_human_escalation=False,
            ai_eligible=True,
            reasons=medium_reasons or ["Moderate fatigue or stress noted."]
        )

    # 4. Low Route Determination
    # Mood >= 3, Stress <= 2, Sleep >= 6.0
    return SafetyEvaluation(
        route="LOW",
        status_label="Doing okay",
        status_summary="Your baseline is steady today. Good time to maintain balance and protect your energy.",
        requires_human_escalation=False,
        ai_eligible=True,
        reasons=["Healthy baseline mood, manageable stress, and sufficient rest."]
    )
