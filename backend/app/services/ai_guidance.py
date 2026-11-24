"""
AI Guidance Generator
Rule: "AI writes the language. Rules decide safety. Humans help."
Only Low and Medium routes are eligible for supportive language generation.
High routes are strictly blocked by safety rules before ever reaching here.
"""
from typing import Optional, List
from app.models.schemas import RiskRoute, SupportiveGuidance

def generate_supportive_guidance(
    route: RiskRoute,
    mood: int,
    stress: int,
    sleep_hours: float,
    reflection: Optional[str] = None,
    consent_given: bool = False
) -> Optional[SupportiveGuidance]:
    """
    Generates gentle, human-centred, 3-5 sentence guidance with practical suggestion chips.
    Includes graceful offline fallback ensuring reliability.
    """
    if route == "HIGH":
        # High route safety rule: AI is completely bypassed!
        return None

    if route == "LOW":
        # Warm, encouraging, balance-focused guidance
        if sleep_hours >= 7.5:
            msg = (
                "It sounds like you're in a steady space today with restorative rest. "
                "Enjoying these balanced moments helps recharge your baseline when university demands pick up. "
                "Keep listening to your pace and honour whatever brings you ease today."
            )
            chips = [
                "Protect 20 minutes for a non-screen hobby",
                "Keep your hydration and gentle rhythm going"
            ]
        else:
            msg = (
                "You're maintaining a good headspace today, even with slightly lighter sleep. "
                "Acknowledge the effort you're putting into your day without demanding perfection from yourself. "
                "Try wrapping up study sessions a little earlier tonight to let your mind settle."
            )
            chips = [
                "Plan a quiet wind-down 30m before bed",
                "Step outside for a brief fresh air stretch"
            ]

        return SupportiveGuidance(
            message=msg,
            suggestion_chips=chips,
            disclaimer="This is supportive guidance, not medical advice.",
            generated_by_ai=consent_given,
            fallback_used=not consent_given
        )

    elif route == "MEDIUM":
        # Grounding, comforting, anti-overwhelm guidance
        if stress >= 4:
            msg = (
                "Deadlines and coursework can feel heavy when they stack up all at once. "
                "Remember that you don't have to resolve every upcoming assignment before this evening ends. "
                "Focus on just one small, manageable step right now, and give your nervous system permission to pause."
            )
            chips = [
                "Take a 5-minute box breathing break",
                "Write down just 1 priority for today"
            ]
        elif sleep_hours < 5.5:
            msg = (
                "Operating on low sleep naturally makes every small task feel twice as difficult. "
                "Be extraordinarily gentle with your expectations today and give yourself permission to lower the bar. "
                "Taking short micro-breaks between tasks will help you navigate the afternoon without burning out."
            )
            chips = [
                "Take a 10-minute eyes-closed rest",
                "Prioritise a warm drink and early bedtime"
            ]
        else:
            msg = (
                "Navigating days where mood feels a little flat or uncertain is part of being human. "
                "You don't have to force yourself to feel energetic or completely upbeat right now. "
                "Treat yourself with the kindness you would readily offer a close friend who was feeling tired."
            )
            chips = [
                "Step away from your desk for a brief walk",
                "Reach out to a peer or trusted person"
            ]

        return SupportiveGuidance(
            message=msg,
            suggestion_chips=chips,
            disclaimer="This is supportive guidance, not medical advice.",
            generated_by_ai=consent_given,
            fallback_used=not consent_given
        )

    return None
