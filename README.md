# Calmspace

> **A quieter space to check in with yourself.**

<p align="center">
  <img src="docs/assets/calmspace_mascot.jpg" alt="Calmspace 3D Mascot — You are doing your best" width="480" style="border-radius: 20px;" />
</p>

<p align="center">
  <strong>A student wellbeing companion built around thoughtful design, deterministic safety, and human support.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active%20Development-5554B8?style=flat-square" alt="Status: Active Development" />
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-61DAFB?style=flat-square" alt="Frontend: React + TypeScript" />
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square" alt="Backend: FastAPI" />
  <img src="https://img.shields.io/badge/Focus-Student%20Wellbeing-DCE9DF?style=flat-square" alt="Focus: Student Wellbeing" />
</p>

---

## 01 — The idea

University life is not just about assignments, attendance, deadlines, and examinations. It is also about the pressure students carry quietly.

Calmspace is a privacy-conscious student wellbeing companion designed to make everyday emotional check-ins feel approachable, supportive, and non-clinical.

It helps students:
- Check in with their mood, stress, and sleep.
- Reflect on patterns in their wellbeing.
- Develop healthier study-life routines.
- Access supportive guidance.
- Reach verified human support when they need it.

Calmspace is **not** a diagnostic tool, a replacement for counselling, or a medical service. It is a supportive space that helps students take a moment for themselves.

$$\text{\textbf{Rules decide safety. AI supports language. Humans provide care.}}$$

---

## 02 — Design philosophy

Calmspace follows a **Soft Editorial Wellness** design direction.

Rather than looking like a conventional SaaS dashboard or clinical assessment portal, the experience is designed to feel like entering a quiet, welcoming room.

### Core Principles

| Principle | How it shapes the product |
|---|---|
| **Calm over clutter** | Clear layouts, generous spacing, restrained motion |
| **Human over clinical** | Friendly language instead of diagnostic labels |
| **Accessible by default** | Keyboard navigation, readable charts, reduced motion |
| **Safety before engagement** | Support actions take priority over decorative content |
| **Privacy-conscious** | Optional reflection and deliberate data handling |

### Visual Identity Tokens

| Token | Hex / Value | Purpose |
|---|---|---|
| **Background** | `#F7F6FB` | Serene, warm canvas |
| **Surface** | `#FFFFFF` | Editorial cards and containers |
| **Primary** | `#5554B8` | Focused actions and calm focus rings |
| **Soft Lavender** | `#E9E7FB` | Secondary containers and accent chips |
| **Soft Peach** | `#F4DCCB` | Warm neutral accents |
| **Soft Sage** | `#DCE9DF` | Healthy recovery indicators |
| **Main Text** | `#25233B` | High contrast, warm ink for effortless readability |
| **Secondary Text** | `#625F78` | Subdued metadata and descriptive copy |

Typography uses **Satoshi** and **Cabinet Grotesk** with system fallbacks.

---

## 03 — Product experience

The application is organized around a simple journey:

1. **Arrive** — Explore the Calmspace landing experience.
2. **Check in** — Record mood, stress, sleep, and an optional reflection.
3. **Understand** — Review wellbeing patterns and supportive summaries.
4. **Take a breath** — Use intentional breaks and study-life planning tools.
5. **Connect** — Reach human support when appropriate.

### Main Product Areas

| Area | Purpose | Status |
|---|---|---|
| **Interactive landing page** | Introduces the Calmspace experience with 3D mascot | Implemented |
| **Daily check-in** | Guided mood, stress, sleep, and opt-in reflection flow | Implemented (Issue #6) |
| **Safety evaluation** | Deterministic multilingual wellbeing routing engine | Implemented (Issue #2, #3, #13) |
| **Application shell** | Responsive navigation and student dashboard | Implemented (Issue #7) |
| **Wellbeing insights** | Accessible Recharts visualizations, tables, and summaries | Implemented (Issue #8, #14) |
| **Study-life planner** | Task CRUD, 5-min breather timer, and in-app pacing | Implemented (Issue #9) |
| **Support network** | Verified helpline directory and high-risk triage | Implemented (Issue #4, #12) |
| **Privacy & retention** | Data inventory modal, 14/30/60/90d pruning, atomic wipe | Implemented (Issue #10, #11) |
| **Deployment & hosting** | Production hosting configuration and health verification | In progress (Issue #15) |

---

## 04 — Architecture

Calmspace separates the user experience, backend safety decisions, supportive language generation, and persistence responsibilities.

### High-Level Architecture

```mermaid
flowchart TD
    U["Student"] --> FE["React + TypeScript Frontend"]
    FE --> LAND["Landing & Dashboard"]
    FE --> CI["Daily Check-in"]
    FE --> INS["Wellbeing Insights"]
    FE --> PLAN["Study-Life Planner"]
    FE --> SUP["Human Support Access"]

    CI --> API["FastAPI Backend"]
    API --> VALID["Input Validation"]
    VALID --> SAFE["Deterministic Safety Evaluator"]

    SAFE --> LOW["Low-risk route"]
    SAFE --> MED["Medium-risk route"]
    SAFE --> HIGH["High-risk route"]

    LOW --> AI["Supportive AI Guidance"]
    MED --> AI
    HIGH --> HUMAN["Human Support Actions"]

    AI --> FALLBACK["Fallback Guidance"]
    FALLBACK --> RESULT["Structured Response"]
    HUMAN --> RESULT
    RESULT --> FE

    API <--> DB["SQLite Persistence (WAL Mode)"]
    DB --> SESSION["Anonymous UUID Scoping (X-Session-ID)"]
    DB --> HISTORY["Numeric Check-ins, Tasks & Settings"]
```

> *Database records are scoped per anonymous client UUID (`WHERE session_id = ?`). See [docs/privacy_data_inventory.md](docs/privacy_data_inventory.md) for relational isolation vs. authenticated ownership boundaries.*

### Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 (`^18.3.1`), TypeScript (`^5.7.2`), Vite (`^6.0.7`) |
| **Styling** | Tailwind CSS, CSS design tokens |
| **Visualization** | Recharts |
| **Interactive graphics** | Three.js, custom GLSL |
| **Backend** | Python, FastAPI, Uvicorn |
| **Validation** | Pydantic (`StrictBool`, bounded numeric validators) |
| **AI integration** | `mock` and `gemini` (`x-goog-api-key`) provider adapters with fail-closed fallback |
| **Testing & Lint** | Pytest (256 backend tests), Ruff, TypeScript (`tsc`) & Vite build |
| **Persistence** | SQLite with WAL mode (`backend/app/services/storage.py`) |

---

## 05 — Safety architecture

Safety is a core architectural responsibility, not a decorative feature.

The backend's deterministic safety evaluator makes routing decisions. The frontend displays the returned route but does not independently calculate or override risk.

### Safety Routing Model

```mermaid
flowchart TD
    A["Student submits check-in"] --> B["Backend validation"]
    B --> C["Deterministic safety evaluation"]
    C --> D{"Risk route"}
    D -->|Low| E["Supportive encouragement"]
    D -->|Medium| F["Grounding and pacing guidance"]
    D -->|High| G["AI bypass"]
    E --> H["Appropriate next steps"]
    F --> H
    G --> I["Human support actions"]
    I --> J["Tele-MANAS: 14416"]
    I --> K["Emergency services: 112"]
    I --> L["Campus support"]
```

### Core Safety Principles

- **Deterministic decisions**: Risk routing is controlled strictly by backend rules.
- **Crisis precedence**: Crisis indicators take precedence over ordinary supportive guidance.
- **High-risk AI bypass**: AI generation is never used on the high-risk route.
- **Fail-safe behavior**: AI provider failures must never undermine safety routing.
- **Human support first**: High-risk experiences prioritize direct, unencumbered support actions.
- **No diagnosis**: Wellbeing indicators are reflective tracking signals, not medical diagnoses.

### Protected Safety Component

```text
backend/app/services/safety_evaluator.py
```

- This file is treated as **immutable**.
- Protected Git blob SHA: `8f5e2e984c4ab41212a74a16158200b2c7a126b2`
- Changes to the evaluator are outside ordinary UI and feature work.
- Any future change requires explicit, separately reviewed authorization.

---

## 06 — Privacy principles

Calmspace aims to minimize unnecessary collection and exposure of sensitive wellbeing information.

### Product Privacy Commitments

1. **Reflection is optional**: Students can check in using ratings alone without text input.
2. **Zero-retention text memory**: Reflection content is never casually included in persistent check-in history.
3. **No intrusive identifiers**: Session identity does not require student roll numbers, logins, or names.
4. **Explicit consent**: Consent is explicit wherever external AI processing is involved.
5. **Backend-enforced deletion**: Data retention and deletion must be enforced by the backend, not merely represented by client controls.

> [!IMPORTANT]
> **Implementation Note on Guarantees**: Privacy guarantees depend on the actual backend and deployment configuration. Anonymous-session persistence, database isolation, retention enforcement, and complete deletion must be verified against their implementation before being described as production guarantees.

---

## 07 — Human support

Calmspace is designed to make human support easy to reach from every screen.

### Verified Support Directory

| Resource | Category | Contact | Verified Source | Last Verified |
|---|---|---|---|---|
| **Tele-MANAS** | National Helpline | `14416` / `1800-891-4416` (24/7) | Ministry of Health & Family Welfare (MoHFW) | `2026-11-20` |
| **Emergency Services** | Urgent Dispatch | `112` (24/7 Instant Dispatch) | Emergency Response Support System (ERSS), MHA | `2026-11-20` |
| **Vandrevala Foundation** | Crisis Counselling | `+91 9999 666 555` (24/7) | Vandrevala Mental Health Registry | `2026-11-20` |
| **iCALL Helpline** | Psychosocial Support | `022-25521111` / `+91 9152 987 821` | School of Human Ecology, TISS | `2026-11-20` |
| **Campus Counselling Unit** | Institutional | *Template Placeholder* | Requires institutional configuration | `Demo` |

> *Institution-specific and other support-directory entries should be published only after their contact details, operating hours, and verification sources have been confirmed. Calmspace does not replace emergency services or professional mental-health care.*

---

## 08 — Development status

Calmspace is being developed incrementally. The following statuses distinguish completed work from active assignments and future scope:

### Implemented
- Interactive Three.js mascot and editorial landing experience (Issue #18 / #28).
- Guided daily check-in flow with single-step focus and same-day update notice (Issue #6).
- Deterministic safety evaluation, multilingual crisis corpus (English, Devanagari, Hinglish), and 256-test automated backend suite (`test_safety_routing_suite.py`, `test_safety_corpus.py`, `test_safety_engine.py`, `test_ai_guidance.py`, `test_analytics.py`, `test_retention.py`, `test_canary_leakage.py`, `test_storage_persistence.py`, `test_backend.py`).
- AI provider abstraction (`mock` / `gemini`), `StrictBool` consent enforcement, output validator, and fail-closed fallback (Issue #5).
- Verified support directory, `is_active` filtering, official source provenance, and high-risk Safe Exit triage (Issue #4, #12).
- Application shell, responsive navigation, student dashboard, accessible Insights charts/tables, and Study-Life Balance Planner with 5-minute breather timer (Issue #7, #8, #9, #14).
- SQLite WAL persistence, configurable `14/30/60/90`-day automated retention pruning, `PrivacyInventoryModal`, `422` validation input sanitization, atomic `DELETE /api/settings/data`, and sentinel-canary leak tests (Issue #10, #11).
- End-to-end hackathon demo script (`docs/demo_journey.md`) (Issue #16).

### Remaining / In Progress
- **Issue #15** — Deployment hardening, production environment/secrets verification, and live demo hosting (`roushan-23`, `mu368651-eng`).
- **Issue #17** — Final documentation consistency review (this guide and `docs/`).

### Documentation Index

| Guide | Scope |
|---|---|
| [Architecture & Boundaries](docs/architecture.md) | Module ownership, safety bypass diagram, SQLite session model |
| [API Contracts](docs/api_contracts.md) | Endpoints, headers, validation rules, error schemas |
| [Privacy & Data Inventory](docs/privacy_data_inventory.md) | Field-level inventory, retention pruning, deletion & limitations |
| [AI Support Service](docs/ai_support_service.md) | Consent, prompt isolation, rate limits, fallback rules |
| [Safety Corpus](docs/safety_corpus.md) | Multilingual crisis patterns and negation rules |
| [High-Risk Escalation](docs/high_risk_escalation.md) | Crisis UI, Safe Exit policy, helpline provenance |
| [Demo Journey](docs/demo_journey.md) | 3–5 minute presentation walkthrough and synthetic personas |
| [DB Architecture Proposal](docs/database_architecture_issue_10.md) | Historical PostgreSQL/Supabase design proposal (current MVP runs SQLite WAL) |

---

## 09 — Team ownership

Clear ownership keeps the project maintainable and prevents accidental changes to protected work.

| Workstream | Owner | Responsibilities |
|---|---|---|
| **UI/UX and application experience** | **Nikhil Chhetri** — [@nikhi20-900](https://github.com/nikhi20-900) | Design system, React application shell, responsive navigation, check-in experience, insights UI |
| **Safety & Risk Engine** | **Nikhil Chhetri** — [@nikhi20-900](https://github.com/nikhi20-900) | Deterministic safety logic ownership, crisis precedence, regression coverage, AI-bypass contracts |
| **Database and anonymous sessions** | **Roushan** — [@roushan-23](https://github.com/roushan-23) | SQLite WAL persistence (`storage.py`), session isolation (`WHERE session_id = ?`), data erasure, analytics, and deployment coordination |
| **AI integration** | **AI workstream** | Provider integration, prompt contracts, fallback behavior, resilience |
| **Support directory** | **Institutional / support workstream** | Contact verification, campus resources, safe support access |

### Ownership Boundaries

- UI contributors should integrate against agreed API contracts rather than independently changing database persistence.
- Database and session changes should be coordinated with the backend owner.
- Safety evaluator changes require explicit authorization and dedicated review.
- Frontend copy must not promise privacy or anonymity beyond what the backend actually enforces.
- Cross-workstream changes should be discussed before implementation.

---

## 10 — Repository structure

```text
calmspace/
├── backend/
│   ├── app/
│   │   ├── core/config.py           # Environment config & .env loader
│   │   ├── models/schemas.py        # Pydantic contracts (StrictBool consent, retention bounds)
│   │   ├── routers/                 # API endpoints (checkin, insights, planner, support_and_settings)
│   │   ├── services/
│   │   │   ├── safety_evaluator.py  # PROTECTED (Immutable risk engine)
│   │   │   ├── ai_guidance.py       # Supportive AI guidance & fallbacks
│   │   │   ├── ai_validation.py     # Prompt safety & output schema validation
│   │   │   ├── ai_providers/        # Mock & Gemini REST adapters
│   │   │   ├── analytics.py         # Non-diagnostic session insight aggregation
│   │   │   ├── support_directory.py # Verified support directory
│   │   │   └── storage.py           # SQLite WAL persistence & automated retention pruning
│   │   └── main.py                  # FastAPI entry point & 422 sanitization handler
│   ├── tests/                       # 256 tests (safety, corpus, AI, analytics, retention, canary, persistence)
│   ├── requirements.txt
│   └── pytest.ini
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── landing/             # Editorial landing page sections
│   │   │   ├── layout/              # AppLayout, Sidebar, MobileNavigation, SupportModal
│   │   │   ├── checkin/             # Mood, stress, sleep, and reflection steps
│   │   │   ├── planner/             # BreatherTimer and pacing components
│   │   │   ├── privacy/             # PrivacyInventoryModal
│   │   │   ├── mascot/              # 3D interactive lavender character
│   │   │   └── ui/                  # Button, Card, Badge, Slider, Dialog primitives
│   │   ├── context/                 # PrivacyModalContext
│   │   ├── pages/                   # Landing, Overview, CheckIn, CheckInResult, Insights, Planner, Support, Settings
│   │   ├── services/                # API client and canonical fallback support directory
│   │   ├── styles/                  # Design tokens, typography, and animations
│   │   ├── types/                   # TypeScript interfaces
│   │   ├── App.tsx                  # React Router routes & modal provider
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                            # Architecture, API contracts, privacy inventory, safety & demo guides
└── package.json
```

---

## 11 — Getting started

### Prerequisites

- Node.js 18 or later
- Python 3.10 or later
- npm

### 1. Backend Setup

From the repository root:

```bash
# Create and activate a virtual environment if desired
python3 -m venv .venv
source .venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt

# Start FastAPI server
PYTHONPATH=backend python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- API Base: `http://127.0.0.1:8000`
- Interactive API Documentation: `http://127.0.0.1:8000/docs`

### 2. Environment Configuration

Use placeholders only (`backend/app/.env` is loaded automatically outside pytest; never commit secrets):

| Variable | Scope | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Backend | `sqlite:///./calmspace.db` | SQLite database path |
| `CORS_ORIGINS` | Backend | `*` | Comma-separated allowed frontend origins in production |
| `CALMSPACE_ENV` | Backend | `development` | Set to `production` for production rate-limiter guard |
| `CALMSPACE_AI_PROVIDER` | Backend | `mock` | `mock` (offline deterministic) or `gemini` |
| `CALMSPACE_AI_API_KEY` / `GEMINI_API_KEY` | Backend | `None` | Required when `CALMSPACE_AI_PROVIDER=gemini` |
| `CALMSPACE_AI_MODEL` | Backend | `gemini-1.5-flash` | Gemini model identifier |
| `CALMSPACE_AI_ALLOW_LOCAL_RATE_LIMITER` | Backend | `true` (dev) / `false` (prod) | Explicit opt-in for single-worker rate limiting in production |
| `VITE_API_BASE_URL` | Frontend | `/api` | Backend base URL (`vite.config.ts` proxies `/api` to `:8000` in dev) |

### 3. Frontend Setup

In a separate terminal:

```bash
npm --prefix frontend install
npm --prefix frontend run dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173` (running `npm --prefix frontend run dev` without flags uses port `3000` per `frontend/vite.config.ts`).

### 4. Production Build & CI Verification

```bash
# Frontend TypeScript check & Vite bundle
npm --prefix frontend run build

# Backend lint, formatting, and full 256-test suite with safety evaluator coverage
cd backend
ruff format --check .
ruff check .
pytest -v --cov=app.services.safety_evaluator --cov-report=term-missing
```

---

## 12 — Accessibility

Accessibility is part of the interaction design, not a final checklist.

Calmspace provides:
- **Semantic page structure**: Meaningful landmarks (`<main>`, `<aside>`, `<header>`, `<nav>`).
- **Keyboard navigation**: Accessible focus trapping and restoration on modal drawers and dialogs.
- **Visible focus indicators**: Custom 2px calm focus rings (`focus-visible:ring-[#5554B8]`).
- **Touch-friendly controls**: Minimum 44px touch targets on buttons, sliders, and navigation items.
- **Screen-reader data tables**: Tabular data mirrors accompanying all visual charts.
- **Non-color-only signalling**: Status badges feature distinct iconography alongside color tokens.
- **Reduced motion**: Strict support for `prefers-reduced-motion` across animations and transitions.
- **Non-diagnostic language**: Supportive, non-clinical explanations that never pathologize student experiences.

---

## 13 — Contributing

Before opening a pull request:
1. Check the relevant GitHub issue and assigned owner.
2. Confirm the API contract before integrating across frontend and backend.
3. Keep changes strictly within the agreed workstream.
4. Add or update tests where appropriate.
5. Run the relevant lint, test, and build checks locally.
6. Document meaningful changes and limitations.
7. Request review from the relevant owner.

### Suggested Branch Naming

```text
feat/issue-<number>-short-description
fix/issue-<number>-short-description
docs/short-description
```

### Pull Request Expectations

A useful pull request explains:
- What changed and why.
- Which issue it addresses.
- Which files and workstreams it affects.
- How it was tested.
- Whether it changes API contracts, privacy behavior, or safety behavior.
- Any remaining limitations.

---

## 14 — Roadmap

```mermaid
flowchart TD
    A["Core wellbeing experience"] --> B["Application shell"]
    B --> C["Wellbeing insights"]
    C --> D["Study-life planner"]
    D --> E["Support access"]

    F["Safety & routing foundation"] --> G["AI resilience"]
    G --> H["Privacy and session lifecycle"]
    H --> I["Privacy-preserving analytics"]
    I --> J["Deployment readiness"]
```

> *The roadmap is an evolving plan, not a promise that every feature is already available.*

---

## 15 — A final note

Calmspace is built around a simple belief:

> Students should not need to wait until they are overwhelmed to take care of their wellbeing.

A small check-in, a moment to breathe, a better understanding of personal patterns, or a direct connection to a real person can matter. Calmspace is a place to pause, reflect, and find the next small step.

<p align="center">
  <strong>Built with care for student wellbeing.</strong>
</p>
