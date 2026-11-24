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
import unicodedata
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
# Multilingual: English, Hinglish (hi-Latn), and Devanagari Hindi (hi-Deva)
ACUTE_CRISIS_PATTERNS = [
    # English direct, colloquial, and misspelling/leetspeak variants
    r"\b(suicide|suicidal|suicidality|suicde|sucidial|suecide)\b",
    r"\b(kill\s+myself|k!ll\s+myself|k\*ll\s+myself)\b",
    r"\b(end\s+my\s+(life|lyfe)|end\s+it\s+all|want\s+to\s+die|(take|taking)\s+my\s+own\s+life)\b",
    r"\b(self-?harm|selfharm|cutting\s+myself|hurt\s+myself|overdose|slit\s+my)\b",
    r"\b(no\s+reason\s+to\s+live|better\s+off\s+dead|cannot\s+go\s+on\s+anymore|can't\s+go\s+on\s+anymore)\b",
    # Hinglish direct expressions & colloquial variations
    r"\b(marne\s+ka\s+(man|mann)|mar\s+jana\s+chaht[ai])\b",
    r"\b(ab\s+aur\s+nahi\s+jiya\s+jata|marne\s+ka\s+time\s+aa\s+gaya)\b",
    r"\b(zindagi\s+se\s+thak\s+gay[ai].*mar)\b",
    r"\b(apne\s+aap\s+ko\s+khatam|apne\s+aap\s+ko\s+khatam\s+kar\s+lunga|sab\s+khatam\s+kar\s+dunga|khud\s+ko\s+khatam)\b",
    r"\b(apni\s+)?jaan\s+(de\s+(dunga|dungi|duga|dene|dena)|lene)\b",
    r"\b(khud\s*kushi|aatm\s*hatya)\b",
    r"\bkhud\s+ko\s+(hurt|harm)(\s+(karna|karne|karunga|karungi|kar\s+raha|kar\s+rahi))?\b",
    r"\b(ab\s+)?jeene\s+ka\s+(man|mann)\s+nahi\b",
    # Devanagari Hindi direct expressions
    r"(?<!\w)(आत्महत्या|खुदकुशी)(?!\w)",
    r"मरने\s+का\s+(मन|इच्छा|ख्याल)",
    r"(अपनी\s+)?जान\s+(दे\s+(दूंगा|दूंगी|देना)|लेने)",
    r"खुद\s+को\s+(नुकसान|चोट|खत्म)",
    r"जीने\s+की\s+(कोई\s+)?इच्छा\s+नहीं",
    r"सब\s+कुछ\s+खत्म\s+कर\s+लेना",
    r"मेरे\s+मरने\s+से\s+सबका\s+भला",
]

# Benign idioms to protect from false-positive crisis escalation
BENIGN_IDIOM_PATTERNS = [
    r"\bdead\s+tired\b",
    r"\bdying\s+of\s+laughter\b",
    r"\bkilling\s+it\b",
    r"\b(is|are|was|were)\s+killing\s+me\b",
    r"\b(would\s+)?die\s+for\s+(a|an|some)\b",
    r"\bkilled\s+me\s+with\s+laughter\b",
    r"\bdrop\s+dead\s+gorgeous\b",
    r"\bjaan\s+nikal\s+(gayi|rahi\s+hai)\b",
    r"\bthak\s+ke\s+mar\s+gaya\b",
    r"\bhas\s+has\s+ke\s+mar\s+gaya\b",
    r"\bkill\s+kar\s+diya\b",
    r"\bbhookh\s+ke\s+mare\b",
    r"जान\s+निकल\s+गई",
    r"हंस\s+हंस\s+कर",
]

# Broader Emotional Distress Patterns (Contributes to cumulative score)
BROADER_DISTRESS_PATTERNS = [
    r"\b(hopeless|worthless|nobody cares|can't take this anymore|cannot take this anymore|severe panic|terrified|hallucinat|breaking down|falling apart)\b",
    r"\b(extremely overwhelmed|burned out|burnout|unbearable|drowning in work|drowning in|disappear forever|never wake up|nothing matters)\b",
    r"\b(sab\s+kuch\s+chhod\s+kar|door\s+chale\s+jana|bohot\s+pareshan|koi\s+ummeed\s+nahi|thak\s+gaya\s+hoon)\b",
    r"(सब\s+छोड़\s+कर|बहुत\s+परेशान|कोई\s+उम्मीद\s+नहीं|हिम्मत\s+टूट\s+गई)",
]

# Sentence & Clause Boundary Delimiters
# Strictly enforces sentence & clause boundaries to prevent negation or context leakage
SENTENCE_DELIMITER_REGEX = re.compile(r"[.!?;\n।॥]")

CLAUSE_DELIMITER_REGEX = re.compile(
    r"([,!?;\n।॥]|\.|\b(but|however|yet|although|nevertheless|though|and|aur|par|lekin|magar)\b|"
    r"(?<!\w)(और|पर|लेकिन|मगर)(?!\w))",
    re.IGNORECASE,
)

PRECEDING_NEGATION_REGEX = re.compile(
    r"\b(not|no|never|don't|dont|won't|wont|didn't|didnt|no longer|neither|without|stop thinking about|stop feeling|would never|will never|used to be|"
    r"nahi|nahin|kabhi\s+nahi|koi\s+irada\s+nahi|koi\s+ichha\s+nahi|"
    r"नहीं|कभी\s+नहीं|कोई\s+इरादा\s+नहीं|कोई\s+इच्छा\s+नहीं)"
    r"(\s+(really|at all|currently|even|ever|actually))?"
    r"(\s+(feeling|thinking\s+(of|about)?|wanting\s+to|want\s+to|planning\s+to|plan\s+to|intending\s+to|intend\s+to|going\s+to|thoughts?\s+(of|about)?|desire\s+to|intention\s+to|have\s+thoughts\s+of|to))?"
    r"\s*$",
    re.IGNORECASE,
)

POST_VERBAL_NEGATION_REGEX = re.compile(
    r"^\s*(to\s+|bhi\s+|bilkul\s+)?(nahi|nahin|na|नहीं|ना)"
    r"(\s+(hai|hoga|tha|thi|karna|karunga|karungi|chahta|chahti|है|होगा|था|थी|करना|करूँगा|करूंगी|चाहता|चाहती))?(?!\w)|"
    r"^\s*(ki\s+|का\s+|की\s+)?(koi\s+|कोई\s+)?(ichha|irada|khyal|मन|इच्छा|इरादा|ख्याल)\s+(nahi|nahin|नहीं)(?!\w)|"
    r"^\s*(पहुँचाने|करने)\s+(का\s+)?(कोई\s+)?(इरादा|इच्छा)\s+(नहीं|ना)(?!\w)",
    re.IGNORECASE,
)

ACADEMIC_CONTEXT_REGEX = re.compile(
    r"\b(philosophy\s+class|professor\s+asked|textbook|academic\s+study|reading\s+assignment|"
    r"class\s+mein|lecture\s+mein|textbook\s+mein|professor\s+ne)\b|"
    r"(?<!\w)(क्लास\s+में|कक्षा\s+में|प्रोफेसर\s+ने|किताब\s+में|चर्चा\s+हुई|अध्ययन)(?!\w)",
    re.IGNORECASE,
)

ACADEMIC_FRAMING_REGEX = re.compile(
    r'["\'“”]'
    r"|\b(asked|asks|poocha|pucha|discussed|discusses|discussing|charcha|lecture|topic|why\s+do|why\s+people|kyun)\b|"
    r"(?<!\w)(पूछा|चर्चा|क्यों)(?!\w)",
    re.IGNORECASE,
)

FIRST_PERSON_DISCLOSURE_REGEX = re.compile(
    r"\b(i|i'm|im|i've|i'd|me|myself|mine)\b|"
    r"\b(feel|feeling|thinking|thought|want|wanting|wish|wishing|planning|going\s+to)\b|"
    r"\b(main|mujhe|mujhko|mera|meri|mere|khud|apne|apni)\b|"
    r"\b(soch\s+raha|soch\s+rahi|man\s+hai|mann\s+hai|irada\s+hai|dil\s+kar\s+raha|lag\s+raha)\b|"
    r"(?<!\w)(मैं|मुझे|मुझको|मेरा|मेरी|मेरे|खुद|अपने|अपनी)(?!\w)|"
    r"(?<!\w)(सोच\s+रहा|सोच\s+रही|मन\s+है|इरादा\s+है|दिल\s+कर\s+रहा|नुकसान)(?!\w)",
    re.IGNORECASE,
)


def is_in_academic_quote(text: str, match_start: int, match_end: int) -> bool:
    """
    Determines if an acute crisis phrase match is strictly contained within
    an academic, clinical, or instructional inquiry without personal distress intent.
    Enforces:
    1. Sentence boundaries isolate academic context from adjacent crisis statements.
    2. Any first-person disclosure (in English, Hinglish, or Devanagari Hindi) invalidates
       the academic exemption so genuine personal crises in academic settings are escalated.
    3. The match must be accompanied by both academic context and objective inquiry framing.
    """
    delims_before = [
        m.end() for m in SENTENCE_DELIMITER_REGEX.finditer(text[:match_start])
    ]
    sentence_start = delims_before[-1] if delims_before else 0

    delim_after = SENTENCE_DELIMITER_REGEX.search(text[match_end:])
    sentence_end = match_end + delim_after.start() if delim_after else len(text)

    sentence = text[sentence_start:sentence_end].strip()

    # Must contain an academic context marker within the same sentence
    if not ACADEMIC_CONTEXT_REGEX.search(sentence):
        return False

    # Personal first-person disclosure strictly invalidates academic exemption
    if FIRST_PERSON_DISCLOSURE_REGEX.search(sentence):
        return False

    # Must be framed as an objective academic inquiry, discussion, or quotation
    return bool(ACADEMIC_FRAMING_REGEX.search(sentence))


def is_crisis_negated(text_before_match: str) -> bool:
    """
    Determines if an acute crisis phrase match is genuinely negated by preceding context.
    Enforces:
    1. Sentence boundaries (. , ! ? ; \n) prevent negations in preceding sentences from
       suppressing crisis expressions in subsequent sentences.
    2. Contrastive conjunctions (but, however, yet, etc.) isolate preceding negations.
    3. The negation prefix must directly modify the crisis target expression.
    4. Coordinated disjunctions (e.g., 'would never hurt myself or self-harm') distribute
       negation across 'or'/'nor' when connecting crisis expressions.
    """
    delimiters = list(CLAUSE_DELIMITER_REGEX.finditer(text_before_match))
    if delimiters:
        last_delim = delimiters[-1]
        active_clause = text_before_match[last_delim.end() :]
    else:
        active_clause = text_before_match

    # 1. Direct preceding negation in current clause
    if PRECEDING_NEGATION_REGEX.search(active_clause):
        return True

    # 2. Coordinated negation across 'or' / 'nor' (e.g., 'would never hurt myself or self-harm')
    neg_word_match = re.search(
        r"\b(not|no|never|don't|dont|won't|wont|didn't|didnt|neither|without|would never|will never)\b",
        active_clause,
    )
    if neg_word_match:
        or_match = re.search(r"\s+(or|nor)\s*$", active_clause)
        if or_match:
            before_or = active_clause[: or_match.start()]
            for pat in ACUTE_CRISIS_PATTERNS:
                if re.search(pat, before_or):
                    return True

    return False


def is_crisis_negated_following(text_after_match: str) -> bool:
    """
    Checks if an acute crisis phrase is negated by a succeeding negation in the same clause
    (critical in Indo-Aryan SOV syntax like Hindi/Hinglish: e.g., 'marne ka man nahi hai').
    Strictly anchored at ^\\s* to prevent unrelated negations in coordinated clauses
    (e.g., 'I want to die and I am not happy') from suppressing the crisis phrase.
    """
    return bool(POST_VERBAL_NEGATION_REGEX.search(text_after_match))


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
    norm_text = unicodedata.normalize("NFKC", reflection).strip().lower()
    if norm_text:
        has_crisis_keyword = False
        # Mask benign idioms first so colloquial hyperbole does not trigger crisis rules
        masked_text = norm_text
        for idiom in BENIGN_IDIOM_PATTERNS:
            masked_text = re.sub(idiom, " [IDIOM] ", masked_text, flags=re.IGNORECASE)

        # Check acute crisis indicators with sentence & clause boundary isolation
        for pattern in ACUTE_CRISIS_PATTERNS:
            for match in re.finditer(pattern, masked_text):
                # Isolate academic contexts to the specific quoted sentence
                if is_in_academic_quote(masked_text, match.start(), match.end()):
                    continue

                # Check preceding negation in the current clause
                text_before = masked_text[: match.start()]
                if is_crisis_negated(text_before):
                    continue

                # Check strict anchored post-verbal negation (Hindi/Hinglish SOV syntax)
                text_after = masked_text[match.end() :]
                if is_crisis_negated_following(text_after):
                    continue

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
            # Check broader distress language (non-crisis, contributes +1 to cumulative score)
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
