"""
Calmspace PowerPoint Generator Script
Generates a 16:9 widescreen presentation matching the Soft Editorial Wellness design.
Content drawn directly from README.md, architecture docs, and GitHub deliverables.
"""

import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# Calmspace Brand Color Palette
COLOR_BG = RGBColor(247, 246, 251)         # #F7F6FB Serene Canvas
COLOR_SURFACE = RGBColor(255, 255, 255)    # #FFFFFF Card Surface
COLOR_PRIMARY = RGBColor(85, 84, 184)      # #5554B8 Deep Indigo
COLOR_PRIMARY_DARK = RGBColor(55, 54, 130) # Dark Indigo
COLOR_LAVENDER = RGBColor(233, 231, 251)   # #E9E7FB Soft Lavender Accent
COLOR_SAGE = RGBColor(220, 233, 223)       # #DCE9DF Soft Sage Indicator
COLOR_PEACH = RGBColor(244, 220, 203)      # #F4DCCB Soft Peach Accent
COLOR_TEXT_MAIN = RGBColor(37, 35, 59)     # #25233B Deep Warm Ink
COLOR_TEXT_MUTED = RGBColor(98, 95, 120)   # #625F78 Secondary Ink
COLOR_BORDER = RGBColor(232, 230, 241)     # #E8E6F1 Subtle Border
COLOR_WHITE = RGBColor(255, 255, 255)

FONT_HEADING = "Segoe UI"
FONT_BODY = "Segoe UI"


def set_slide_background(slide, color):
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = color


def add_header(slide, title_text, category_badge="CALMSPACE"):
    # Category badge
    badge_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(8), Inches(0.4))
    tf_badge = badge_box.text_frame
    tf_badge.word_wrap = True
    p_badge = tf_badge.paragraphs[0]
    p_badge.text = category_badge.upper()
    p_badge.font.name = FONT_HEADING
    p_badge.font.size = Pt(11)
    p_badge.font.bold = True
    p_badge.font.color.rgb = COLOR_PRIMARY

    # Title
    title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.7), Inches(11), Inches(0.8))
    tf_title = title_box.text_frame
    tf_title.word_wrap = True
    p_title = tf_title.paragraphs[0]
    p_title.text = title_text
    p_title.font.name = FONT_HEADING
    p_title.font.size = Pt(26)
    p_title.font.bold = True
    p_title.font.color.rgb = COLOR_TEXT_MAIN


def add_card(slide, left, top, width, height, bg_color=COLOR_SURFACE, border_color=COLOR_BORDER):
    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = bg_color
    shape.line.color.rgb = border_color
    shape.line.width = Pt(1.2)
    return shape


def add_bullet_point(text_frame, bold_prefix, text_content, pt_size=13):
    p = text_frame.add_paragraph()
    p.space_after = Pt(8)
    p.space_before = Pt(2)
    
    run_bullet = p.add_run()
    run_bullet.text = "• "
    run_bullet.font.name = FONT_BODY
    run_bullet.font.bold = True
    run_bullet.font.size = Pt(pt_size)
    run_bullet.font.color.rgb = COLOR_PRIMARY

    run_bold = p.add_run()
    run_bold.text = bold_prefix + (" " if bold_prefix else "")
    run_bold.font.name = FONT_BODY
    run_bold.font.bold = True
    run_bold.font.size = Pt(pt_size)
    run_bold.font.color.rgb = COLOR_TEXT_MAIN

    run_body = p.add_run()
    run_body.text = text_content
    run_body.font.name = FONT_BODY
    run_body.font.bold = False
    run_body.font.size = Pt(pt_size)
    run_body.font.color.rgb = COLOR_TEXT_MUTED


def build_presentation():
    prs = Presentation()
    # 16:9 Widescreen layout: 13.333 x 7.5 inches
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # =========================================================================
    # SLIDE 1: Title Slide
    # =========================================================================
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1, COLOR_BG)

    # Left content container
    add_card(s1, Inches(0.8), Inches(1.0), Inches(7.4), Inches(5.5), COLOR_SURFACE)
    
    tb = s1.shapes.add_textbox(Inches(1.2), Inches(1.3), Inches(6.6), Inches(4.8))
    tf = tb.text_frame
    tf.word_wrap = True

    p0 = tf.paragraphs[0]
    p0.text = "STUDENT WELLBEING COMPANION"
    p0.font.name = FONT_HEADING
    p0.font.size = Pt(12)
    p0.font.bold = True
    p0.font.color.rgb = COLOR_PRIMARY
    p0.space_after = Pt(12)

    p1 = tf.add_paragraph()
    p1.text = "Calmspace"
    p1.font.name = FONT_HEADING
    p1.font.size = Pt(44)
    p1.font.bold = True
    p1.font.color.rgb = COLOR_TEXT_MAIN
    p1.space_after = Pt(8)

    p2 = tf.add_paragraph()
    p2.text = "A quieter space to check in with yourself."
    p2.font.name = FONT_BODY
    p2.font.size = Pt(18)
    p2.font.italic = True
    p2.font.color.rgb = COLOR_TEXT_MUTED
    p2.space_after = Pt(20)

    p3 = tf.add_paragraph()
    p3.text = "Built around thoughtful design, deterministic safety, and human support."
    p3.font.name = FONT_BODY
    p3.font.size = Pt(14)
    p3.font.color.rgb = COLOR_TEXT_MAIN
    p3.space_after = Pt(24)

    # Core principle pill
    p4 = tf.add_paragraph()
    p4.text = "Core Architecture Principle:"
    p4.font.name = FONT_HEADING
    p4.font.size = Pt(11)
    p4.font.bold = True
    p4.font.color.rgb = COLOR_TEXT_MUTED
    p4.space_after = Pt(4)

    p5 = tf.add_paragraph()
    p5.text = "« Rules decide safety. AI writes language. Humans provide care. »"
    p5.font.name = FONT_HEADING
    p5.font.size = Pt(13)
    p5.font.bold = True
    p5.font.color.rgb = COLOR_PRIMARY

    # Right side: Mascot Image Card
    add_card(s1, Inches(8.5), Inches(1.0), Inches(4.0), Inches(5.5), COLOR_SURFACE)
    mascot_img_path = "docs/assets/calmspace_mascot.jpg"
    if os.path.exists(mascot_img_path):
        s1.shapes.add_picture(mascot_img_path, Inches(8.75), Inches(1.25), width=Inches(3.5))

    tb_sub = s1.shapes.add_textbox(Inches(8.5), Inches(5.6), Inches(4.0), Inches(0.8))
    tf_sub = tb_sub.text_frame
    tf_sub.word_wrap = True
    p_sub = tf_sub.paragraphs[0]
    p_sub.alignment = PP_ALIGN.CENTER
    p_sub.text = "Interactive 3D Mascot — Digital Sanctuary"
    p_sub.font.name = FONT_BODY
    p_sub.font.size = Pt(12)
    p_sub.font.bold = True
    p_sub.font.color.rgb = COLOR_PRIMARY_DARK

    s1.notes_slide.notes_text_frame.text = (
        "Welcome judges and reviewers. Today we introduce Calmspace—a privacy-first student wellbeing companion. "
        "University life brings invisible pressures. We built Calmspace around one unwavering standard: "
        "Rules decide safety, AI provides supportive language, and verified humans provide real care."
    )

    # =========================================================================
    # SLIDE 2: The Problem & The Idea (Section 01)
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2, COLOR_BG)
    add_header(s2, "The Reality of Student Life & The Calmspace Idea", "01 — THE IDEA")

    # Card 1: The Problem
    add_card(s2, Inches(0.8), Inches(1.6), Inches(5.6), Inches(5.2))
    tb_c1 = s2.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(5.2), Inches(4.8))
    tf_c1 = tb_c1.text_frame
    tf_c1.word_wrap = True
    
    p = tf_c1.paragraphs[0]
    p.text = "The Silent Student Struggle"
    p.font.name = FONT_HEADING
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = COLOR_TEXT_MAIN
    p.space_after = Pt(14)

    add_bullet_point(tf_c1, "Academic Overload:", "Deadlines, lab submissions, attendance pressure, and constant performance anxiety.")
    add_bullet_point(tf_c1, "Sleep & Routine Disruption:", "Irregular sleeping patterns directly compounding stress and mood decline.")
    add_bullet_point(tf_c1, "Stigma & Hesitation:", "Students carry mental fatigue quietly rather than visiting intimidating clinical clinics.")
    add_bullet_point(tf_c1, "The SaaS/Tracker Trap:", "Conventional apps use gamified streaks, intrusive alerts, and clinical forms that induce more anxiety.")

    # Card 2: What Calmspace Delivers
    add_card(s2, Inches(6.8), Inches(1.6), Inches(5.7), Inches(5.2))
    tb_c2 = s2.shapes.add_textbox(Inches(7.0), Inches(1.8), Inches(5.3), Inches(4.8))
    tf_c2 = tb_c2.text_frame
    tf_c2.word_wrap = True

    p = tf_c2.paragraphs[0]
    p.text = "What Calmspace Enables"
    p.font.name = FONT_HEADING
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = COLOR_PRIMARY
    p.space_after = Pt(14)

    add_bullet_point(tf_c2, "30-Second Check-Ins:", "Effortless tracking of mood, stress, and sleep in a single-column, distraction-free flow.")
    add_bullet_point(tf_c2, "Empathetic Self-Reflection:", "Understanding personal trends without being judged or diagnosed.")
    add_bullet_point(tf_c2, "Pacing & Balance:", "Study task management combined with integrated 5-minute breather timers.")
    add_bullet_point(tf_c2, "Immediate Human Escalation:", "Instant one-tap connection to verified national helplines and campus counsellors.")
    add_bullet_point(tf_c2, "Not Medical Software:", "Positioned deliberately as a comforting companion, never clinical diagnostic software.")

    s2.notes_slide.notes_text_frame.text = (
        "Explain the context: university life isn't just about grades; it's about the emotional pressure carried in silence. "
        "Existing apps either feel like cold diagnostic clinics or aggressive habit trackers with guilt-tripping streaks. "
        "Calmspace provides a safe, welcoming pause button for students."
    )

    # =========================================================================
    # SLIDE 3: Soft Editorial Wellness Design Philosophy (Section 02)
    # =========================================================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3, COLOR_BG)
    add_header(s3, "Soft Editorial Wellness — Design Philosophy", "02 — DESIGN SYSTEM")

    # 3 Column Cards
    col_width = Inches(3.65)
    gap = Inches(0.4)
    start_left = Inches(0.8)

    # Col 1: Principles
    c1 = add_card(s3, start_left, Inches(1.6), col_width, Inches(5.2))
    tb1 = s3.shapes.add_textbox(start_left + Inches(0.2), Inches(1.8), col_width - Inches(0.4), Inches(4.8))
    tf1 = tb1.text_frame
    tf1.word_wrap = True
    p = tf1.paragraphs[0]
    p.text = "5 Core UX Pillars"
    p.font.bold = True
    p.font.size = Pt(16)
    p.font.color.rgb = COLOR_TEXT_MAIN
    p.space_after = Pt(10)
    add_bullet_point(tf1, "Calm over clutter:", "Generous spacing, quiet margins, serene canvas.")
    add_bullet_point(tf1, "Human over clinical:", "Warm comforting language instead of medical diagnoses.")
    add_bullet_point(tf1, "Accessible by default:", "WCAG AA contrast, keyboard navigation, screen reader tables.")
    add_bullet_point(tf1, "Safety first:", "Emergency actions take priority over decorative UI.")
    add_bullet_point(tf1, "Privacy conscious:", "Zero reflection storage; anonymous session tokens.")

    # Col 2: Visual Identity & Color Tokens
    left2 = start_left + col_width + gap
    c2 = add_card(s3, left2, Inches(1.6), col_width, Inches(5.2))
    tb2 = s3.shapes.add_textbox(left2 + Inches(0.2), Inches(1.8), col_width - Inches(0.4), Inches(4.8))
    tf2 = tb2.text_frame
    tf2.word_wrap = True
    p = tf2.paragraphs[0]
    p.text = "Calm Visual Tokens"
    p.font.bold = True
    p.font.size = Pt(16)
    p.font.color.rgb = COLOR_PRIMARY
    p.space_after = Pt(10)
    add_bullet_point(tf2, "Canvas (#F7F6FB):", "Warm, soothing atmosphere.")
    add_bullet_point(tf2, "Primary (#5554B8):", "Deep focused indigo for calm confidence.")
    add_bullet_point(tf2, "Soft Sage (#DCE9DF):", "Healthy steady state and recovery badge.")
    add_bullet_point(tf2, "Soft Lavender (#E9E7FB):", "Gentle containers and suggestion chips.")
    add_bullet_point(tf2, "Warm Ink (#25233B):", "High-contrast effortless readability.")
    add_bullet_point(tf2, "Typography:", "Satoshi & Cabinet Grotesk editorial styling.")

    # Col 3: 3D Interactive Mascot
    left3 = left2 + col_width + gap
    c3 = add_card(s3, left3, Inches(1.6), col_width, Inches(5.2))
    tb3 = s3.shapes.add_textbox(left3 + Inches(0.2), Inches(1.8), col_width - Inches(0.4), Inches(4.8))
    tf3 = tb3.text_frame
    tf3.word_wrap = True
    p = tf3.paragraphs[0]
    p.text = "3D Interactive Mascot"
    p.font.bold = True
    p.font.size = Pt(16)
    p.font.color.rgb = COLOR_TEXT_MAIN
    p.space_after = Pt(10)
    add_bullet_point(tf3, "Tactile Character:", "A soft lavender 3D clay blob living on the landing page.")
    add_bullet_point(tf3, "Reactive Physics:", "Squash-and-stretch physics tracking cursor and touch gestures.")
    add_bullet_point(tf3, "WebGL & Three.js:", "Custom GLSL vertex deformation and pear-sculpted geometry.")
    add_bullet_point(tf3, "Emotional Connection:", "Creates an immediate sense of warmth before any input is requested.")

    s3.notes_slide.notes_text_frame.text = (
        "Highlight our design philosophy: Soft Editorial Wellness. "
        "Every token, from our serene canvas to the tactile 3D lavender blob, is engineered to lower cortisol. "
        "We reject gamification streaks in favor of intentional, quiet pacing."
    )

    # =========================================================================
    # SLIDE 4: Full-Stack Architecture (Section 04)
    # =========================================================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4, COLOR_BG)
    add_header(s4, "Full-Stack System Architecture", "04 — ARCHITECTURE & TECH STACK")

    # Card 1: Frontend Architecture
    add_card(s4, Inches(0.8), Inches(1.6), Inches(3.7), Inches(5.2))
    tb_fe = s4.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(3.3), Inches(4.8))
    tf_fe = tb_fe.text_frame
    tf_fe.word_wrap = True
    p = tf_fe.paragraphs[0]
    p.text = "Frontend (Client)"
    p.font.bold = True
    p.font.size = Pt(18)
    p.font.color.rgb = COLOR_PRIMARY
    p.space_after = Pt(12)
    add_bullet_point(tf_fe, "React 19 & TypeScript:", "Strictly typed, reactive single-page app.")
    add_bullet_point(tf_fe, "Vite Dev & Build:", "Lightning-fast HMR and optimized production bundling.")
    add_bullet_point(tf_fe, "Tailwind CSS:", "Design token architecture with custom utility classes.")
    add_bullet_point(tf_fe, "Recharts:", "Accessible, responsive wellbeing trend visualizations.")
    add_bullet_point(tf_fe, "Three.js / WebGL:", "Interactive 3D volumetric mascot controller.")

    # Card 2: Backend Architecture
    add_card(s4, Inches(4.8), Inches(1.6), Inches(3.7), Inches(5.2))
    tb_be = s4.shapes.add_textbox(Inches(5.0), Inches(1.8), Inches(3.3), Inches(4.8))
    tf_be = tb_be.text_frame
    tf_be.word_wrap = True
    p = tf_be.paragraphs[0]
    p.text = "Backend (FastAPI)"
    p.font.bold = True
    p.font.size = Pt(18)
    p.font.color.rgb = COLOR_PRIMARY
    p.space_after = Pt(12)
    add_bullet_point(tf_be, "Python & FastAPI:", "High-performance async REST API with automatic OpenAPI docs.")
    add_bullet_point(tf_be, "Pydantic v2:", "Strict input validation and schema contracts.")
    add_bullet_point(tf_be, "Pure Safety Engine:", "Deterministic, zero-I/O mathematical routing module.")
    add_bullet_point(tf_be, "AI Adapter Layer:", "Provider abstraction (Gemini / Mock) with validation filters.")
    add_bullet_point(tf_be, "Dynamic CORS:", "Configurable multi-environment origin isolation.")

    # Card 3: Storage & Integration
    add_card(s4, Inches(8.8), Inches(1.6), Inches(3.7), Inches(5.2))
    tb_st = s4.shapes.add_textbox(Inches(9.0), Inches(1.8), Inches(3.3), Inches(4.8))
    tf_st = tb_st.text_frame
    tf_st.word_wrap = True
    p = tf_st.paragraphs[0]
    p.text = "Data & Security"
    p.font.bold = True
    p.font.size = Pt(18)
    p.font.color.rgb = COLOR_PRIMARY
    p.space_after = Pt(12)
    add_bullet_point(tf_st, "Anonymous Storage:", "Indexed by UUID token; no email, password, or student ID.")
    add_bullet_point(tf_st, "SQLite with WAL:", "Fast, persistent storage surviving restarts, deployable to PostgreSQL.")
    add_bullet_point(tf_st, "Zero-Storage Reflections:", "Reflections processed strictly in runtime memory, never written to disk.")
    add_bullet_point(tf_st, "2-Step Data Erasure:", "Instant transactional purge across all database tables.")
    add_bullet_point(tf_st, "CI Automation:", "GitHub Actions validating lint, types, and 226 tests on every commit.")

    s4.notes_slide.notes_text_frame.text = (
        "Explain our modern decoupled architecture: React 19 on the frontend, FastAPI on the backend. "
        "Notice the clean boundary: the frontend never evaluates safety scores; the backend never leaks database credentials; "
        "and our persistence engine structurally excludes reflection text."
    )

    # =========================================================================
    # SLIDE 5: Safety Routing & The Deterministic Boundary (Section 05)
    # =========================================================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5, COLOR_BG)
    add_header(s5, "Safety Routing Architecture & The AI Bypass Rule", "05 — SAFETY ARCHITECTURE")

    # Table Card
    add_card(s5, Inches(0.8), Inches(1.6), Inches(11.7), Inches(5.2))
    tb_safe = s5.shapes.add_textbox(Inches(1.1), Inches(1.8), Inches(11.1), Inches(4.8))
    tf_safe = tb_safe.text_frame
    tf_safe.word_wrap = True

    p = tf_safe.paragraphs[0]
    p.text = "Deterministic Safety Matrix: Evaluated Strictly on Backend"
    p.font.name = FONT_HEADING
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = COLOR_TEXT_MAIN
    p.space_after = Pt(14)

    add_bullet_point(tf_safe, "LOW ROUTE (Doing Okay):", "Conditions: Mood >= 3, Stress <= 2, Sleep >= 6.0h. Soft Sage badge (#DCE9DF). Receives 3-5 sentence supportive reflection and 2 pacing chips.")
    add_bullet_point(tf_safe, "MEDIUM ROUTE (Worth Support):", "Conditions: Mood = 2, Stress 3-4, Sleep < 6.0h, or declining trend. Muted Amber badge. Delivers grounding breath exercise, pacing suggestions, and campus counseling links.")
    add_bullet_point(tf_safe, "HIGH ROUTE (Let's Get You Support):", "Conditions: Mood = 1, Stress = 5, Sleep < 3.5h, or crisis keywords. Calm High-Contrast Plum/Ink screen. AI IS 100% BYPASSED.")
    add_bullet_point(tf_safe, "THE STRICT AI BYPASS GUARANTEE:", "Whenever acute crisis or high risk is detected, zero LLM API calls are made. We never let an AI improvise when human life is on the line.")
    add_bullet_point(tf_safe, "Multilingual Crisis Corpus:", "Trained on English, Hindi, Devanagari, and Hinglish crisis phrases with sentence-isolated negation handling.")
    add_bullet_point(tf_safe, "Protected Immutable Code:", "safety_evaluator.py is locked to SHA 8f5e2e98... with 156 regression tests.")

    s5.notes_slide.notes_text_frame.text = (
        "This is the core ethical breakthrough of Calmspace: 'Rules decide safety. AI writes language. Humans provide care.' "
        "LLMs hallucinate and cannot be trusted with safety triage. "
        "Our backend mathematical engine decides the route. On the High route, AI is 100% bypassed and verified humans take over."
    )

    # =========================================================================
    # SLIDE 6: Privacy by Design & Zero-Storage Memory (Section 06)
    # =========================================================================
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6, COLOR_BG)
    add_header(s6, "Privacy by Design & Data Safeguards", "06 — PRIVACY SAFEGUARDS")

    add_card(s6, Inches(0.8), Inches(1.6), Inches(5.6), Inches(5.2))
    tb_p1 = s6.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(5.2), Inches(4.8))
    tf_p1 = tb_p1.text_frame
    tf_p1.word_wrap = True

    p = tf_p1.paragraphs[0]
    p.text = "Structural Architectural Privacy"
    p.font.name = FONT_HEADING
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = COLOR_TEXT_MAIN
    p.space_after = Pt(12)

    add_bullet_point(tf_p1, "No Intrusive Identity:", "Students interact through an anonymous UUID session token. Zero roll numbers, emails, or names required.")
    add_bullet_point(tf_p1, "Zero-Storage Reflections:", "Free-text reflection is evaluated in volatile memory for crisis words, then immediately discarded. No 'reflection' column exists in SQLite/Postgres tables.")
    add_bullet_point(tf_p1, "Strict Session Isolation:", "Session A can never query, read, toggle, or delete Session B's check-ins or study tasks.")
    add_bullet_point(tf_p1, "Explicit AI Consent:", "If student untoggles AI consent, free-text reflection is completely omitted from AI payloads.")

    add_card(s6, Inches(6.8), Inches(1.6), Inches(5.7), Inches(5.2))
    tb_p2 = s6.shapes.add_textbox(Inches(7.0), Inches(1.8), Inches(5.3), Inches(4.8))
    tf_p2 = tb_p2.text_frame
    tf_p2.word_wrap = True

    p = tf_p2.paragraphs[0]
    p.text = "Student Control & Data Deletion"
    p.font.name = FONT_HEADING
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = COLOR_PRIMARY
    p.space_after = Pt(12)

    add_bullet_point(tf_p2, "2-Step Permanent Purge:", "Clicking 'Delete all my data' triggers an atomic DELETE across all tables, permanently purging check-ins, tasks, and settings.")
    add_bullet_point(tf_p2, "Safe Error Responses:", "Database failure responses never leak SQL statements, stack traces, or credentials to the client.")
    add_bullet_point(tf_p2, "No Behavioral Ad Tracking:", "Zero third-party trackers, commercial tracking cookies, or data brokers.")
    add_bullet_point(tf_p2, "Non-Diagnostic Language:", "Personal metrics are descriptive pacing reflections, never clinical diagnoses or disorder classifications.")

    s6.notes_slide.notes_text_frame.text = (
        "Explain that in Calmspace, privacy is architectural, not merely contractual. "
        "Show judges that we do not store reflection text even on our servers. "
        "Students can wipe their entire digital footprint with one click."
    )

    # =========================================================================
    # SLIDE 7: Verified Human Support Network (Section 07)
    # =========================================================================
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_background(s7, COLOR_BG)
    add_header(s7, "Verified Human Support Network", "07 — HUMAN CARE")

    # Full card container
    add_card(s7, Inches(0.8), Inches(1.6), Inches(11.7), Inches(5.2))
    tb_dir = s7.shapes.add_textbox(Inches(1.1), Inches(1.8), Inches(11.1), Inches(4.8))
    tf_dir = tb_dir.text_frame
    tf_dir.word_wrap = True

    p = tf_dir.paragraphs[0]
    p.text = "Direct, One-Tap Access to Certified Human Helplines"
    p.font.name = FONT_HEADING
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = COLOR_TEXT_MAIN
    p.space_after = Pt(12)

    add_bullet_point(tf_dir, "Tele-MANAS (Govt. of India):", "Dial 14416 / 1800-891-4416. 24/7, Toll-Free, available in 20+ national languages. Ministry of Health & Family Welfare verified.")
    add_bullet_point(tf_dir, "National Emergency Services:", "Dial 112. 24/7 instant emergency ambulance, medical, and police dispatch via Emergency Response Support System (ERSS).")
    add_bullet_point(tf_dir, "University Student Wellbeing Unit:", "Phone: +91 (011) 2659-7100. Drop-in support and confidential consultations with licensed campus clinical psychologists.")
    add_bullet_point(tf_dir, "Vandrevala Foundation:", "Dial +91 9999 666 555. 24/7 free empathetic crisis intervention and psychological support.")
    add_bullet_point(tf_dir, "iCALL Psychosocial Helpline (TISS):", "Dial 022-25521111 / +91 9152 987 821. Run by Tata Institute of Social Sciences, offering student-tailored counseling.")
    add_bullet_point(tf_dir, "Source Auditing Guarantee:", "Every single directory entry displays its official verification source and last-verified audit date.")

    s7.notes_slide.notes_text_frame.text = (
        "When students are in acute distress, chatbots cannot replace humans. "
        "Calmspace provides verified, source-audited helplines accessible within one tap from every single view. "
        "No searching, no navigation barriers, no friction."
    )

    # =========================================================================
    # SLIDE 8: Team Ownership & Code Contributions (Section 09)
    # =========================================================================
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_background(s8, COLOR_BG)
    add_header(s8, "Engineering Ownership & GitHub Contributions", "08 — TEAM OWNERSHIP")

    # Member 1 Card
    add_card(s8, Inches(0.8), Inches(1.6), Inches(5.6), Inches(5.2))
    tb_m1 = s8.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(5.2), Inches(4.8))
    tf_m1 = tb_m1.text_frame
    tf_m1.word_wrap = True
    p = tf_m1.paragraphs[0]
    p.text = "Nikhil Chhetri (@nikhi20-900)"
    p.font.bold = True
    p.font.size = Pt(17)
    p.font.color.rgb = COLOR_PRIMARY
    p.space_after = Pt(10)
    add_bullet_point(tf_m1, "Frontend Lead & Design System:", "React 19 application shell, responsive navigation, and design tokens.")
    add_bullet_point(tf_m1, "Interactive 3D Mascot:", "Three.js volumetric clay blob, WebGL vertex animations, tactile rubber-band physics.")
    add_bullet_point(tf_m1, "Daily Check-In UX:", "Step-by-step single column check-in with accessible sliders and steppers.")
    add_bullet_point(tf_m1, "Safety Engine & Corpus:", "Pure deterministic wellbeing safety evaluator and multilingual crisis corpus (Issues #2, #3, #4, #8).")

    # Member 2 (Roushan) Card
    add_card(s8, Inches(6.8), Inches(1.6), Inches(5.7), Inches(5.2))
    tb_m2 = s8.shapes.add_textbox(Inches(7.0), Inches(1.8), Inches(5.3), Inches(4.8))
    tf_m2 = tb_m2.text_frame
    tf_m2.word_wrap = True
    p = tf_m2.paragraphs[0]
    p.text = "Roushan (@roushan-23) — Backend & Data Lead"
    p.font.bold = True
    p.font.size = Pt(17)
    p.font.color.rgb = COLOR_PRIMARY
    p.space_after = Pt(10)
    add_bullet_point(tf_m2, "Issue #1 (Architecture & Contracts):", "System boundaries, shared API contracts, environment setup, dynamic CORS.")
    add_bullet_point(tf_m2, "Issue #10 (Persistent Anonymous Storage):", "SQLite persistent storage with WAL mode, structural zero-reflection guarantee, session isolation, 2-step wipe.")
    add_bullet_point(tf_m2, "Issue #14 (Analytics Layer):", "Dedicated analytics service, 1-90 day bounded queries, Recharts trend formatting, non-diagnostic guardrails.")
    add_bullet_point(tf_m2, "Issue #16 (Demo Journey & Rehearsal):", "8-step hackathon demo script, synthetic test data, AI bypass live verification.")

    s8.notes_slide.notes_text_frame.text = (
        "Highlight the team's seamless collaboration: Nikhil led the frontend design, 3D mascot, and safety rules. "
        "Roushan owned the backend infrastructure, database persistence, session isolation, analytics aggregation, and demo coordination."
    )

    # =========================================================================
    # SLIDE 9: Quality Assurance & Engineering Rigor (Section 12)
    # =========================================================================
    s9 = prs.slides.add_slide(blank_layout)
    set_slide_background(s9, COLOR_BG)
    add_header(s9, "Engineering Rigor & Automated Verification", "09 — QUALITY & TESTING")

    # 3 Stat Cards
    add_card(s9, Inches(0.8), Inches(1.6), Inches(3.7), Inches(2.2), COLOR_LAVENDER)
    tb_st1 = s9.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(3.3), Inches(1.8))
    tf_st1 = tb_st1.text_frame
    tf_st1.word_wrap = True
    p = tf_st1.paragraphs[0]
    p.text = "226 TESTS"
    p.font.bold = True
    p.font.size = Pt(28)
    p.font.color.rgb = COLOR_PRIMARY
    p2 = tf_st1.add_paragraph()
    p2.text = "100% Passing Automated Pytest Suite covering safety routing, corpus, storage, analytics & AI"
    p2.font.size = Pt(11)
    p2.font.color.rgb = COLOR_TEXT_MAIN

    add_card(s9, Inches(4.8), Inches(1.6), Inches(3.7), Inches(2.2), COLOR_SAGE)
    tb_st2 = s9.shapes.add_textbox(Inches(5.0), Inches(1.8), Inches(3.3), Inches(1.8))
    tf_st2 = tb_st2.text_frame
    tf_st2.word_wrap = True
    p = tf_st2.paragraphs[0]
    p.text = "100% CI GREEN"
    p.font.bold = True
    p.font.size = Pt(28)
    p.font.color.rgb = RGBColor(40, 120, 60)
    p2 = tf_st2.add_paragraph()
    p2.text = "GitHub Actions CI passing on every commit: Ruff formatting, linting, typechecking & tests"
    p2.font.size = Pt(11)
    p2.font.color.rgb = COLOR_TEXT_MAIN

    add_card(s9, Inches(8.8), Inches(1.6), Inches(3.7), Inches(2.2), COLOR_PEACH)
    tb_st3 = s9.shapes.add_textbox(Inches(9.0), Inches(1.8), Inches(3.3), Inches(1.8))
    tf_st3 = tb_st3.text_frame
    tf_st3.word_wrap = True
    p = tf_st3.paragraphs[0]
    p.text = "WCAG AA"
    p.font.bold = True
    p.font.size = Pt(28)
    p.font.color.rgb = RGBColor(160, 80, 40)
    p2 = tf_st3.add_paragraph()
    p2.text = "Full accessibility compliance: high contrast, keyboard traps, screen reader tables, reduced motion"
    p2.font.size = Pt(11)
    p2.font.color.rgb = COLOR_TEXT_MAIN

    # Lower Card: Test Coverage Breakdown
    add_card(s9, Inches(0.8), Inches(4.1), Inches(11.7), Inches(2.7))
    tb_cov = s9.shapes.add_textbox(Inches(1.1), Inches(4.3), Inches(11.1), Inches(2.3))
    tf_cov = tb_cov.text_frame
    tf_cov.word_wrap = True
    p = tf_cov.paragraphs[0]
    p.text = "Automated Test Coverage Breakdown"
    p.font.bold = True
    p.font.size = Pt(16)
    p.font.color.rgb = COLOR_TEXT_MAIN
    p.space_after = Pt(8)
    add_bullet_point(tf_cov, "Safety Routing Suite (156 tests):", "Mathematical validation across every mood, stress, and sleep combination, crisis indicators, and history transitions.")
    add_bullet_point(tf_cov, "Multilingual Crisis Corpus (8 tests):", "Devanagari, Hindi, Hinglish, and English distress phrasing with clause negation bounds.")
    add_bullet_point(tf_cov, "Storage & Persistence (5 tests):", "Cross-session isolation, restart survival, zero-reflection schema guarantees, and complete 2-step data purge.")
    add_bullet_point(tf_cov, "Analytics Aggregation (6 tests):", "Bounded windows, edge math, zero division safety, and clinical terminology rejection.")

    s9.notes_slide.notes_text_frame.text = (
        "Emphasize our software engineering quality: 226 automated tests passing in under 6 seconds. "
        "Zero linting errors with Ruff, full WCAG AA accessibility compliance, and verified GitHub Actions CI."
    )

    # =========================================================================
    # SLIDE 10: Live Demo Journey & Conclusion
    # =========================================================================
    s10 = prs.slides.add_slide(blank_layout)
    set_slide_background(s10, COLOR_BG)
    add_header(s10, "Hackathon Live Demo Journey & Summary", "10 — LIVE DEMO")

    add_card(s10, Inches(0.8), Inches(1.6), Inches(7.4), Inches(5.2))
    tb_demo = s10.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(7.0), Inches(4.8))
    tf_demo = tb_demo.text_frame
    tf_demo.word_wrap = True
    p = tf_demo.paragraphs[0]
    p.text = "5-Minute Live Judging Walkthrough"
    p.font.bold = True
    p.font.size = Pt(18)
    p.font.color.rgb = COLOR_PRIMARY
    p.space_after = Pt(12)
    add_bullet_point(tf_demo, "1. 3D Mascot Sanctuary:", "Open localhost:3000 — interact with the calm lavender clay blob.")
    add_bullet_point(tf_demo, "2. Daily Check-In Flow:", "Submit synthetic steady check-in (Mood 4, Stress 2, Sleep 7.5h).")
    add_bullet_point(tf_demo, "3. Deterministic Safety:", "Show 'Doing okay' badge and supportive pacing encouragement.")
    add_bullet_point(tf_demo, "4. Personal Insights & Breather:", "View interactive Recharts trends and start the 5-min breather timer.")
    add_bullet_point(tf_demo, "5. THE HIGH-ROUTE SAFETY PROOF:", "Submit synthetic crisis text -> Prove live that AI is 100% bypassed and Tele-MANAS (14416) escalates immediately.")
    add_bullet_point(tf_demo, "6. Privacy & 2-Step Wipe:", "Settings tab -> Delete all data -> Verify database is instantly purged.")

    # Right Card: Conclusion
    add_card(s10, Inches(8.5), Inches(1.6), Inches(4.0), Inches(5.2), COLOR_SURFACE)
    tb_ccl = s10.shapes.add_textbox(Inches(8.7), Inches(1.8), Inches(3.6), Inches(4.8))
    tf_ccl = tb_ccl.text_frame
    tf_ccl.word_wrap = True
    p = tf_ccl.paragraphs[0]
    p.text = "Calmspace Impact"
    p.font.bold = True
    p.font.size = Pt(18)
    p.font.color.rgb = COLOR_TEXT_MAIN
    p.space_after = Pt(12)

    p_quote = tf_ccl.add_paragraph()
    p_quote.text = "« Rules decide safety.\nAI supports language.\nHumans provide care. »"
    p_quote.font.italic = True
    p_quote.font.bold = True
    p_quote.font.size = Pt(14)
    p_quote.font.color.rgb = COLOR_PRIMARY
    p_quote.space_after = Pt(16)

    p_repo = tf_ccl.add_paragraph()
    p_repo.text = "GitHub Repository:\ngithub.com/nikhi20-900/calmspace\n\nContributors:\n• Nikhil Chhetri (@nikhi20-900)\n• Roushan (@roushan-23)\n\nThank you!"
    p_repo.font.size = Pt(12)
    p_repo.font.color.rgb = COLOR_TEXT_MUTED

    s10.notes_slide.notes_text_frame.text = (
        "Wrap up with our demonstration journey and impact statement. "
        "Invite the judges to try the 3D blob and review our deterministic AI bypass and privacy guarantees. "
        "Open for QA."
    )

    # Save presentation
    output_path = "Calmspace_Presentation.pptx"
    prs.save(output_path)
    print(f"Presentation successfully generated and saved to {output_path}")


if __name__ == "__main__":
    build_presentation()
