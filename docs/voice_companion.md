# Calm — Agentic AI Voice Wellbeing Companion Architecture

> **Guiding Principle**: *Rules decide safety. AI writes the language. Humans help. Privacy by default.*

## 1. End-to-End Voice & Safety Pipeline

```mermaid
flowchart TD
    UserSpeech["Student Speech or Text Input"] --> MicGate{"Mic Active & Not Speaking?"}
    MicGate -->|Voice| STT["Browser SpeechRecognition + Web Audio RMS Level"]
    MicGate -->|Fallback| TextInput["Text Input Fallback"]
    STT --> API["POST /api/companion/turn"]
    TextInput --> API

    API --> SafetyGate["Deterministic Safety Evaluator (safety_evaluator.py)"]
    SafetyGate -->|HIGH / Crisis| ZeroAI["ZERO AI CALLS\nReturn Urgent Helplines + Support State"]
    SafetyGate -->|LOW / MEDIUM| PendingCheck{"Pending Confirmation & Yes/No?"}

    PendingCheck -->|Yes/No| ConfirmExec["Execute or Cancel Gated Tool"]
    PendingCheck -->|New Turn| ContextLoad["Load Session Context (Insights, Tasks, Reminders, Prefs, Volatile Turns)"]

    ContextLoad --> Reasoner{"Consent + Gemini Enabled?"}
    Reasoner -->|Yes| GeminiLoop["Gemini Function-Calling Loop (Max 3 Rounds)"]
    Reasoner -->|No / Mock / Fallback| LocalReasoner["Context-Aware Conversational Reasoner"]

    GeminiLoop --> ToolVal["Backend Tool Validator (Allowlist + Pydantic + Session Ownership)"]
    LocalReasoner --> ToolVal

    ToolVal -->|Persistent Action| ConfirmGate["Pause & Issue PendingConfirmation Card"]
    ToolVal -->|Read / Immediate UI| ExecService["Execute via Existing Calmspace Services"]

    ExecService --> OutputFilter["Safety Output Validator (No Diagnosis / Rx / Leaks)"]
    ConfirmGate --> OutputFilter
    ConfirmExec --> OutputFilter
    ZeroAI --> Response["CompanionTurnResponse"]
    OutputFilter --> Response

    Response --> TTS["SpeechSynthesis + Cadence Envelope (STT Aborted)"]
    TTS --> Blob3D["Three.js 3D Blob State + Audio Reactivity"]
    TTS -->|onEnd + 250ms guard| ResumeMic["Auto-Resume Listening"]
```

## 2. Multi-Turn Conversation & Confirmation Flow

```mermaid
sequenceDiagram
    participant S as Student
    participant UI as CompanionPage + VoiceService
    participant API as FastAPI (/api/companion)
    participant SE as safety_evaluator.py
    participant AG as CompanionAgent + Tools
    participant DB as SQLite (Session-Scoped)

    S->>UI: Clicks "Start Voice Chat"
    UI->>API: POST /api/companion/start
    API-->>UI: conversation_id + warm greeting
    UI->>S: Speaks greeting (STT paused) -> resumes listening

    S->>UI: "I have too much to study"
    UI->>API: POST /api/companion/turn
    API->>SE: evaluate_wellbeing_route(transcript)
    SE-->>API: LOW / MEDIUM (ai_eligible=true)
    API->>AG: Reason + update volatile session slots
    AG-->>UI: "Would you like a manageable study plan with breaks?"

    S->>UI: "3 subjects: Calculus, Biology, History, first exam in 4 days"
    UI->>API: POST /api/companion/turn
    API->>AG: Validate & execute generate_study_plan
    AG-->>UI: Study Plan Card + PendingConfirmation (save_study_plan)

    S->>UI: "Yes, please" (or clicks Confirm)
    UI->>API: POST /api/companion/confirm (or turn)
    API->>DB: storage.add_task(...) under WHERE session_id = ?
    DB-->>UI: Saved StudyTask records + confirmation reply
```

## 3. Environment Configuration

Backend (`backend/app/.env`, copied from `backend/.env.example`):

- `CALMSPACE_AI_PROVIDER`: `"mock"` (offline context-aware default) or `"gemini"` (live Gemini function calling).
- `CALMSPACE_AI_MODEL`: `"gemini-1.5-flash"` (or `"gemini-2.0-flash"` / `"gemini-2.5-flash"`).
- `CALMSPACE_AI_API_KEY` / `GEMINI_API_KEY`: Sent strictly via `x-goog-api-key` HTTP header.
- `CALMSPACE_AI_ENABLED`: `"true"` or `"false"`.
- `CALMSPACE_AI_TIMEOUT_SECONDS`: `"5.0"` (companion loop enforces at least 8.0s when calling Gemini).
- `CALMSPACE_AI_RATE_LIMIT_PER_MINUTE` / `CALMSPACE_AI_DAILY_BUDGET_LIMIT`: Per-session and daily caps.

Frontend (`frontend/.env`, copied from `frontend/.env.example`):

- `VITE_API_BASE_URL=/api` (proxied to `http://127.0.0.1:8000` in Vite dev).

## 4. Privacy & Session Guarantees

- **No Raw Audio Storage**: Web Audio API `AnalyserNode` computes amplitude in transient RAM only; no `MediaRecorder` or audio files are created.
- **Volatile Transcripts**: Conversation history lives exclusively in `companion_memory` (RAM) and is cleared immediately on `DELETE /api/companion/session/{conversation_id}` or `DELETE /api/settings/data`.
- **Confirmation Gates**: `create_reminder`, `commit_checkin`, `save_study_plan`, and `save_companion_preference` require explicit user confirmation before writing to SQLite.
- **Immutable Safety Engine**: `backend/app/services/safety_evaluator.py` is unmodified and runs prior to any AI reasoning.
