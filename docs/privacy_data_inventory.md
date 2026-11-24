# Calmspace Data Inventory & Privacy Disclosure Specification (Issue #11)

> **Document Status**: Frozen for Issue #11 preparation.  
> **Database-Dependent Items**: Marked as **PENDING APPROVAL** by Roushan (@roushan-23, Issue #10 Owner).  
> **Guiding Principle**: *"Rules decide safety. AI writes the language. Humans help. Privacy by default."*

---

## 1. Frozen Data Inventory

Calmspace enforces strict data minimization. We do not collect names, email addresses, student IDs, phone numbers, or IP addresses.

### 1.1 Field-by-Field Inventory Matrix

| Field Name | Entity / Table | Type | Purpose | Stored On Server? | Access Scope | Retention Lifetime |
|---|---|---|---|---|---|---|
| `session_id` | `anonymous_sessions` | UUIDv4 | Anonymous session partition key | Yes (DB PK) | Client & Server | Active until expired (60d) or deleted |
| `token_hash` | `anonymous_sessions` | VARCHAR(64) | Verifies Bearer secret credential | Yes (Hashed) | Server internal | Valid until revoked or deleted |
| `mood` | `check_ins` | Integer (1–5) | Daily mood tracking & trend graphs | Yes (DB) | Authenticated session | Rolling retention (default 30d)* |
| `stress` | `check_ins` | Integer (1–5) | Stress load tracking & safety evaluation | Yes (DB) | Authenticated session | Rolling retention (default 30d)* |
| `sleep_hours` | `check_ins` | Float (0.0–24.0) | Rest tracking & restorative sleep insights | Yes (DB) | Authenticated session | Rolling retention (default 30d)* |
| `route` | `check_ins` | Enum (`LOW`, `MEDIUM`, `HIGH`) | Deterministic safety classification | Yes (DB) | Authenticated session | Rolling retention (default 30d)* |
| **`reflection`** | *N/A (Memory only)* | Text ($\le$ 2,000 chars) | Crisis keyword detection & opt-in AI guidance | **NO (NEVER PERSISTED)** | Volatile runtime only | Erased immediately upon response ($\le 1\text{s}$) |
| `title`, `category`, `estimated_minutes` | `study_tasks` | String, Integer | Study planner task management | Yes (DB) | Authenticated session | Until checked off, expired, or deleted |
| `completed` | `study_tasks` | Boolean | Task completion indicator | Yes (DB) | Authenticated session | Until deleted or session purged |
| `nickname` | `user_settings` | String ($\le$ 60 chars) | Friendly dashboard greeting (non-identifying) | Yes (DB) | Authenticated session | Retained until updated or deleted |
| `break_reminders_enabled` | `user_settings` | Boolean | In-app study pacing toggle | Yes (DB) | Authenticated session | Retained until updated or deleted |
| `data_retention_days` | `user_settings` | Integer (7–90) | Student-chosen retention window | Yes (DB) | Authenticated session | Retained until updated or deleted |

*\* Note: The exact retention duration is pending Roushan's database contract approval in Issue #10.*

---

## 2. Finalized Privacy Disclosure Copy

### 2.1 Pre-Check-in Disclosure (Shown on Check-in Overview)
> *"Takes about 60 seconds. Rules decide your safety, reflection text is never saved to your check-in history, and you remain anonymous."*

### 2.2 Point-of-Collection AI Consent Disclosure (Reflection Textarea)
- **Privacy Guarantee Notice**:
  > *"Privacy guarantee: Your reflection is completely optional and is never saved in your check-in history database. It is processed locally by deterministic safety rules to detect crisis indicators."*
- **Explicit Consent Checkbox (Default: `false` / Unchecked)**:
  > *"I consent to allowing the supportive AI assistant to read this reflection to tailor my kind guidance message. (If left unchecked, your reflection is only evaluated by local rule-based safety checks and is never shared with external AI guidance models)."*
- **Third-Party Provider Transparency Notice**:
  > *"When you opt in, your reflection is sent over an encrypted channel to the Google Gemini API solely for real-time supportive message generation. It is not stored in Calmspace databases and is never used to train private student profiles."*

### 2.3 Settings & Data Erasure Disclosure (Settings Page)
- **Cryptographic Anonymous Session Disclosure**:
  > *"Calmspace does not require email addresses, student roll numbers, or university logins. You are represented on this browser solely by an anonymous cryptographic token."*
- **Destructive Erasure Disclosure ("Delete all my data")**:
  > *"Permanently remove your check-in ratings, study planner tasks, and personal preferences from this device and our servers. This action is irreversible and immediately invalidates your session credentials."*

---

## 3. Consent, Retention & Deletion Test Specifications

These 7 test scenarios define the automated verification criteria for Issue #11:

### Test Case 1: Unconsented Reflection AI Exclusion
- **Action**: Check-in submitted with `reflection="I am stressed"` and `consent_ai_processing=False`.
- **Assertion**:
  - Request to AI provider adapter has call count `0`.
  - Check-in response contains approved fallback message (`fallback_used=True`, `generated_by_ai=False`).
  - Stored check-in record in DB has no reflection attribute or column.

### Test Case 2: Consented Reflection Non-Persistence
- **Action**: Check-in submitted with `reflection="Good day"` and `consent_ai_processing=True`.
- **Assertion**:
  - Provider receives reflection text.
  - Check-in record written to DB strictly contains `mood`, `stress`, `sleep_hours`, `route`.
  - Database table query verifies zero reflection text was written.

### Test Case 3: High-Route Reflection Non-Persistence & AI Bypass
- **Action**: Check-in submitted with acute crisis statement and `consent_ai_processing=True`.
- **Assertion**:
  - Safety evaluator routes to `HIGH`.
  - AI provider call count is strictly `0` (zero-call guarantee).
  - DB record has `route="HIGH"` and zero reflection text.

### Test Case 4: High-Route Safe-Exit Purge
- **Action**: From a `HIGH` result page, trigger *"Safe Exit"*.
- **Assertion**:
  - All check-in entries for that session are purged from the database.
  - Client storage (`localStorage`, `sessionStorage`, browser history state) is wiped.

### Test Case 5: Sentinel Text Leak Detection in Logs & Traces
- **Action**: Submit check-ins containing a unique synthetic canary string (`SENTINEL_CANARY_REFLECT_992`).
- **Assertion**:
  - Inspect server application logs, error tracebacks, and stdout/stderr.
  - Assert `SENTINEL_CANARY_REFLECT_992` is strictly absent from all logged outputs.

### Test Case 6: Cross-Session Data Isolation (Negative Access)
- **Action**: Session A attempts to fetch `/api/checkin/history` or `/api/planner/tasks` using Session B's `session_id`.
- **Assertion**:
  - Endpoint returns `401 Unauthorized` or `403 Forbidden`.
  - Zero records belonging to Session B are returned or modified.

### Test Case 7: Session Deletion & Credential Invalidation
- **Action**: Authenticated call to `DELETE /api/settings/data`.
- **Assertion**:
  - All check-ins, study tasks, and user settings for that session are permanently erased.
  - The session credential is marked revoked.
  - Subsequent requests with the deleted credential return `401 Unauthorized`.

---

## 4. Database-Dependent Items (Pending Roushan's Approval — Issue #10)

The following implementation details are intentionally left uncommitted pending Roushan's Issue #10 database setup:
1. **Database Technology & Connection Strings**: Confirmation of Supabase / PostgreSQL hosted connection vs. local engine repository.
2. **Schema Migration Scripts**: Roushan's migration tool of choice (Alembic / SQL scripts).
3. **Automated Retention Query**: Scheduling method (database cron extension, pg_cron, or backend background task) for daily rolling deletion.
4. **Session Authentication Middleware**: Roushan's Bearer token validation and database lookup implementation.
