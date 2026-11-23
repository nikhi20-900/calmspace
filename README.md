# Calmspace — Student Wellbeing Companion
> *A quieter space to check in with yourself.*

Calmspace is a privacy-first, emotionally comforting web application designed specifically for university students. It helps students reflect on their daily wellbeing, understand their personal patterns, maintain a healthier study-life balance, and access verified human support when necessary.

Calmspace intentionally rejects the aesthetics of generic SaaS dashboards, gamified habit trackers, clinical assessment portals, and medical diagnostic software. Instead, it embodies a **Soft Editorial Wellness — Digital Calm** design direction, feeling like entering a quiet, well-lit room.

---

## 1. Core Product Principle

$$\text{\textbf{Rules decide safety. AI writes the language. Humans help.}}$$

1. **Safety is Deterministic**: The Python backend alone evaluates risk levels through transparent, conservative safety rules. The frontend *never* independently calculates or overrides risk.
2. **AI Language is Supportive, Not Diagnostic**: For Low and Medium routes, the AI provides gentle, empathetic reflection and pacing suggestions. For High routes, AI generation is strictly bypassed.
3. **Humans Provide Real Care**: Direct, one-tap access to certified national crisis services (Tele-MANAS `14416`), verified campus psychologists, and emergency dispatch (`112`).
4. **Privacy by Design**: Student reflections are completely optional and are **never** persisted in the database check-in history. Students interact via an anonymous session token without requiring logins, roll numbers, or intrusive personal data. Full 2-step data erasure is supported at any time.

---

## 2. Design System & Tokens

### Palette
| Token | Hex / Value | Purpose |
|---|---|---|
| **Background** | `#F7F6FB` | Serene, slightly warm atmospheric canvas |
| **Surface** | `#FFFFFF` | Clean editorial cards and surfaces |
| **Primary** | `#5554B8` | Deep indigo for focused actions, calm focus rings |
| **Primary Hover** | `#4645A7` | Responsive tactile state |
| **Soft Lavender** | `#E9E7FB` | Gentle secondary containers and badges |
| **Soft Peach** | `#F4DCCB` | Warm neutral accents |
| **Soft Sage** | `#DCE9DF` | Restful success and healthy recovery indicators |
| **Main Text** | `#25233B` | High contrast, warm ink for effortless readability |
| **Secondary Text** | `#625F78` | Subdued metadata and descriptive copy |
| **Border** | `#E8E6F1` | Subtle divider lines |

### Typography
- **Primary Body & Headings**: `Satoshi` & `Cabinet Grotesk` (via Fontshare CDN) with system font fallbacks.
- **Hierarchy**:
  - Page Headings: 32px
  - Section Headings: 24px
  - Card Headings: 18px
  - Body: 16px (relaxed line-height: 1.625)
  - Supporting text: 14px

### Spatial & Component Radii
- **Cards**: `18px` (`rounded-card`)
- **Inputs & Steppers**: `12px` (`rounded-input`)
- **Buttons**: `12px` (`rounded-button`, minimum 44px touch targets)
- **Shadow**: `0 4px 24px rgba(91, 91, 214, 0.06)`

---

## 3. Safety & Routing Architecture

### Risk Routing Matrix (Backend Evaluated)

| Route | Conditions | Visual Badge & Language | Experience & AI Behavior |
|---|---|---|---|
| **Low** | Mood $\ge 3$, Stress $\le 2$, Sleep $\ge 6\text{h}$ | Leaf/Check icon, Soft Sage (`#DCE9DF`), *"Doing okay"* | 3–5 sentence supportive encouragement, 2 suggestion chips, non-intrusive reminder. |
| **Medium** | Mood $= 2$, or Stress $\in [3, 4]$, or Sleep $< 6\text{h}$, or declining trend | Compass icon, Muted Amber (`#F6E6CC`), *"Worth some support"* | Grounding reflection, box-breathing / pacing suggestions, clear link to campus counsellors. |
| **High** | Mood $= 1$, or Stress $= 5$, or Sleep $< 3.5\text{h}$, or crisis indicators in reflection | Hand/Heart icon, Calm High-Contrast Plum/Ink (`#25233B`), *"Let's get you support"* | **AI Strictly Bypassed.** Full-width uncluttered layout. *"You don't have to handle this alone."* Ordered actions: Tele-MANAS `14416`, Campus Counsellor booking/call, Emergency `112`. No charts, no distractions. |

---

## 4. Verified Human Support Directory

Every contact is pre-configured with a transparent verification source and last-verified date:

1. **Tele-MANAS (National Mental Health Helpline)**
   - Number: `14416` / `1800-891-4416`
   - Hours: 24/7, Toll-Free, 20+ Languages
   - Source: *Ministry of Health & Family Welfare (MoHFW), Govt. of India (telemanas.mohfw.gov.in)*
   - Last Verified: `2026-11-01`
2. **University Student Wellbeing & Counselling Unit**
   - Number: `+91 (011) 2659-7100` | Email: `wellbeing.support@university.ac.in`
   - Hours: Mon – Fri: 09:00 – 17:30 (Drop-ins welcome)
   - Source: *Dean of Student Affairs (DoSA) Official Directory*
   - Last Verified: `2026-11-15`
3. **National Emergency Services**
   - Number: `112`
   - Hours: 24/7 Instant Dispatch
   - Source: *Emergency Response Support System (ERSS), MHA India*
   - Last Verified: `2026-11-01`
4. **Vandrevala Foundation Helpline**
   - Number: `+91 9999 666 555`
   - Hours: 24/7 Free Counselling
   - Source: *Vandrevala Foundation Mental Health Registry*
   - Last Verified: `2026-11-10`
5. **iCALL Psychosocial Helpline (TISS)**
   - Number: `+91 9152 987 821`
   - Hours: Mon – Sat: 10:00 – 20:00
   - Source: *Tata Institute of Social Sciences (TISS) Project Directory*
   - Last Verified: `2026-11-05`

---

## 5. Project Directory Structure

```text
calmspace/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application & CORS
│   │   ├── models/
│   │   │   └── schemas.py           # Pydantic safety & check-in schemas
│   │   ├── services/
│   │   │   ├── safety_evaluator.py  # Rule-based wellbeing routing engine
│   │   │   ├── ai_guidance.py       # Supportive language generation & fallback
│   │   │   ├── support_directory.py # Verified support resources
│   │   │   └── storage.py           # Privacy-first storage (no reflection retention)
│   │   └── routers/
│   │       ├── checkin.py           # Check-in submission & history
│   │       ├── insights.py          # Trends, averages & plain summaries
│   │       ├── planner.py           # Study sessions & break reminders
│   │       └── support_and_settings.py # Verified contacts & 2-step data wipe
│   ├── requirements.txt
│   └── test_backend.py              # Automated test suite
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── mascot/              # Interactive 3D Lavender Blob (BlobScene, BlobModel, BlobEyes, BlobPhysics)
│   │   │   ├── landing/             # 8-Section Editorial Landing Page (Hero, Reality, Works, Preview, Insights, Safety, Privacy, Footer)
│   │   │   ├── ui/                  # Button, Card, Badge, Slider, Stepper, Dialog, Toggle
│   │   │   ├── layout/              # AppLayout, Sidebar, MobileNavigation, PageHeader, SupportModal
│   │   │   └── checkin/             # MoodQuestion, StressQuestion, SleepQuestion, ReflectionInput
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx      # Official 3D Interactive Mascot Homepage (Route: /)
│   │   │   ├── OverviewPage.tsx     # Personalized warm dashboard, summary cards, trend preview (Route: /app)
│   │   │   ├── CheckInPage.tsx      # Step-by-step single-column check-in
│   │   │   ├── CheckInResultPage.tsx# High-risk escalation screen & AI guidance
│   │   │   ├── InsightsPage.tsx     # Recharts analytics, filters & screen-reader tables
│   │   │   ├── PlannerPage.tsx      # Intentional pacing, task creation & 5-min breather timer
│   │   │   ├── SupportNetworkPage.tsx# Human-support directory & booking triggers
│   │   │   └── SettingsPage.tsx     # Anonymous ID, preferences & 2-step data deletion
│   │   ├── services/
│   │   │   └── api.ts               # Reusable API client with offline demo resilience
│   │   ├── styles/
│   │   │   ├── tokens.css           # CSS design variables
│   │   │   ├── globals.css          # Typography & global utilities
│   │   │   └── animations.css       # Restrained animations & reduced-motion support
│   │   ├── types/
│   │   │   └── index.ts             # TypeScript interfaces
│   │   ├── App.tsx                  # Client routing
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── tsconfig.json
│
└── package.json
```

---

## 6. How to Run Calmspace

### Prerequisites
- Node.js 18+ (tested on Node v20/v26)
- Python 3.10+ (tested on Python 3.14)

### 1. Run the Backend (FastAPI)
```bash
# From workspace root
PYTHONPATH=backend python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The API is available at `http://127.0.0.1:8000` with interactive Swagger docs at `http://127.0.0.1:8000/docs`.

To run backend automated safety tests:
```bash
PYTHONPATH=backend python3 backend/test_backend.py
```

### 2. Run the Frontend (React + Vite)
```bash
# In a new terminal tab
npm --prefix frontend install
npm --prefix frontend run dev
```
Open `http://localhost:3000` in your browser. All API calls automatically proxy through Vite to the FastAPI backend.

To build the production bundle:
```bash
npm --prefix frontend run build
```

---

## 7. Accessibility & Motion Standards

- **Semantic HTML**: Proper `<main>`, `<aside>`, `<header>`, `<nav>`, `<button>`, and `<dialog>` tags.
- **Touch Targets**: Minimum 44px on all primary interactive elements (`Button`, `Slider`, `Stepper`).
- **Contrast**: Full WCAG AA compliance across text and surface pairings.
- **No Color-Only Signaling**: All risk badges and status indicators include distinctive iconography (`CheckCircle2`, `Compass`, `HeartHandshake`) and plain-text descriptions.
- **Screen Reader Support**: Plain-language summaries accompany every chart and an accessible table is available for data inspection.
- **Motion Restraint**: Explicit support for `prefers-reduced-motion` disabling animations for users who prefer static interfaces. High-risk escalation screens completely eliminate unnecessary animations.
