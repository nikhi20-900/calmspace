# Calm — Implementation Status Report

Branch: `feat/agentic-voice-companion`

## 1. Fully Implemented
- **Backend Companion Orchestrator (`backend/app/services/companion_agent.py`)**: Multi-turn conversation management, deterministic safety gate (`safety_evaluator.py` untouched), personalized session context assembly (nickname, check-ins, insights, tasks, reminders, saved preferences), Gemini function-calling integration, offline context-aware reasoner fallback, and output safety validation.
- **Allowlisted Agentic Tool Registry (`backend/app/services/companion_tools.py`)**: Strict Pydantic-validated tools (`start_checkin`, `commit_checkin`, `start_breathing`, `create_reminder`, `get_wellbeing_insights`, `generate_study_plan`, `save_study_plan`, `get_support_resources`, `activate_crisis_support`, `save_companion_preference`) with session-scoped execution, confirmation gating, and honest failure reporting.
- **Volatile Memory & Session Isolation (`backend/app/services/companion_memory.py`, `backend/app/routers/companion.py`)**: RAM-only conversation turns and pending confirmations bound to `(session_id, conversation_id)`, cleared via `DELETE /api/companion/session/{conversation_id}` and `DELETE /api/settings/data`.
- **Persistent Reminders & Opt-In Preferences (`backend/app/services/storage.py`)**: Session-scoped SQLite tables (`reminders`, `companion_preferences`) wiped on full data erasure.
- **Interactive 3D Blob States (`frontend/src/components/mascot/`)**: Extended Three.js SDF mascot with smooth transitions across `idle`, `listening`, `thinking`, `speaking`, `breathing`, `support`, and `error`, real-time `audioLevel` deformation, synchronized guided breathing phase, reduced-motion handling, and styled non-WebGL fallback.
- **Replaceable Voice I/O Pipeline (`frontend/src/services/voiceService.ts`, `frontend/src/hooks/useVoiceCompanion.ts`)**: Browser `SpeechRecognition`, Web Audio API RMS mic amplitude monitor, warm `SpeechSynthesis` with cadence envelope, echo-loop prevention (STT aborted during TTS + 250ms echo guard), interrupt/mute/stop controls, clean track/AudioContext release, and text-input fallback.
- **Dedicated Companion UI (`frontend/src/pages/CompanionPage.tsx`)**: Integrated into Sidebar, MobileNavigation, Overview CTA, and `/companion` route with live subtitles, expandable transcript, guided breathing panel, confirmation cards, action cards, privacy toggle, and persistent 14416 / 112 crisis controls.
- **Automated Regression Tests**: Backend suite (`backend/tests/test_companion_agent.py`) + frontend tests (`frontend/tests/run_tests.mjs`) + TypeScript & Vite production build.

## 2. Partially Implemented (Environment / Browser Dependent)
- **Live Cloud LLM Reasoning**: Fully wired for Gemini REST `generateContent` tool calling via `CALMSPACE_AI_PROVIDER=gemini` + `GEMINI_API_KEY`; defaults to `mock` (offline context-aware reasoner) when no API key is configured.
- **Browser Speech Recognition & Synthesis**: Dependent on browser support (`SpeechRecognition`/`webkitSpeechRecognition` in Chromium/Edge/Safari) and user microphone permissions; gracefully degrades to text input and muted/visual subtitle mode on unsupported browsers (e.g., Firefox or headless environments).
- **Institutional Campus Counselling Integration**: Uses Calmspace's verified directory where campus entries are explicitly flagged as configurable demo placeholders (`is_demo_placeholder: true`).

## 3. Planned (Future Roadmap)
- **Streaming Low-Latency Voice Model**: Swapping `SpeechInputAdapter` / `SpeechOutputAdapter` in `voiceService.ts` for a bidirectional WebRTC/WebSocket streaming voice provider (e.g., Gemini Live API) without changing UI or safety layers.
- **Distributed Rate Limiting & Signed Session Credentials**: Replacing in-memory `AIRateLimiter` and client-generated `X-Session-ID` with Redis-backed rate limiting and server-issued session credentials as documented in `docs/session_authorization_architecture.md`.
- **Browser Background Push Notifications for Reminders**: Currently reminders are in-app session-scoped records; optional Web Push notifications can be layered in later with explicit permission.
