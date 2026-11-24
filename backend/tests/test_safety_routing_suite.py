"""
Automated Safety, Routing, and AI Bypass Test Suite (Issue #13)
================================================================
Release-blocking test suite for Calmspace's deterministic safety and routing engine.

Workstream:
1. Deterministic safety scoring boundary tests (mood, stress, sleep, cumulative tiers).
2. Crisis override precedence (acute keywords, mood 1, stress 5, rule stability).
3. Repeated low-mood history semantics (3 consecutive <=2 entries, trend isolation, format resilience).
4. Multilingual phrase-corpus regression (65 labelled entries across en-Latn, hi-Latn, hi-Deva).
5. Negation and benign-lookalike tests (preceding/post-verbal negation, sentence boundaries, idioms, academic context).
6. High-route AI bypass verification (zero provider calls, consent irrelevance, urgent support contacts).

Safety Boundary:
`backend/app/services/safety_evaluator.py` is strictly immutable.
"""

import json
import os
import sys
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.models.schemas import CheckInRecord
from app.services.ai_guidance import generate_supportive_guidance
from app.services.ai_providers.mock_provider import MockAIProvider
from app.services.safety_evaluator import (
    RULE_CONSECUTIVE_LOW_MOOD,
    RULE_CRISIS_OVERRIDE,
    RULE_MOOD_VERY_LOW,
    RULE_SLEEP_CRITICAL,
    RULE_SLEEP_SHORT,
    RULE_STRESS_VERY_HIGH,
    evaluate,
    validate_checkin_inputs,
)

CORPUS_PATH = os.path.join(os.path.dirname(__file__), "data", "safety_corpus.json")


# ============================================================================
# 1. DETERMINISTIC SAFETY SCORING BOUNDARY TESTS
# ============================================================================


class TestScoringBoundaries:
    """Rigorous boundary value testing for mood, stress, sleep, and score thresholds."""

    @pytest.mark.parametrize("mood", [1, 2, 3, 4, 5])
    def test_valid_mood_boundaries(self, mood: int):
        """All integers between 1 and 5 are strictly valid mood inputs."""
        validate_checkin_inputs(mood=mood, stress=3, sleep_hours=7.0)

    @pytest.mark.parametrize(
        "invalid_mood",
        [0, -1, -99, 6, 7, 10, 100, 1.0, 2.5, "1", "3", True, False, None, [], {}],
    )
    def test_invalid_mood_rejected(self, invalid_mood):
        """Non-integer, boolean, or out-of-range mood values raise ValueError."""
        with pytest.raises(ValueError, match="Mood must be an integer between 1 and 5"):
            validate_checkin_inputs(mood=invalid_mood, stress=3, sleep_hours=7.0)

    @pytest.mark.parametrize("stress", [1, 2, 3, 4, 5])
    def test_valid_stress_boundaries(self, stress: int):
        """All integers between 1 and 5 are strictly valid stress inputs."""
        validate_checkin_inputs(mood=3, stress=stress, sleep_hours=7.0)

    @pytest.mark.parametrize(
        "invalid_stress",
        [0, -1, -50, 6, 7, 10, 100, 1.0, 3.5, "4", True, False, None, [], {}],
    )
    def test_invalid_stress_rejected(self, invalid_stress):
        """Non-integer, boolean, or out-of-range stress values raise ValueError."""
        with pytest.raises(
            ValueError, match="Stress must be an integer between 1 and 5"
        ):
            validate_checkin_inputs(mood=3, stress=invalid_stress, sleep_hours=7.0)

    @pytest.mark.parametrize(
        "sleep",
        [0.0, 0.1, 1.0, 3.99, 4.0, 5.99, 6.0, 8.0, 12.0, 23.99, 24.0, 0, 8, 24],
    )
    def test_valid_sleep_boundaries(self, sleep):
        """Sleep between 0.0 and 24.0 (int or float) is valid."""
        validate_checkin_inputs(mood=3, stress=3, sleep_hours=sleep)

    @pytest.mark.parametrize(
        "invalid_sleep",
        [
            -0.001,
            -1.0,
            -10.0,
            24.001,
            25.0,
            100.0,
            float("nan"),
            float("inf"),
            float("-inf"),
            True,
            False,
            "7.0",
            None,
            [],
            {},
        ],
    )
    def test_invalid_sleep_rejected(self, invalid_sleep):
        """Negative, >24.0, non-finite, boolean, or string sleep values raise ValueError."""
        with pytest.raises(
            ValueError,
            match="Sleep duration must be a finite number between 0.0 and 24.0 hours",
        ):
            validate_checkin_inputs(mood=3, stress=3, sleep_hours=invalid_sleep)

    def test_sleep_rule_exact_boundaries(self):
        """
        Verify precise transition thresholds for sleep rules:
        - sleep < 4.0: RULE_SLEEP_CRITICAL (+2 pts)
        - 4.0 <= sleep < 6.0: RULE_SLEEP_SHORT (+1 pt)
        - sleep >= 6.0: No sleep penalty (0 pts)
        """
        # Exactly below 4.0 -> CRITICAL (+2)
        res_3_99 = evaluate({"mood": 3, "stress": 2, "sleep_hours": 3.999})
        assert any(r.rule_id == RULE_SLEEP_CRITICAL for r in res_3_99.triggered_rules)
        assert not any(r.rule_id == RULE_SLEEP_SHORT for r in res_3_99.triggered_rules)
        assert res_3_99.score == 2

        # Exactly 4.0 -> SHORT (+1), NOT critical
        res_4_0 = evaluate({"mood": 3, "stress": 2, "sleep_hours": 4.0})
        assert any(r.rule_id == RULE_SLEEP_SHORT for r in res_4_0.triggered_rules)
        assert not any(
            r.rule_id == RULE_SLEEP_CRITICAL for r in res_4_0.triggered_rules
        )
        assert res_4_0.score == 1

        # Exactly below 6.0 (5.999) -> SHORT (+1)
        res_5_99 = evaluate({"mood": 3, "stress": 2, "sleep_hours": 5.999})
        assert any(r.rule_id == RULE_SLEEP_SHORT for r in res_5_99.triggered_rules)
        assert res_5_99.score == 1

        # Exactly 6.0 -> 0 points (No sleep rule triggered)
        res_6_0 = evaluate({"mood": 3, "stress": 2, "sleep_hours": 6.0})
        assert not any(
            r.rule_id in (RULE_SLEEP_CRITICAL, RULE_SLEEP_SHORT)
            for r in res_6_0.triggered_rules
        )
        assert res_6_0.score == 0

    def test_cumulative_score_tier_transitions(self):
        """
        Cumulative score transitions:
        Score <= 1: LOW
        Score 2..4: MEDIUM
        Score >= 5: HIGH
        """
        # Score 0 -> LOW
        s0 = evaluate({"mood": 4, "stress": 2, "sleep_hours": 8.0})
        assert s0.score == 0 and s0.route == "LOW" and s0.ai_eligible is True

        # Score 1 -> LOW (boundary)
        s1_stress = evaluate({"mood": 4, "stress": 3, "sleep_hours": 8.0})
        assert s1_stress.score == 1 and s1_stress.route == "LOW"

        s1_sleep = evaluate({"mood": 4, "stress": 2, "sleep_hours": 5.0})
        assert s1_sleep.score == 1 and s1_sleep.route == "LOW"

        s1_text = evaluate(
            {
                "mood": 4,
                "stress": 2,
                "sleep_hours": 8.0,
                "reflection": "Feeling burned out with work.",
            }
        )
        assert s1_text.score == 1 and s1_text.route == "LOW"

        # Score 2 -> MEDIUM (lower boundary of MEDIUM)
        s2_mood = evaluate({"mood": 2, "stress": 2, "sleep_hours": 8.0})
        assert (
            s2_mood.score == 2
            and s2_mood.route == "MEDIUM"
            and s2_mood.ai_eligible is True
        )

        s2_stress = evaluate({"mood": 3, "stress": 4, "sleep_hours": 8.0})
        assert s2_stress.score == 2 and s2_stress.route == "MEDIUM"

        s2_sleep = evaluate({"mood": 3, "stress": 2, "sleep_hours": 3.0})
        assert s2_sleep.score == 2 and s2_sleep.route == "MEDIUM"

        # Score 3 -> MEDIUM
        s3 = evaluate({"mood": 2, "stress": 3, "sleep_hours": 8.0})  # 2 + 1 = 3
        assert s3.score == 3 and s3.route == "MEDIUM"

        # Score 4 -> MEDIUM (upper boundary of MEDIUM)
        s4 = evaluate({"mood": 2, "stress": 4, "sleep_hours": 8.0})  # 2 + 2 = 4
        assert s4.score == 4 and s4.route == "MEDIUM" and s4.ai_eligible is True

        # Score 5 -> HIGH (lower boundary of HIGH without acute crisis)
        s5 = evaluate({"mood": 2, "stress": 4, "sleep_hours": 5.5})  # 2 + 2 + 1 = 5
        assert s5.score == 5 and s5.route == "HIGH"
        assert s5.ai_eligible is False
        assert s5.requires_human_escalation is True
        assert s5.crisis_flag is False  # Derived from score, not acute crisis flag

        # Score 6 -> HIGH (Issue #2 agreed triple condition: mood 2 + stress 4 + sleep 3.5)
        s6 = evaluate({"mood": 2, "stress": 4, "sleep_hours": 3.5})  # 2 + 2 + 2 = 6
        assert s6.score == 6 and s6.route == "HIGH"

        # Score 7 -> HIGH (mood 2 + stress 4 + sleep 3.5 + distress keyword)
        s7 = evaluate(
            {
                "mood": 2,
                "stress": 4,
                "sleep_hours": 3.5,
                "reflection": "Feeling extremely overwhelmed.",
            }
        )
        assert s7.score == 7 and s7.route == "HIGH"

        # Score 8 -> HIGH (mood 2 + stress 4 + sleep 3.5 + consecutive mood history [2, 2])
        s8 = evaluate(
            {
                "mood": 2,
                "stress": 4,
                "sleep_hours": 3.5,
            },
            history=[{"mood": 2}, {"mood": 2}],
        )
        assert s8.score == 8 and s8.route == "HIGH"


# ============================================================================
# 2. CRISIS OVERRIDE PRECEDENCE TESTS
# ============================================================================


class TestCrisisOverridePrecedence:
    """Verifies that acute crisis indicators take absolute precedence over all other inputs."""

    def test_acute_phrase_overrides_healthy_baseline(self):
        """Even with optimal baseline metrics (mood 5, stress 1, sleep 9), crisis phrase routes to HIGH."""
        res = evaluate(
            {
                "mood": 5,
                "stress": 1,
                "sleep_hours": 9.0,
                "reflection": "I want to die.",
            }
        )
        assert res.route == "HIGH"
        assert res.crisis_flag is True
        assert res.ai_eligible is False
        assert res.requires_human_escalation is True
        rule_ids = [r.rule_id for r in res.triggered_rules]
        assert RULE_CRISIS_OVERRIDE in rule_ids

    def test_mood_1_acute_override(self):
        """Mood = 1 immediately triggers crisis override to HIGH."""
        res = evaluate(
            {
                "mood": 1,
                "stress": 1,
                "sleep_hours": 8.0,
                "reflection": "A calm, peaceful day with no issues.",
            }
        )
        assert res.route == "HIGH"
        assert res.crisis_flag is True
        assert res.ai_eligible is False
        assert res.requires_human_escalation is True
        rule_ids = [r.rule_id for r in res.triggered_rules]
        assert RULE_MOOD_VERY_LOW in rule_ids

    def test_stress_5_acute_override(self):
        """Stress = 5 immediately triggers crisis override to HIGH."""
        res = evaluate(
            {
                "mood": 5,
                "stress": 5,
                "sleep_hours": 8.0,
                "reflection": "Great mood but under overwhelming pressure.",
            }
        )
        assert res.route == "HIGH"
        assert res.crisis_flag is True
        assert res.ai_eligible is False
        assert res.requires_human_escalation is True
        rule_ids = [r.rule_id for r in res.triggered_rules]
        assert RULE_STRESS_VERY_HIGH in rule_ids

    def test_simultaneous_crisis_triggers_coexist(self):
        """When multiple acute triggers coincide (mood 1 + stress 5 + crisis phrase), all rules record cleanly."""
        res = evaluate(
            {
                "mood": 1,
                "stress": 5,
                "sleep_hours": 2.0,
                "reflection": "I cannot go on anymore, I want to kill myself.",
            }
        )
        assert res.route == "HIGH"
        assert res.crisis_flag is True
        assert res.ai_eligible is False
        rule_ids = [r.rule_id for r in res.triggered_rules]
        assert RULE_CRISIS_OVERRIDE in rule_ids
        assert RULE_MOOD_VERY_LOW in rule_ids
        assert RULE_STRESS_VERY_HIGH in rule_ids
        assert RULE_SLEEP_CRITICAL in rule_ids

    def test_rule_metadata_integrity(self):
        """Every rule trigger contains non-empty rule_id, name, points >= 1, and rationale."""
        res = evaluate(
            {
                "mood": 2,
                "stress": 4,
                "sleep_hours": 3.0,
                "reflection": "burned out",
                "history": [{"mood": 2}, {"mood": 2}],
            }
        )
        assert len(res.triggered_rules) >= 4
        for trigger in res.triggered_rules:
            assert isinstance(trigger.rule_id, str) and trigger.rule_id.startswith(
                "RULE_"
            )
            assert isinstance(trigger.name, str) and len(trigger.name) > 3
            assert isinstance(trigger.points, int) and trigger.points >= 1
            assert isinstance(trigger.rationale, str) and len(trigger.rationale) > 10


# ============================================================================
# 3. REPEATED LOW-MOOD HISTORY SEMANTICS
# ============================================================================


class TestRepeatedLowMoodHistory:
    """Tests the semantics of 3 consecutive low-mood check-ins (mood <= 2)."""

    def test_history_length_boundary_conditions(self):
        """History requires current mood <= 2 AND exactly preceding 2 check-ins with mood <= 2."""
        # 0 past check-ins + current 2 -> Does NOT trigger
        r0 = evaluate({"mood": 2, "stress": 2, "sleep_hours": 7.0}, history=[])
        assert not any(
            r.rule_id == RULE_CONSECUTIVE_LOW_MOOD for r in r0.triggered_rules
        )

        # 1 past check-in (mood 2) + current 2 -> Does NOT trigger
        r1 = evaluate(
            {"mood": 2, "stress": 2, "sleep_hours": 7.0},
            history=[{"mood": 2}],
        )
        assert not any(
            r.rule_id == RULE_CONSECUTIVE_LOW_MOOD for r in r1.triggered_rules
        )

        # 2 past check-ins (both mood <= 2) + current 2 -> TRIGGERS (+2 points)
        r2 = evaluate(
            {"mood": 2, "stress": 2, "sleep_hours": 7.0},
            history=[{"mood": 2}, {"mood": 2}],
        )
        assert any(r.rule_id == RULE_CONSECUTIVE_LOW_MOOD for r in r2.triggered_rules)
        assert r2.score == 4  # mood 2 (+2) + consecutive (+2) = 4 (MEDIUM)

        # 2 past check-ins with mood 1 and 2 + current 1 -> TRIGGERS
        r2_b = evaluate(
            {"mood": 1, "stress": 2, "sleep_hours": 7.0},
            history=[{"mood": 1}, {"mood": 2}],
        )
        assert any(r.rule_id == RULE_CONSECUTIVE_LOW_MOOD for r in r2_b.triggered_rules)

    def test_streak_interruption_at_various_positions(self):
        """A mood > 2 at any point in the 3-entry sequence breaks the streak."""
        # Current mood is 3 (> 2) with past [2, 2] -> Does NOT trigger
        r_curr_high = evaluate(
            {"mood": 3, "stress": 2, "sleep_hours": 7.0},
            history=[{"mood": 2}, {"mood": 2}],
        )
        assert not any(
            r.rule_id == RULE_CONSECUTIVE_LOW_MOOD for r in r_curr_high.triggered_rules
        )

        # Past immediately preceding is 3: [2, 3] + current 2 -> Does NOT trigger
        r_prev_break = evaluate(
            {"mood": 2, "stress": 2, "sleep_hours": 7.0},
            history=[{"mood": 2}, {"mood": 3}],
        )
        assert not any(
            r.rule_id == RULE_CONSECUTIVE_LOW_MOOD for r in r_prev_break.triggered_rules
        )

        # Past 2 entries ago is 4: [4, 2] + current 2 -> Does NOT trigger
        r_prev2_break = evaluate(
            {"mood": 2, "stress": 2, "sleep_hours": 7.0},
            history=[{"mood": 4}, {"mood": 2}],
        )
        assert not any(
            r.rule_id == RULE_CONSECUTIVE_LOW_MOOD
            for r in r_prev2_break.triggered_rules
        )

        # Longer history with earlier highs: [5, 4, 2, 2] + current 2 -> TRIGGERS (last 2 in history were <= 2)
        r_longer = evaluate(
            {"mood": 2, "stress": 2, "sleep_hours": 7.0},
            history=[{"mood": 5}, {"mood": 4}, {"mood": 2}, {"mood": 2}],
        )
        assert any(
            r.rule_id == RULE_CONSECUTIVE_LOW_MOOD for r in r_longer.triggered_rules
        )

    def test_history_format_polymorphism(self):
        """History handles dicts, CheckInRecord Pydantic models, and custom objects seamlessly."""
        pydantic_history = [
            CheckInRecord(
                id="rec-1",
                session_id="s1",
                timestamp="2026-11-20T10:00:00Z",
                mood=2,
                stress=2,
                sleep_hours=7.0,
                route="MEDIUM",
            ),
            CheckInRecord(
                id="rec-2",
                session_id="s1",
                timestamp="2026-11-21T10:00:00Z",
                mood=1,
                stress=3,
                sleep_hours=6.0,
                route="HIGH",
            ),
        ]
        res = evaluate(
            {"mood": 2, "stress": 2, "sleep_hours": 7.0}, history=pydantic_history
        )
        assert any(r.rule_id == RULE_CONSECUTIVE_LOW_MOOD for r in res.triggered_rules)

    def test_history_malformed_entries_safely_ignored(self):
        """Non-dict, None, out-of-range, NaN, or boolean moods in history never crash the evaluator."""
        for bad_entry in [
            None,
            {},
            {"mood": None},
            {"mood": "2"},
            {"mood": True},
            {"mood": False},
            {"mood": 0},
            {"mood": 6},
            {"mood": float("nan")},
            {"other_key": 2},
        ]:
            history = [bad_entry, {"mood": 2}]
            res = evaluate(
                {"mood": 2, "stress": 2, "sleep_hours": 7.0}, history=history
            )
            # Bad entry must not trigger false positive
            assert not any(
                r.rule_id == RULE_CONSECUTIVE_LOW_MOOD for r in res.triggered_rules
            )


# ============================================================================
# 4. MULTILINGUAL PHRASE-CORPUS REGRESSION TESTS
# ============================================================================


class TestMultilingualCorpusRegression:
    """Verifies 100% recall and safety guarantees across English, Hinglish, and Devanagari Hindi."""

    @pytest.fixture
    def corpus(self) -> list[dict]:
        with open(CORPUS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)

    def test_corpus_size_and_diversity(self, corpus):
        """Corpus contains >= 65 entries covering English, Hinglish, and Devanagari Hindi."""
        assert len(corpus) >= 65
        scripts = {entry["script"] for entry in corpus}
        assert "en-Latn" in scripts
        assert "hi-Latn" in scripts
        assert "hi-Deva" in scripts

    def test_full_corpus_execution_and_accuracy(self, corpus):
        """Every single corpus item produces the exact expected route and crisis flag."""
        failures = []
        for entry in corpus:
            res = evaluate(
                {
                    "mood": 3,
                    "stress": 2,
                    "sleep_hours": 7.0,
                    "reflection": entry["text"],
                }
            )
            route_ok = res.route == entry["expected_route"]
            crisis_ok = res.crisis_flag == entry["expected_crisis_flag"]
            if not (route_ok and crisis_ok):
                failures.append(
                    f"[{entry['id']}] '{entry['text']}' ({entry['script']}/{entry['category']}): "
                    f"Expected (route={entry['expected_route']}, crisis={entry['expected_crisis_flag']}), "
                    f"Got (route={res.route}, crisis={res.crisis_flag})"
                )
        assert not failures, (
            f"Corpus benchmark failures ({len(failures)}):\n" + "\n".join(failures)
        )

    @pytest.mark.parametrize(
        "phrase",
        [
            # English
            "I am suicidal",
            "I want to kill myself",
            "Planning to end my life",
            "No reason to live anymore",
            "Better off dead",
            "Cutting myself again",
            "I want to overdose",
            # Hinglish (hi-Latn)
            "Marne ka man kar raha hai",
            "Ab aur nahi jiya jata",
            "Apne aap ko khatam kar dunga",
            "Apni jaan de dunga",
            "Khudkushi karne ka socha hai",
            "Aatmhatya karne ka time aa gaya",
            "Jeene ka mann nahi hai",
            # Devanagari Hindi (hi-Deva)
            "आत्महत्या करने का ख्याल आ रहा है",
            "मरने का मन कर रहा है",
            "अपनी जान दे दूंगा",
            "खुद को खत्म कर लेना चाहता हूँ",
            "जीने की कोई इच्छा नहीं बची",
            "सब कुछ खत्म कर लेना चाहता हूँ",
        ],
    )
    def test_direct_crisis_phrases_across_languages(self, phrase: str):
        """Direct crisis statements in en, hi-Latn, and hi-Deva strictly trigger HIGH."""
        res = evaluate(
            {"mood": 3, "stress": 2, "sleep_hours": 7.0, "reflection": phrase}
        )
        assert res.route == "HIGH", f"Failed for: {phrase}"
        assert res.crisis_flag is True, f"Crisis flag missing for: {phrase}"
        assert res.ai_eligible is False
        assert res.requires_human_escalation is True

    @pytest.mark.parametrize(
        "misspelling",
        [
            "I have thoughts of suicde",
            "Feeling sucidial today",
            "thinking of suecide",
            "k!ll myself",
            "k*ll myself",
            "want to end my lyfe",
        ],
    )
    def test_misspelling_and_leetspeak_variants(self, misspelling: str):
        """Common typos and leetspeak evasions are reliably caught."""
        res = evaluate(
            {"mood": 3, "stress": 2, "sleep_hours": 7.0, "reflection": misspelling}
        )
        assert res.route == "HIGH"
        assert res.crisis_flag is True

    def test_unicode_normalization_case_insensitivity(self):
        """NFKC normalization ensures mixed case, full uppercase, and decomposed accents work."""
        phrases = [
            "I WANT TO KILL MYSELF",
            "SuIcIdAl ThOuGhTs",
            "MARNE KA MANN HAI",
            "आत्महत्या",
        ]
        for p in phrases:
            res = evaluate(
                {"mood": 3, "stress": 2, "sleep_hours": 7.0, "reflection": p}
            )
            assert res.route == "HIGH"
            assert res.crisis_flag is True


# ============================================================================
# 5. NEGATION AND BENIGN-LOOKALIKE TESTS
# ============================================================================


class TestNegationAndBenignLookalikes:
    """Verifies that negations, benign idioms, and academic context do not trigger false-positive escalations."""

    @pytest.mark.parametrize(
        "negated_reflection",
        [
            # English
            "I am not suicidal at all.",
            "I don't want to die, just feeling exhausted.",
            "I would never hurt myself or self-harm.",
            "I have no thoughts of suicide whatsoever.",
            "No longer feeling suicidal.",
            "Without wanting to die, I just need rest.",
            # Hinglish (preceding and post-verbal SOV)
            "Marne ka man nahi hai bilkul.",
            "Marne ka mann nahi hai, bas thoda stress hai.",
            "Khud ko harm nahi karna chahta.",
            "Jaan nahi dena chahta bas thak gaya hoon.",
            "Main suicide nahi karunga.",
            "Apni jaan lene ki koi ichha nahi hai.",
            "Kabhi nahi socha aatmahatya ke baare mein.",
            # Devanagari Hindi
            "मरने का मन नहीं है।",
            "मरने की कोई इच्छा नहीं है, बस थोड़ी चिंता है।",
            "मैं आत्महत्या नहीं करना चाहता।",
            "खुद को नुकसान पहुँचाने का कोई इरादा नहीं है।",
        ],
    )
    def test_genuine_negations_suppress_crisis_flag(self, negated_reflection: str):
        """Properly negated statements do NOT trigger crisis override."""
        res = evaluate(
            {
                "mood": 3,
                "stress": 2,
                "sleep_hours": 7.0,
                "reflection": negated_reflection,
            }
        )
        assert res.crisis_flag is False, (
            f"False positive crisis for: '{negated_reflection}'"
        )
        assert res.route != "HIGH"

    @pytest.mark.parametrize(
        "boundary_stmt",
        [
            # English sentence delimiters (. ! ? ; \n)
            "I am not sad. I want to die.",
            "I am not hungry! I want to kill myself.",
            "I am not tired; I cannot go on anymore.",
            "Not feeling great today.\nI want to end my life.",
            "I don't know what to say. I want to end it all.",
            # Contrastive conjunctions (but, however, yet, lekin, magar, par)
            "I am not doing poorly in exams, but I want to kill myself.",
            "I am not stressed, however I want to end my life.",
            "Main udaas nahi hoon, lekin marne ka man kar raha hai.",
            "Mujhe koi pareshani nahi hai, magar apne aap ko khatam karna chahta hoon.",
            # Hindi danda delimiters (। ॥)
            "मुझे भूख नहीं है। मरने का मन कर रहा है।",
            "मुझे कोई चिंता नहीं है। मैं आत्महत्या करना चाहता हूँ।",
        ],
    )
    def test_sentence_and_clause_boundaries_isolate_negations(self, boundary_stmt: str):
        """Negation in an earlier sentence or contrastive clause NEVER suppresses crisis in subsequent clause."""
        res = evaluate(
            {
                "mood": 3,
                "stress": 2,
                "sleep_hours": 7.0,
                "reflection": boundary_stmt,
            }
        )
        assert res.crisis_flag is True, (
            f"Failed to catch crisis across boundary in: '{boundary_stmt}'"
        )
        assert res.route == "HIGH"
        assert res.ai_eligible is False

    @pytest.mark.parametrize(
        "idiom",
        [
            # English
            "I am dead tired after working on my dissertation all night.",
            "We were literally dying of laughter at the comedy show.",
            "You are totally killing it with your presentation!",
            "This economics midterm is killing me right now.",
            "I would die for a hot bowl of ramen right now.",
            "She looked drop dead gorgeous at the event.",
            # Hinglish
            "Assignment submit karne mein jaan nikal gayi.",
            "Din bhar pedal chal kar thak ke mar gaya.",
            "Dosto ke sath baith ke has has ke mar gaya.",
            "Coding round mein sab questions kill kar diya maine.",
            "Bhookh ke mare halat kharab hai.",
            # Devanagari Hindi
            "आज दिन भर काम करके जान निकल गई।",
            "हम सब हंस हंस कर लोटपोट हो गए।",
        ],
    )
    def test_benign_idioms_do_not_trigger_crisis(self, idiom: str):
        """Colloquial idioms using 'die', 'kill', 'jaan', or 'mar' must NOT trigger crisis override."""
        res = evaluate(
            {
                "mood": 3,
                "stress": 2,
                "sleep_hours": 7.0,
                "reflection": idiom,
            }
        )
        assert res.crisis_flag is False, (
            f"Benign idiom falsely triggered crisis: '{idiom}'"
        )
        assert res.route != "HIGH"

    def test_academic_and_quoted_inquiry_isolation(self):
        """Objective academic discussions of suicide are exempted, but personal intent invalidates exemption."""
        # Pure objective academic discussion -> Not crisis
        academic_ok = evaluate(
            {
                "mood": 3,
                "stress": 2,
                "sleep_hours": 7.0,
                "reflection": "In my philosophy class, the professor asked why people commit suicide.",
            }
        )
        assert academic_ok.crisis_flag is False

        # Personal disclosure inside academic sentence -> TRIGGERS crisis
        academic_crisis = evaluate(
            {
                "mood": 3,
                "stress": 2,
                "sleep_hours": 7.0,
                "reflection": "In my philosophy class, I realized that I want to kill myself.",
            }
        )
        assert academic_crisis.crisis_flag is True
        assert academic_crisis.route == "HIGH"

    def test_post_verbal_negation_anchoring_prevents_leakage(self):
        """
        Post-verbal negation regex must be strictly anchored to avoid suppressing crisis
        when 'nahi' appears in an unrelated subsequent statement.
        """
        # "I want to die, and I am not joking" -> MUST trigger crisis
        res = evaluate(
            {
                "mood": 3,
                "stress": 2,
                "sleep_hours": 7.0,
                "reflection": "I want to die and I am not joking.",
            }
        )
        assert res.crisis_flag is True
        assert res.route == "HIGH"


# ============================================================================
# 6. HIGH-ROUTE AI BYPASS INTEGRATION TESTS
# ============================================================================


class TestHighRouteAIBypassIntegration:
    """Verifies that HIGH/crisis check-ins strictly bypass AI with zero calls and proper escalation."""

    def test_zero_provider_calls_on_high_route(self):
        """The AI provider mock receives exactly 0 calls for any HIGH route request."""
        mock_provider = MockAIProvider()

        # 1. Critical mood
        res1 = generate_supportive_guidance(
            route="HIGH",
            mood=1,
            stress=3,
            sleep_hours=7.0,
            reflection="I am safe, just checking",
            consent_given=True,
            provider=mock_provider,
        )
        assert res1 is None
        assert mock_provider.call_count == 0

        # 2. Acute crisis reflection
        res2 = generate_supportive_guidance(
            route="HIGH",
            mood=4,
            stress=2,
            sleep_hours=8.0,
            reflection="I want to kill myself",
            consent_given=True,
            provider=mock_provider,
        )
        assert res2 is None
        assert mock_provider.call_count == 0

        # 3. Cumulative score threshold (score >= 5)
        res3 = generate_supportive_guidance(
            route="HIGH",
            mood=2,
            stress=4,
            sleep_hours=3.5,
            consent_given=True,
            provider=mock_provider,
        )
        assert res3 is None
        assert mock_provider.call_count == 0

    def test_fastapi_checkin_endpoint_full_high_route_contract(self):
        """
        Full HTTP integration test via TestClient:
        - Route is HIGH
        - ai_eligible is False
        - guidance is None
        - support_contacts contains urgent verified resources (Tele-MANAS, 112)
        - AI service is not invoked
        - Reflection text is NEVER stored in check-in history
        """
        client = TestClient(app)
        session_id = "test-session-issue-13-high-bypass"

        with patch(
            "app.routers.checkin.generate_supportive_guidance"
        ) as mock_guidance_fn:
            response = client.post(
                "/api/checkin",
                json={
                    "mood": 1,
                    "stress": 5,
                    "sleep_hours": 2.0,
                    "reflection": "SENTINEL_CRISIS_TEXT: I want to end my life tonight.",
                    "consent_ai_processing": True,
                },
                headers={"x-session-id": session_id},
            )

            assert response.status_code == 200
            data = response.json()

            # Safety evaluation integrity
            safety = data["safety"]
            assert safety["route"] == "HIGH"
            assert safety["crisis_flag"] is True
            assert safety["ai_eligible"] is False
            assert safety["requires_human_escalation"] is True
            assert "Let's get you support" in safety["status_label"]

            # AI guidance strictly bypassed
            assert data["guidance"] is None
            mock_guidance_fn.assert_not_called()

            # Urgent support contacts provided
            contacts = data["support_contacts"]
            assert len(contacts) >= 2
            urgent_ids = [c["id"] for c in contacts]
            assert "tele-manas" in urgent_ids
            assert "national-emergency" in urgent_ids
            # Tele-MANAS and National Emergency single helpline are flagged urgent
            tele_manas = next(c for c in contacts if c["id"] == "tele-manas")
            emergency = next(c for c in contacts if c["id"] == "national-emergency")
            assert tele_manas["is_urgent"] is True
            assert emergency["is_urgent"] is True

            # Data privacy: reflection text is NEVER stored in check-in history
            history_res = client.get(
                "/api/checkin/history", headers={"x-session-id": session_id}
            )
            assert history_res.status_code == 200
            history_data = history_res.json()
            assert len(history_data) >= 1
            latest_record = history_data[-1]
            assert latest_record["route"] == "HIGH"
            assert latest_record["mood"] == 1
            # Explicitly assert reflection field does not exist or sentinel text is absent
            assert "reflection" not in latest_record
            history_dump = json.dumps(history_data)
            assert "SENTINEL_CRISIS_TEXT" not in history_dump

    def test_non_diagnostic_and_supportive_language_guarantee(self):
        """Status label and summary use supportive, non-diagnostic, non-clinical language."""
        for mood, stress, sleep in [(1, 5, 2.0), (3, 3, 7.0), (5, 1, 8.0)]:
            res = evaluate({"mood": mood, "stress": stress, "sleep_hours": sleep})
            text = f"{res.status_label} {res.status_summary}".lower()

            # Must NEVER use clinical diagnostic pathology labels
            prohibited_clinical = [
                "depression",
                "depressive",
                "anxiety disorder",
                "diagnosed",
                "pathology",
                "psychiatric",
                "bipolar",
                "mental illness",
            ]
            for term in prohibited_clinical:
                assert term not in text, (
                    f"Prohibited clinical term '{term}' found in evaluation text: {text}"
                )

            # Must NEVER make false absolute guarantees of safety
            prohibited_guarantees = [
                "100% safe",
                "guaranteed safe",
                "proof of health",
                "cured",
            ]
            for term in prohibited_guarantees:
                assert term not in text, (
                    f"Prohibited safety guarantee '{term}' found: {text}"
                )
