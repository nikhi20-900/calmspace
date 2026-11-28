# Calmspace API Specification & Shared Contracts

> **Version**: 1.0.0  
> **Base URL**: `/api` (local proxy) or `https://<backend-domain>/api`  
> **Session Authentication**: Required header `Authorization: Bearer <session_id>.<session_secret>` (issued by `POST /api/sessions`)

All endpoints exchange JSON data unless otherwise specified.

---

## 1. Global Headers & Status Codes

### Request Headers
- `Content-Type: application/json`
- `Authorization: Bearer <session_id>.<session_secret>` — Mandatory for all session-scoped endpoints. Self-asserted `X-Session-ID` headers without a valid Bearer secret are rejected with `401 Unauthorized`.

### Standard Response Status Codes
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created (e.g., `POST /api/sessions`).
- `400 Bad Request`: Invalid parameter or malformed payload.
- `401 Unauthorized`: Missing, malformed, unknown, wrong-secret, expired, or revoked Bearer credential (`WWW-Authenticate: Bearer`).
- `422 Unprocessable Entity`: Schema validation error (e.g. out-of-range mood, non-finite values, or non-`StrictBool` consent).
- `500 Internal Server Error` / `503 Service Unavailable`: Safe error response without database credential, SQL, or reflection leakage.

---

## 2. API Endpoints

### 2.0 Anonymous Session Credentials
- **Issue Credential**: `POST /api/sessions` (`201 Created`, `Cache-Control: no-store`)
  - Returns `{ "session_id": "<uuidv4>", "session_secret": "<256-bit-secret>", "expires_at": "<utc-iso>", "token_type": "Bearer" }`. Plaintext secret is returned once and stored server-side only as a salted SHA-256/HMAC-SHA256 hash.
- **Rotate Secret**: `POST /api/sessions/rotate` (`200 OK`, `Cache-Control: no-store`)
  - Requires active `Authorization: Bearer <id>.<secret>`. Issues a fresh `session_secret` while preserving existing session data and immediately invalidating the previous secret (`401`).
- **Revoke Credential**: `POST /api/sessions/revoke` (`200 OK`, `Cache-Control: no-store`)
  - Requires active `Authorization: Bearer <id>.<secret>`. Marks the session credential revoked so all subsequent calls return `401 Unauthorized`.

---

### 2.1 Health, Liveness & Readiness
- **Liveness**: `GET /api/health` (`200 OK`)
```json
{
  "status": "healthy",
  "service": "Calmspace Backend",
  "principle": "Rules decide safety. AI writes the language. Humans help."
}
```
- **Readiness**: `GET /api/ready` (`200 OK` or `503 Service Unavailable` if SQLite fails)
```json
{
  "status": "ready",
  "database": "connected",
  "ai_mode": "mock"
}
```

---

### 2.2 Submit Daily Check-In
- **Endpoint**: `POST /api/checkin`
- **Headers**: `Authorization: Bearer <session_id>.<session_secret>`
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
- **Headers**: `Authorization: Bearer <session_id>.<session_secret>`
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
- **Headers**: `Authorization: Bearer <session_id>.<session_secret>`
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
  - Headers: `Authorization: Bearer <session_id>.<session_secret>`
  - Behavior: Atomically deletes all rows in `checkins`, `tasks`, `user_settings`, and `session_credentials` for `session_id` and clears in-memory rate-limit state; subsequent requests with the deleted credential fail with `401 Unauthorized`.
  - Response: `200 OK`
  ```json
  {
    "status": "success",
    "message": "All session data has been permanently deleted."
  }
  ```
