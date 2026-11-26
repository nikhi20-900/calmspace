# Calmspace System Architecture & Contributor Boundaries

> **Core Motto**: *Rules decide safety. AI writes the language. Humans help.*

Calmspace is an emotionally comforting, privacy-first university student wellbeing companion. This document defines the system boundaries, module ownership across the four team contributors, branching workflow, and safety-critical isolation rules.

---

## 1. Workstream Ownership & Module Boundaries

| Workstream | Primary Owner | Module Boundaries & Directory Ownership |
|---|---|---|
| **Member 1: Frontend Foundation & UX** | Member 1 | `frontend/src/pages/`, `frontend/src/components/`, `frontend/src/styles/`<br>• Interactive 3D mascot (`BlobController.tsx`, `BlobScene.tsx`)<br>• Single-column check-in flow & inputs<br>• Recharts wellbeing visualisations<br>• Student dashboard & navigation shell |
| **Member 2: Safety & Routing Engine** | Member 2 | `backend/app/services/safety_evaluator.py`, `backend/tests/data/safety_corpus.json`, `docs/safety_corpus.md`<br>• Pure deterministic rule engine (no network, no DB, no LLM)<br>• Multilingual crisis phrase detection (English, Devanagari, Hinglish)<br>• Automated safety test suites |
| **Member 3: AI Supportive Guidance** | Member 3 | `backend/app/services/ai_guidance.py`<br>• Empathetic supportive language generation for Low/Medium routes<br>• Strict prompt guardrails preventing clinical diagnoses<br>• Guaranteed non-AI deterministic fallback |
| **Member 4: Persistence, Analytics & Integration** | **@roushan-23** | `backend/app/services/storage.py`, `backend/app/services/analytics.py`, `backend/app/routers/insights.py`, `docs/api_contracts.md`, configuration & deployment<br>• SQLite WAL anonymous session persistence & session isolation<br>• Zero-storage policy for student reflections & configurable retention pruning<br>• Privacy-preserving analytics aggregation<br>• Shared contracts & local/cloud environment orchestration |

---

## 2. The Deterministic Safety Boundary & AI Bypass Rule

The system architecture enforces a strict physical boundary between **Safety Evaluation** and **AI Generation**:

```mermaid
flowchart TD
    Client["Frontend Check-In (React)"] -->|POST /api/checkin| FastAPI["FastAPI Router"]
    FastAPI -->|CheckInRequest + History| SafetyEngine["Safety Evaluator (Pure Function)"]
    
    subgraph PureEngine ["Pure Safety Engine (Zero I/O)"]
        SafetyEngine --> Scoring["Compute Mood, Stress, Sleep Scores"]
        SafetyEngine --> CorpusMatch["Multilingual Crisis Phrase Match"]
        Scoring --> DecisionMatrix["Deterministic Rule Matrix"]
        CorpusMatch --> DecisionMatrix
    end
    
    DecisionMatrix --> RoutingResult["RoutingResult (Low / Medium / High)"]
    
    RoutingResult --> CheckRoute{Route == High or Crisis Flag?}
    
    CheckRoute -->|YES: HIGH / CRISIS| BypassAI["AI STRICTLY BYPASSED\nZero LLM API Calls\nServe Escalation & Verified Helplines"]
    CheckRoute -->|NO: LOW / MEDIUM| AIEngine["AI Supportive Language Service\n(Gemini / Safe Fallback)"]
    
    BypassAI --> SaveDB["Persistent Storage (Scores Only - NO REFLECTION)"]
    AIEngine --> SaveDB
    SaveDB --> Response["JSON Response to Student"]
```

### Safety Engine Contract
The safety evaluator (`backend/app/services/safety_evaluator.py`, protected Git blob SHA `8f5e2e984c4ab41212a74a16158200b2c7a126b2`) exposes a pure, synchronous function:
```python
evaluate(checkin: CheckInRequest, history: list[CheckInRecord]) -> SafetyEvaluation
```
* **No Side Effects**: It must **never** perform database queries, network requests, file I/O, or LLM API calls.
* **Non-Overridable**: The frontend and AI service cannot modify or override the calculated `route` or `crisis_flag`.
* **High-Risk AI Bypass**: Whenever `route == "HIGH"` or `crisis_flag == True`, all AI provider calls are completely disabled (`guidance = None`). The student receives immediate access to verified emergency resources (`Tele-MANAS 14416`, `112`, verified NGOs, and labeled Campus Demo placeholder).

---

## 3. Privacy & Session Model

1. **No User Accounts**: Calmspace does not request or store student names, emails, roll numbers, or passwords.
2. **Anonymous Session Token (`X-Session-ID`)**:
   - The frontend generates an anonymous UUID session token (stored locally in `localStorage`).
   - Every API request sends the header: `X-Session-ID: <anonymous_session_id>` (never in URL query parameters).
   - **Architectural Boundary**: All SQLite queries (`checkins`, `tasks`, `user_settings`) enforce strict relational isolation (`WHERE session_id = ?`). Because the MVP uses client-supplied UUIDs without signed JWTs or passwords, relational isolation relies on UUID secrecy rather than cryptographic authentication.
3. **Zero Reflection Retention**:
   - Student free-text reflections are processed in-memory during the check-in request to check for crisis keywords and, if `consent_ai_processing` is strictly `true`, generate supportive guidance on `LOW`/`MEDIUM` routes.
   - **The free-text reflection is never written to the database (`checkins` has no `reflection` column).** Only numeric scores (`mood`, `stress`, `sleep_hours`), the assigned `route`, and the UTC timestamp are persisted.
4. **Configurable Retention & Full 2-Step Data Deletion**:
   - Students choose a `14`, `30` (default), `60`, or `90`-day retention window in Settings; `storage.cleanup_expired_records(session_id)` prunes older check-ins on API request boundaries.
   - Students can permanently purge all data (`checkins`, `tasks`, `user_settings`) associated with their session token in a single atomic SQLite transaction via `DELETE /api/settings/data`.

---

## 4. Contributor Workflow & Git Conventions

- **Default Branch**: `main` (always protected, must pass CI tests).
- **Branch Naming**:
  - `feat/issue-<num>-<short-description>` (e.g. `feat/issue-10-persistent-storage`)
  - `fix/issue-<num>-<short-description>`
- **Commit Messages**: Follow Conventional Commits:
  - `feat(storage): implement SQLite persistence for anonymous check-ins`
  - `fix(safety): handle edge case in sleep hour boundary`
  - `test(backend): add cross-session negative tests`
  - `docs(contracts): update API specification for insights router`
- **Review Requirement**: Any PR modifying `app/services/safety_evaluator.py` or `app/models/schemas.py` requires cross-review by at least two contributors.
