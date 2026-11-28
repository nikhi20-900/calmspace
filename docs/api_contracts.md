# Calmspace API Specification & Shared Contracts

> **Version**: 1.0.0  
> **Base URL**: `/api` (local proxy) or `https://<backend-domain>/api`  
> **Session Authentication**: Required header `X-Session-ID: <anonymous_uuid>`

All endpoints exchange JSON data unless otherwise specified.

---

## 1. Global Headers & Status Codes

### Request Headers
- `Content-Type: application/json`
- `X-Session-ID: <session_uuid>` (e.g. `student-a1b2c3d4`) — Mandatory for all user-scoped data.

### Standard Response Status Codes
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Invalid parameter or malformed payload.
- `422 Unprocessable Entity`: Schema validation error (e.g. out-of-range mood or non-finite values).
- `500 Internal Server Error`: Safe error response without database credential leakage.

---

## 2. API Endpoints

### 2.1 Health & Liveness
- **Endpoint**: `GET /api/health`
- **Description**: Verifies service status and fundamental operating principles.
- **Response**: `200 OK`
```json
{
  "status": "healthy",
  "service": "Calmspace Backend",
  "principle": "Rules decide safety. AI writes the language. Humans help."
}
```

---

### 2.2 Submit Daily Check-In
- **Endpoint**: `POST /api/checkin`
- **Headers**: `X-Session-ID: <session_uuid>`
- **Request Body** (`CheckInRequest`):
```json
{
  "mood": 3,
  "stress": 2,
  "sleep_hours": 7.5,
  "reflection": "Feeling alright, preparing for exams.",
  "consent_ai_processing": true
}
```
*Field Rules:*
- `mood`: Integer `1` to `5` (`1`: Very low, `5`: Great).
- `stress`: Integer `1` to `5` (`1`: Very low, `5`: Very high).
- `sleep_hours`: Float `0.0` to `24.0` (must be finite, not NaN/Infinity).
- `reflection`: Optional string, max 2000 chars. **Never stored in persistent history.**
- `consent_ai_processing`: Strict boolean (`StrictBool`). Non-boolean values (e.g., `"true"`, `1`) are rejected with `422` (raw `input` fields are stripped from `422` error bodies). If `false`, reflection text is not passed to AI provider.

- **Response** (`CheckInResponse`): `200 OK`
```json
{
  "record": {
    "id": "c1f7a0b3-90d1-4e78-98e0-fa1234567890",
    "session_id": "student-a1b2c3d4",
    "timestamp": "2026-11-24T18:00:00Z",
    "mood": 3,
    "stress": 2,
    "sleep_hours": 7.5,
    "route": "LOW"
  },
  "safety": {
    "route": "LOW",
    "level": "LOW",
    "score": 0,
    "crisis_flag": false,
    "triggered_rules": [],
    "status_label": "Doing okay",
    "status_summary": "Your responses indicate you are currently managing within a steady range.",
    "requires_human_escalation": false,
    "ai_eligible": true,
    "reasons": ["Mood, stress, and sleep are within steady, healthy baseline ranges."]
  },
  "guidance": {
    "message": "It sounds like you're keeping a steady pace today. Take a moment to acknowledge the work you've put in.",
    "suggestion_chips": ["Take a short breath", "Plan a rest break"],
    "disclaimer": "This is supportive guidance, not medical advice.",
    "generated_by_ai": false,
    "fallback_used": true
  },
  "support_contacts": [
    {
      "id": "tele-manas",
      "name": "Tele-MANAS (National Mental Health Helpline)",
      "category": "helpline",
      "description": "Comprehensive 24/7 mental health care service by Govt. of India.",
      "contact_number": "14416",
      "display_phone": "14416 / 1800-891-4416",
      "hours": "24/7, Everyday",
      "is_urgent": true,
      "verification_source": "Ministry of Health and Family Welfare (MoHFW), Govt of India",
      "last_verified_date": "2026-11-01",
      "badge_label": "Free & 24/7 National Support"
    }
  ]
}
```

*High-Risk / Crisis Route Behavior:*
- If `route == "HIGH"`, `guidance` is `null` (AI strictly bypassed).
- `support_contacts` lists urgent emergency options (`Tele-MANAS`, Campus Unit, `112`) at the top.

---

### 2.3 Check-In History
- **Endpoint**: `GET /api/checkin/history`
- **Headers**: `X-Session-ID: <session_uuid>`
- **Response**: `200 OK` — `list[CheckInRecord]`
```json
[
  {
    "id": "c1f7a0b3-90d1-4e78-98e0-fa1234567890",
    "session_id": "student-a1b2c3d4",
    "timestamp": "2026-11-24T18:00:00Z",
    "mood": 3,
    "stress": 2,
    "sleep_hours": 7.5,
    "route": "LOW"
  }
]
```
*(Notice: reflection text is never returned because it is never saved).*

---

### 2.4 Personal Insights
- **Endpoint**: `GET /api/insights?days=7`
- **Headers**: `X-Session-ID: <session_uuid>`
- **Query Params**: `days` (default: 7, max: 90)
- **Response** (`InsightSummary`): `200 OK`
```json
{
  "average_mood": 3.8,
  "average_stress": 2.1,
  "average_sleep": 7.2,
  "check_in_count": 5,
  "plain_summary": "Over your last 5 check-ins, your mood averaged 3.8/5 (generally okay) with 7.2 hours average sleep and well managed stress levels.",
  "mood_trend": [
    { "day": "Mon 20", "mood": 4, "route": "LOW" },
    { "day": "Tue 21", "mood": 3, "route": "LOW" }
  ],
  "sleep_trend": [
    { "day": "Mon 20", "sleep": 7.5 },
    { "day": "Tue 21", "sleep": 7.0 }
  ],
  "stress_trend": [
    { "day": "Mon 20", "stress": 2 },
    { "day": "Tue 21", "stress": 3 }
  ]
}
```

---

### 2.5 Study Planner Tasks
- **List Tasks**: `GET /api/planner/tasks`
  - Response: `list[StudyTask]`
- **Create Task**: `POST /api/planner/tasks`
  - Request: `{"title": "Review lecture slides", "estimated_minutes": 25, "category": "Revision"}`
  - Response: `StudyTask` (`201 Created` or `200 OK`)
- **Update Task**: `PATCH /api/planner/tasks/{task_id}`
  - Request: `{"title": "Updated Title", "estimated_minutes": 30, "category": "Study"}`
  - Response: `StudyTask` (`200 OK`)
- **Toggle Task Completion**: `PATCH /api/planner/tasks/{task_id}/toggle`
  - Response: `StudyTask`
- **Delete Task**: `DELETE /api/planner/tasks/{task_id}`
  - Response: `{"message": "Task removed"}` (`404` if not found in session)

---

### 2.6 Verified Support Resources
- **Endpoint**: `GET /api/support/resources`
- **Description**: Returns verified campus, national helpline, and emergency resources with verification authority, official source URL, and last-verified date. Disabled resources (`is_active: false`) are strictly omitted.
- **Response**: `200 OK` — `list[SupportContact]`
- **Provenance & Integrity Rules**:
  - Official Helplines & Emergency: Must include verifiable `official_source_url` and `last_verified_date`.
  - Campus Placeholders: Strictly labeled `is_demo_placeholder: true` with `official_source_url: null` to prevent presenting unverified institutional contacts as live services.
  - Non-Clinical Guarantee: Copy must not promise response times, 100% continuous availability, or guaranteed outcomes.

---

### 2.7 Settings & 2-Step Data Deletion
- **Get Settings**: `GET /api/settings`
  - Response: `UserSettings`
- **Update Settings**: `PUT /api/settings`
  - Request: `{"nickname": "Student", "break_reminders_enabled": true, "reminder_interval_minutes": 45, "share_anonymous_analytics": false, "data_retention_days": 30}`
  - Response: `UserSettings`
- **Permanent Data Deletion**: `DELETE /api/settings/data`
  - Headers: `X-Session-ID: <session_uuid>`
  - Response: `200 OK`
  ```json
  {
    "status": "success",
    "message": "All session data has been permanently deleted."
  }
  ```

---

### 2.8 Calm Voice Companion
- **Start Session**: `POST /api/companion/start` (`X-Session-ID` required) -> `CompanionStartResponse` (`conversation_id`, `greeting`, `blob_state`, `follow_up_prompts`, `reminders`, `preferences`, `disclaimer`).
- **Send Turn**: `POST /api/companion/turn` (`X-Session-ID` required)
  - Request: `{"conversation_id": "conv-...", "message": "...", "consent_ai_processing": false, "input_mode": "voice"}`
  - Evaluates `message` via deterministic `safety_evaluator.py` **before** any AI call. HIGH/crisis routes bypass AI completely and return urgent contacts.
  - Response: `CompanionTurnResponse` (`reply`, `blob_state`, `safety`, `tool_calls`, `pending_confirmation`, `action_cards`, `support_contacts`, `generated_by_ai`, `fallback_used`).
- **Confirm or Cancel Pending Action**: `POST /api/companion/confirm` (`X-Session-ID` required)
  - Request: `{"conversation_id": "conv-...", "action_id": "act-...", "approved": true}`
- **End Session (Clear Volatile Memory)**: `DELETE /api/companion/session/{conversation_id}`
- **Reminders**: `GET /api/companion/reminders`, `POST /api/companion/reminders`, `DELETE /api/companion/reminders/{reminder_id}`
- **Opt-In Companion Preferences**: `GET /api/companion/preferences`, `PUT /api/companion/preferences`
