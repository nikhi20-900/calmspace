# Calm — Hackathon Demonstration Script (3–4 Minutes)

## Setup Before Demo
1. Start backend: `npm run backend` (or `uvicorn app.main:app --app-dir backend --reload --port 8000`).
2. Start frontend: `npm run dev` (opens `http://localhost:3000`).
3. Optional: Set `CALMSPACE_AI_PROVIDER=gemini` and `GEMINI_API_KEY=...` in `backend/app/.env` (or leave `mock` for deterministic offline demo).
4. Navigate to **Talk to Calm** (`/companion`) from the sidebar.

---

## Step-by-Step Walkthrough

### Scene 1: Natural Greeting & 3D Blob States (30s)
- Point out the 3D lavender blob in `idle` state, the AI identity disclaimer (*"Calm is an AI wellbeing companion, not a human, therapist, or medical professional"*), and the privacy controls.
- Click **Start Voice Chat** (grant mic permission; point out the green **Mic Active** badge).
- Calm greets naturally and asks how you are feeling today while animating in `speaking` state, then automatically resumes `listening`.
- **Say:** *"Hi, how are you?"*
- **Calm responds:** *"Hey! I'm here and ready to chat. How are you feeling today?"*

### Scene 2: Multi-Turn Context & Personalized Study Plan (60s)
- **Say:** *"I'm really stressed about my exams."*
- **Calm asks a contextual follow-up:** *"That sounds overwhelming. Are you worried about the amount you need to study, or more about how your results will go?"*
- **Say:** *"I have too much to study."*
- **Calm offers:** *"Would you like me to help you create a manageable study plan with regular breaks?"*
- **Say:** *"Yes, please."*
- **Calm asks:** *"Of course. How many subjects do you need to prepare for, and when is your first exam?"*
- **Say:** *"3 subjects: Calculus, Biology, and History, first exam in 4 days."*
- Show the **Personalized Study Plan** action card generated with timed study blocks and breaks, plus the **Permission Requested** confirmation gate. Say *"Yes, please"* or click **Confirm & Save**, then briefly show the saved tasks in **Study Planner** (`/planner`).

### Scene 3: Guided Breathing & Interrupt/Mute Controls (40s)
- Return to **Talk to Calm** (`/companion`).
- **Say:** *"Help me relax."*
- Show the 3D blob smoothly entering **Guided Breathing** (`breathing` state) synchronized with the **Inhale / Exhale** visual pacer. Click **Finish Breathing** to resume chat.
- Demonstrate **Interrupt & Speak** while Calm is talking (cancels TTS immediately), **Mute Mic**, and the **Text-input fallback**.

### Scene 4: Reminders with Confirmation & Wellbeing Insights (35s)
- **Type or say:** *"Remind me to take a break in 20 minutes."*
- Highlight that Calm does **not** save without permission — confirm via **Confirm & Save**, showing the active reminder card.
- **Type or say:** *"How have I been feeling lately?"* — Calm invokes `get_wellbeing_insights` and summarizes real session averages.

### Scene 5: Safety Boundary & Zero-AI Crisis Escalation (30s)
- Click **Urgent Help: 14416 / 112** or **say:** *"I need urgent help"* (or test a crisis phrase).
- Show that `safety_evaluator.py` enforces `HIGH` / `support` mode with **zero AI calls**, displays verified **Tele-MANAS (14416)** and **Emergency (112)** resources, and keeps Calm calm and grounded.
- Click **End Conversation** to show microphone release and immediate clearing of the temporary transcript.
