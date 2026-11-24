# High-Risk Escalation Flow & Verified Support Directory (Issue #4)

> **Core Philosophy**: *"Rules decide safety. AI writes the language. Humans help."*  
> **High-Risk Principle**: When risk is High or an acute crisis is detected, automated AI generation is strictly disabled. Calmspace connects the student directly to verified human care with an unmistakable, dignified safe exit.

---

## 1. High-Risk Human Escalation Architecture

When the deterministic backend safety evaluator returns `HIGH`:
1. **Zero AI Response Generator Invocations**: `ai_eligible=False` is returned by the safety engine, guaranteeing that no LLM or prompt completion is ever executed.
2. **Dedicated Calm Escalation View**: The frontend renders a clean, distraction-free escalation screen (`CheckInResultPage.tsx`) with no charts, gamification, or animated mascots.
3. **Verified Human Helplines Ranked by Priority**:
   - **Priority 1: Tele-MANAS** (`14416 / 1800-891-4416`) — 24/7 toll-free national mental health helpline by the Ministry of Health and Family Welfare (MoHFW), Govt. of India.
   - **Priority 2: National Emergency Services** (`112`) — Single emergency response helpline by the Ministry of Home Affairs (MHA ERSS) for physical safety or acute medical distress.
   - **Priority 3: Community Helpline (Vandrevala Foundation)** (`+91 9999 666 555`) — 24/7 crisis counseling via telephone and WhatsApp.
   - **Priority 4: Academic Helpline (iCALL, TISS)** (`022-25521111`) — Monday to Saturday, 8:00 AM – 9:00 PM, run by the School of Human Ecology, Tata Institute of Social Sciences.
   - **Priority 5: Campus Student Counselling (Demo Placeholder)** — Template integration point requiring local institutional setup.

---

## 2. Source Verification Matrix

| Resource ID | Contact Name | Contact Number | Operating Hours | Verification Authority | Official Source URL | Last Verified Date | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| `tele-manas` | Tele-MANAS | `14416` / `1800-891-4416` | 24/7, Everyday | Ministry of Health and Family Welfare (MoHFW), Govt. of India | `https://telemanas.mohfw.gov.in` | 2026-11-20 | **Verified** |
| `national-emergency` | Emergency Services | `112` | 24/7, Everyday | Emergency Response Support System (ERSS), Ministry of Home Affairs | `https://erss.in` | 2026-11-20 | **Verified** |
| `vandrevala-foundation` | Vandrevala Foundation Helpline | `+91 9999 666 555` | 24/7, Everyday | Vandrevala Foundation Mental Health Registry | `https://www.vandrevalafoundation.com` | 2026-11-20 | **Verified** |
| `icall-tiss` | iCALL Psychosocial Helpline | `022-25521111` | Mon – Sat, 08:00 – 21:00 | School of Human Ecology, Tata Institute of Social Sciences | `https://icallhelpline.org` | 2026-11-20 | **Verified** |
| `campus-counselling` | Campus Counselling Unit | Unconfigured | Configurable | Demo Template (requires institutional directory) | N/A | 2026-11-20 | **Demo Template** |

---

## 3. Honest Demo Placeholder Policy

In safety-critical student wellbeing systems, misleading a user into believing campus counseling has been alerted when no request was dispatched is a severe safety hazard.
- **Unmistakable Visual Badging**: The campus entry is labeled with an amber badge: `Demo Placeholder • Institutional Config Required`.
- **No Deceptive Usable Contacts**: No invented phone numbers or dummy emails (`counselling@campus-example.edu`) are rendered as clickable contacts.
- **Informational Disclosure Dialog**: Clicking "Integration Info" or "Demo Notice" opens an explicit modal clarifying that Calmspace does not transmit student distress data over the network without configured institutional webhooks, and directs the user to Tele-MANAS (14416) for real-world support.

---

## 4. Explicit Safe Exit Navigation Policy

Exiting from a high-risk escalation screen must be deliberate, safe, and clean:
1. **Obvious Safe Exit Control**: The page features a prominent, dignified "Safe Exit to Overview" button.
2. **Session Cleanup**: `sessionStorage.removeItem('calmspace_latest_checkin')` removes the transient high-risk result.
3. **Exit Flag & Router History Wipe**:
   - `sessionStorage.setItem('calmspace_high_risk_exited', 'true')` marks that the user explicitly exited.
   - `window.history.replaceState({}, '')` clears the router location state so that clicking the browser "Back" button cannot accidentally restore the high-risk screen.
   - On result page mount, if `calmspace_high_risk_exited === 'true'`, the component immediately redirects to `/` with `{ replace: true }`.
4. **Zero AI Continuation**: Exiting returns the student to their calm dashboard overview. No chatbot, LLM prompt, or conversational continuation is ever triggered.
5. **Permanent Availability**: A global "Get Support" button remains in the navigation bar on every screen so human resources can be reached at any time.

---

## 5. High-Risk Data Retention & Deletion Policy

- **No Reflection Persistence**: Free-text reflection submitted during check-in is evaluated in-memory for acute crisis indicators and is **never** written to persistent storage (`CheckInRecord`).
- **Minimal Metrics**: Only anonymous numeric metrics (`mood`, `stress`, `sleep_hours`, `route="HIGH"`, `timestamp`) are stored in the local session history.
- **Complete Purge on Request**: When the user requests data deletion (`DELETE /api/settings/data`), all stored check-ins—including any high-risk entries—are permanently purged from memory and storage.
