# Phase 1 Live Acceptance & Security Audit Report — Calm Voice Companion

**Branch:** `feat/agentic-voice-companion`
**Date:** 2026-11-28
**Protected Files Preserved:**
- `backend/app/services/safety_evaluator.py`: Unmodified (`git diff` empty).
- `frontend/src/pages/InsightsPage.tsx`: Pre-existing working-tree changes untouched.

---

## 1. Executive Summary & Release-Readiness Recommendation

**Recommendation: CONDITIONAL NO-GO for external cloud/voice production release; READY for local/offline demo & Phase 2 setup once two environment blockers are cleared.**

All automated regression suites (`307` backend `pytest` tests, `11` frontend tests, `ruff check`, `tsc && vite build`) and live loopback HTTP E2E checks against Uvicorn (`http://127.0.0.1:8001`) passed after fixing 5 real defects discovered during this audit. However, **two external environment blockers** prevented live cloud Gemini verification and live Chrome microphone/TTS verification in this session:
1. **No Gemini API Credential Configured**: `backend/app/.env`, `backend/.env`, and shell environment have no `GEMINI_API_KEY` or `CALMSPACE_AI_API_KEY`. Live `/api/ready` reported `ai_mode: "mock"`.
2. **Chrome Remote Debugging Unavailable**: `mcp_chrome_devtools` could not connect because `/Users/nikhilchhetri/Library/Application Support/Google/Chrome/DevToolsActivePort` was not present, blocking automated live browser + microphone verification.

---

## 2. Provider Implementation Status (Implemented vs. Planned)

| Provider / Layer | Status | Actual Implementation | Notes |
|---|---|---|---|
| **Mock / Context-Aware Reasoner** | **Implemented** | `backend/app/services/companion_agent.py` | Stateful multi-turn offline engine with slot-filling & tool routing |
| **Google Gemini (REST `generateContent`)** | **Implemented (Code-complete; unverified against live cloud without key)** | `backend/app/services/ai_providers/gemini_provider.py` | Header-only auth (`x-goog-api-key`), multi-round `functionDeclarations` + `functionResponse` |
| **Browser SpeechRecognition (STT)** | **Implemented** | `frontend/src/services/voiceService.ts` | Single-utterance turn mode, interim transcripts, echo-gated during TTS |
| **Browser SpeechSynthesis (TTS) + Web Audio RMS** | **Implemented** | `frontend/src/services/voiceService.ts` | Warm voice selection, cadence envelope, instant `.cancel()` interrupt, clean track/AudioContext release |
| **Gemini Live (Bidirectional WebRTC/WS Streaming)** | **Not Implemented (Planned)** | Interface boundary in `voiceService.ts` only | Listed as planned in `docs/calm_implementation_report.md`; no live streaming socket client exists |
| **ElevenLabs TTS** | **Not Implemented (Planned / Not present)** | None in codebase | Zero ElevenLabs modules, endpoints, or env configs exist in the repository |

---

## 3. Defects Discovered & Fixed During Phase 1 Audit

1. **Reminders Had Persistence Only, No Live Reminder Functionality**
   - *Finding*: `storage.add_reminder` persisted rows to SQLite, but nothing monitored `remind_at`, alerted the student when due, or allowed snoozing/completing reminders.
   - *Fix*:
     - Backend: Added `complete_reminder` & `snooze_reminder` in `backend/app/services/storage.py`, `PATCH /api/companion/reminders/{id}/complete` & `/snooze` in `backend/app/routers/companion.py`, and lowered minimum reminder delay from 5m to 1m (`ge=1, le=240`) in `companion_schemas.py` & `companion_tools.py`.
     - Frontend: Created `frontend/src/hooks/useReminderScheduler.ts` (1-second countdown tick, live due detection, Web Audio chime), added a global **Gentle Reminder** banner in `frontend/src/components/layout/AppLayout.tsx` with **Done** and **Snooze 10m** actions, and added live countdowns + Snooze/Done buttons in `frontend/src/components/companion/ActionCards.tsx`.
2. **Stale `micStatus` Closure in `useVoiceCompanion.ts`**
   - *Finding*: `speakResponse` read React state `micStatus` inside its `useCallback` closure. When `startConversation` set `micStatus` to `'denied'` and immediately called `speakResponse`, the closure still saw `'idle'` and could re-prompt for mic access after greeting TTS ended.
   - *Fix*: Added `micStatusRef` in `frontend/src/hooks/useVoiceCompanion.ts` and guarded both `speakResponse` and `onEnd` auto-resume with `micStatusRef.current`.
3. **False `fallback_used=False` When Rate-Limited or Misconfigured**
   - *Finding*: In `companion_agent.py`, if `rate_limiter.is_allowed()` returned `False` or `get_ai_config()` failed, `companion_agent.py` fell back to the local reasoner while reporting `fallback_used=False` and `ai_provider="gemini"`.
   - *Fix*: Separated `wants_external_ai` and `rate_allowed` checks so rate-limited or misconfigured paths set `fallback_used=True` and `ai_provider="rate-limited-fallback"` / `"fallback"`.
4. **Timeout Config Override in `_run_gemini_agent_loop`**
   - *Finding*: `_run_gemini_agent_loop` forced `max(cfg.timeout_seconds, 8.0)`, ignoring lower explicit timeout configs.
   - *Fix*: Respected `cfg.timeout_seconds` directly.
5. **Unclean Error & End-Session State Reset in `useVoiceCompanion.ts`**
   - *Finding*: Failed `startConversation` left `isSessionActive=true`, and `endConversation` did not clear `supportContacts` or `errorMessage`.
   - *Fix*: Reset `isSessionActive=false` on start failure and cleared `supportContacts` + `errorMessage` on `endConversation`. Also tightened regex validation on `conversation_id` / `action_id` in `companion_schemas.py`.

---

## 4. Test & Audit Results

### 4.1 Automated Regression & Security Verification (After Final Edits)
- **Backend `pytest`**: **307 passed** in `0.79s` (includes 297 existing tests + 10 companion & security audit tests in `backend/tests/test_companion_agent.py`).
- **Backend `ruff check`**: **0 errors** across all modified/new companion modules.
- **Frontend `npm test`**: **11/11 passed** (`frontend/tests/run_tests.mjs`).
- **Frontend `tsc && vite build`**: **Succeeded** (`0` TypeScript errors, production bundle generated in `frontend/dist`).

### 4.2 Live Local Server E2E Verification (`http://127.0.0.1:8001`)
Executed real HTTP requests via `httpx` against live Uvicorn serving both FastAPI `/api/*` and the production SPA (`frontend/dist`):
- **Health, Readiness & SPA**: `GET /api/health` -> `200`; `GET /api/ready` -> `200` (`{'status': 'ready', 'database': 'connected', 'ai_mode': 'mock'}`); `GET /companion` -> `200` HTML SPA.
- **Natural Greeting & Multi-Turn Study Plan**: `POST /api/companion/start` -> natural greeting; 5-turn exam stress conversation -> `generate_study_plan` -> `save_study_plan` confirmation -> verified 5 `StudyTask` rows persisted in `/api/planner/tasks`.
- **Reminder Confirmation, Snooze & Complete**: `Remind me to stretch in 1 minute` -> gated behind `pending_confirmation` (0 rows before confirmation) -> confirmed -> snoozed to 10m (`PATCH .../snooze`) -> completed (`PATCH .../complete`, 0 active rows remaining).
- **Guided Breathing, Check-in & Insights**: `Help me relax` -> `blob_state="breathing"`; check-in confirmation -> saved -> `How have I been feeling lately?` -> returned `4.0/5` average.
- **Crisis Escalation, Isolation & Session Wipe**: `I want to end my life` (with `consent_ai_processing=True`) -> `safety.route == "HIGH"`, `generated_by_ai == False`, verified Tele-MANAS/112 contacts returned; cross-session turn returned `404`; `DELETE /api/companion/session/{cid}` & `DELETE /api/settings/data` succeeded.

### 4.3 Security & Privacy Audit Checklist
- **API Key Security**: `GeminiAIProvider` transmits `x-goog-api-key` exclusively in HTTP headers, never in URLs or logs; `.gitignore` ignores `.env`, `.env.local`, `*.db*`. Verified by `test_gemini_companion_tool_calling_and_safety_filter` and `test_security_audit_consent_rate_limit_and_secret_containment`.
- **Consent Enforcement**: `StrictBool` rejects non-boolean `consent_ai_processing` (`"true"` -> `422`) without echoing private user message in error body; `consent_ai_processing=False` never calls external AI providers.
- **Rate Limiting & Fail-Closed**: `AIRateLimiter` enforces per-minute, daily budget, and `allow_process_local_rate_limiter` production guard, failing over to safe local guidance with `fallback_used=True`.
- **Sensitive Data Handling**: Zero raw audio recording (`MediaRecorder` absent); transcripts reside only in volatile `companion_memory` RAM and are absent from all 5 SQLite tables (`checkins`, `tasks`, `reminders`, `companion_preferences`, `user_settings`).

---

## 5. Remaining Limitations & Next Steps to Clear Blockers

1. **Provide a `GEMINI_API_KEY` locally** (in `backend/app/.env` with `CALMSPACE_AI_PROVIDER=gemini`) to run live cloud Gemini tool-calling verification (note: outbound network access is required outside the restricted sandbox).
2. **Launch Google Chrome with Remote Debugging** (`chrome://inspect/#remote-debugging` enabled and `DevToolsActivePort` active) and grant microphone permission on `http://127.0.0.1:8001/companion` (or `http://localhost:3000/companion`) to complete interactive human/browser voice + WebGL verification.
3. **Isolate `frontend/src/pages/InsightsPage.tsx`** via `git stash` or a separate branch before committing `feat/agentic-voice-companion`.
4. **Note on Local Port 8000**: Port `8000` was already occupied on this host during testing; live verification ran on `127.0.0.1:8001`.
