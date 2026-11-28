"""
Calmspace Professional PowerPoint Generator
Generates a 16:9 widescreen executive presentation (12 slides) for
https://github.com/nikhi20-900/calmspace matching the Soft Editorial Wellness design.
"""

import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# ---------------------------------------------------------------------------
# Calmspace Soft Editorial Wellness Palette
# ---------------------------------------------------------------------------
COLOR_BG = RGBColor(247, 246, 251)          # #F7F6FB Serene Canvas
COLOR_SURFACE = RGBColor(255, 255, 255)     # #FFFFFF Card Surface
COLOR_PRIMARY = RGBColor(85, 84, 184)       # #5554B8 Deep Indigo
COLOR_PRIMARY_DARK = RGBColor(55, 54, 130)  # #373682 Dark Indigo
COLOR_LAVENDER = RGBColor(233, 231, 251)    # #E9E7FB Soft Lavender
COLOR_SAGE = RGBColor(220, 233, 223)        # #DCE9DF Soft Sage
COLOR_SAGE_TEXT = RGBColor(36, 85, 50)      # #245532 Deep Sage
COLOR_PEACH = RGBColor(244, 220, 203)       # #F4DCCB Soft Peach
COLOR_PEACH_TEXT = RGBColor(140, 74, 34)    # #8C4A22 Deep Peach/Amber
COLOR_ROSE = RGBColor(252, 228, 232)        # #FCE4E8 Soft Rose
COLOR_ROSE_TEXT = RGBColor(166, 38, 57)     # #A62639 Deep Rose
COLOR_TEXT_MAIN = RGBColor(37, 35, 59)      # #25233B Deep Warm Ink
COLOR_TEXT_MUTED = RGBColor(98, 95, 120)    # #625F78 Secondary Ink
COLOR_BORDER = RGBColor(232, 230, 241)      # #E8E6F1 Subtle Border
COLOR_WHITE = RGBColor(255, 255, 255)

FONT_HEADING = "Segoe UI"
FONT_BODY = "Segoe UI"
REPO_URL = "github.com/nikhi20-900/calmspace"
TOTAL_SLIDES = 12


def set_slide_background(slide, color=COLOR_BG):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color


def add_header(slide, title_text, category_badge, slide_num):
    # Top subtle accent bar
    bar = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(0.08)
    )
    bar.fill.solid()
    bar.fill.fore_color.rgb = COLOR_PRIMARY
    bar.line.fill.background()

    # Category pill
    pill = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.75), Inches(0.32), Inches(3.2), Inches(0.32)
    )
    pill.fill.solid()
    pill.fill.fore_color.rgb = COLOR_LAVENDER
    pill.line.fill.background()
    tf_p = pill.text_frame
    tf_p.word_wrap = False
    tf_p.margin_left = Inches(0.12)
    tf_p.margin_top = Inches(0.03)
    p_p = tf_p.paragraphs[0]
    p_p.text = category_badge.upper()
    p_p.font.name = FONT_HEADING
    p_p.font.size = Pt(10)
    p_p.font.bold = True
    p_p.font.color.rgb = COLOR_PRIMARY

    # Title
    title_box = slide.shapes.add_textbox(Inches(0.75), Inches(0.72), Inches(11.8), Inches(0.65))
    tf_title = title_box.text_frame
    tf_title.word_wrap = True
    tf_title.margin_left = 0
    tf_title.margin_top = 0
    p_title = tf_title.paragraphs[0]
    p_title.text = title_text
    p_title.font.name = FONT_HEADING
    p_title.font.size = Pt(26)
    p_title.font.bold = True
    p_title.font.color.rgb = COLOR_TEXT_MAIN

    # Footer
    footer_left = slide.shapes.add_textbox(Inches(0.75), Inches(7.05), Inches(8.0), Inches(0.3))
    tf_fl = footer_left.text_frame
    p_fl = tf_fl.paragraphs[0]
    p_fl.text = f"Calmspace  •  Student Wellbeing Companion  •  {REPO_URL}"
    p_fl.font.name = FONT_BODY
    p_fl.font.size = Pt(9.5)
    p_fl.font.color.rgb = COLOR_TEXT_MUTED

    footer_right = slide.shapes.add_textbox(Inches(11.3), Inches(7.05), Inches(1.28), Inches(0.3))
    tf_fr = footer_right.text_frame
    p_fr = tf_fr.paragraphs[0]
    p_fr.alignment = PP_ALIGN.RIGHT
    p_fr.text = f"{slide_num} / {TOTAL_SLIDES}"
    p_fr.font.name = FONT_BODY
    p_fr.font.size = Pt(9.5)
    p_fr.font.bold = True
    p_fr.font.color.rgb = COLOR_PRIMARY


def add_card(
    slide,
    left,
    top,
    width,
    height,
    bg_color=COLOR_SURFACE,
    border_color=COLOR_BORDER,
    accent_top_color=None,
):
    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height
    )
    shape.adjustments[0] = 0.04
    shape.fill.solid()
    shape.fill.fore_color.rgb = bg_color
    shape.line.color.rgb = border_color
    shape.line.width = Pt(1.1)

    if accent_top_color is not None:
        strip = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE,
            left + Inches(0.18),
            top + Inches(0.14),
            Inches(0.55),
            Inches(0.06),
        )
        strip.fill.solid()
        strip.fill.fore_color.rgb = accent_top_color
        strip.line.fill.background()
    return shape


def add_card_title(slide, left, top, width, title, subtitle=None, color=COLOR_TEXT_MAIN):
    tb = slide.shapes.add_textbox(left, top, width, Inches(0.75))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = 0
    tf.margin_top = 0
    p = tf.paragraphs[0]
    p.text = title
    p.font.name = FONT_HEADING
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = color
    if subtitle:
        p2 = tf.add_paragraph()
        p2.text = subtitle
        p2.font.name = FONT_BODY
        p2.font.size = Pt(11.5)
        p2.font.color.rgb = COLOR_TEXT_MUTED
        p2.space_before = Pt(3)
    return tb


def add_bullets(slide, left, top, width, height, items, pt_size=12.5, space_after=8):
    tb = slide.shapes.add_textbox(left, top, width, height)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = 0
    tf.margin_top = 0
    for idx, (prefix, body) in enumerate(items):
        p = tf.paragraphs[0] if idx == 0 else tf.add_paragraph()
        p.space_after = Pt(space_after)

        r_bul = p.add_run()
        r_bul.text = "•  "
        r_bul.font.name = FONT_BODY
        r_bul.font.bold = True
        r_bul.font.size = Pt(pt_size)
        r_bul.font.color.rgb = COLOR_PRIMARY

        if prefix:
            r_pre = p.add_run()
            r_pre.text = prefix + " "
            r_pre.font.name = FONT_BODY
            r_pre.font.bold = True
            r_pre.font.size = Pt(pt_size)
            r_pre.font.color.rgb = COLOR_TEXT_MAIN

        r_body = p.add_run()
        r_body.text = body
        r_body.font.name = FONT_BODY
        r_body.font.size = Pt(pt_size)
        r_body.font.color.rgb = COLOR_TEXT_MUTED
    return tb


def build_presentation():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank = prs.slide_layouts[6]

    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    mascot_path = os.path.join(repo_root, "docs", "assets", "calmspace_mascot.jpg")

    # =========================================================================
    # SLIDE 1: Title Slide
    # =========================================================================
    s1 = prs.slides.add_slide(blank)
    set_slide_background(s1, COLOR_BG)

    top_bar = s1.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(0.1)
    )
    top_bar.fill.solid()
    top_bar.fill.fore_color.rgb = COLOR_PRIMARY
    top_bar.line.fill.background()

    add_card(s1, Inches(0.75), Inches(0.9), Inches(7.35), Inches(5.7), COLOR_SURFACE)

    tb1 = s1.shapes.add_textbox(Inches(1.15), Inches(1.25), Inches(6.55), Inches(5.0))
    tf1 = tb1.text_frame
    tf1.word_wrap = True

    p_tag = tf1.paragraphs[0]
    p_tag.text = "STUDENT WELLBEING COMPANION"
    p_tag.font.name = FONT_HEADING
    p_tag.font.size = Pt(12)
    p_tag.font.bold = True
    p_tag.font.color.rgb = COLOR_PRIMARY
    p_tag.space_after = Pt(10)

    p_title = tf1.add_paragraph()
    p_title.text = "Calmspace"
    p_title.font.name = FONT_HEADING
    p_title.font.size = Pt(48)
    p_title.font.bold = True
    p_title.font.color.rgb = COLOR_TEXT_MAIN
    p_title.space_after = Pt(6)

    p_sub = tf1.add_paragraph()
    p_sub.text = "A quieter space to check in with yourself."
    p_sub.font.name = FONT_BODY
    p_sub.font.size = Pt(19)
    p_sub.font.italic = True
    p_sub.font.color.rgb = COLOR_TEXT_MUTED
    p_sub.space_after = Pt(22)

    p_desc = tf1.add_paragraph()
    p_desc.text = (
        "Privacy-conscious university student wellbeing companion combining "
        "Soft Editorial Wellness design, deterministic crisis routing, 3D voice "
        "companionship, guided wellness activities, and verified human support."
    )
    p_desc.font.name = FONT_BODY
    p_desc.font.size = Pt(13.5)
    p_desc.font.color.rgb = COLOR_TEXT_MAIN
    p_desc.space_after = Pt(26)

    # Core principle pill
    pill_box = add_card(
        s1, Inches(1.15), Inches(4.85), Inches(6.55), Inches(0.72), COLOR_LAVENDER, COLOR_LAVENDER
    )
    tb_pill = s1.shapes.add_textbox(Inches(1.35), Inches(4.98), Inches(6.15), Inches(0.5))
    tf_pill = tb_pill.text_frame
    p_pill = tf_pill.paragraphs[0]
    p_pill.text = "Rules decide safety.  AI writes the language.  Humans help."
    p_pill.font.name = FONT_HEADING
    p_pill.font.size = Pt(13.5)
    p_pill.font.bold = True
    p_pill.font.color.rgb = COLOR_PRIMARY_DARK

    tb_repo = s1.shapes.add_textbox(Inches(1.15), Inches(5.85), Inches(6.55), Inches(0.4))
    p_repo = tb_repo.text_frame.paragraphs[0]
    p_repo.text = f"GitHub: https://{REPO_URL}   •   React 18 + FastAPI + SQLite WAL"
    p_repo.font.name = FONT_BODY
    p_repo.font.size = Pt(11.5)
    p_repo.font.bold = True
    p_repo.font.color.rgb = COLOR_PRIMARY

    # Right visual card with real mascot image
    add_card(s1, Inches(8.4), Inches(0.9), Inches(4.18), Inches(5.7), COLOR_LAVENDER, COLOR_BORDER)
    if os.path.exists(mascot_path):
        s1.shapes.add_picture(
            mascot_path, Inches(8.64), Inches(1.15), width=Inches(3.7)
        )
    tb_cap = s1.shapes.add_textbox(Inches(8.64), Inches(5.05), Inches(3.7), Inches(1.3))
    tf_cap = tb_cap.text_frame
    tf_cap.word_wrap = True
    pc1 = tf_cap.paragraphs[0]
    pc1.alignment = PP_ALIGN.CENTER
    pc1.text = "3D Lavender Mascot & Voice Companion"
    pc1.font.name = FONT_HEADING
    pc1.font.size = Pt(13.5)
    pc1.font.bold = True
    pc1.font.color.rgb = COLOR_PRIMARY_DARK
    pc2 = tf_cap.add_paragraph()
    pc2.alignment = PP_ALIGN.CENTER
    pc2.space_before = Pt(4)
    pc2.text = "Interactive Three.js GLSL experience with reduced-motion accessibility"
    pc2.font.name = FONT_BODY
    pc2.font.size = Pt(11)
    pc2.font.color.rgb = COLOR_TEXT_MUTED

    # =========================================================================
    # SLIDE 2: Problem & Non-Clinical Vision
    # =========================================================================
    s2 = prs.slides.add_slide(blank)
    set_slide_background(s2)
    add_header(s2, "The Problem & Our Non-Clinical Vision", "01 • Purpose & Scope", 2)

    # Left card: The Challenge
    add_card(s2, Inches(0.75), Inches(1.55), Inches(5.75), Inches(5.2), COLOR_SURFACE, COLOR_BORDER, COLOR_PEACH_TEXT)
    add_card_title(
        s2, Inches(1.0), Inches(1.85), Inches(5.25),
        "Why Existing Student Tools Fall Short",
        "Quiet academic pressure meets clinical or guilt-driven apps"
    )
    add_bullets(s2, Inches(1.0), Inches(2.7), Inches(5.25), Inches(3.8), [
        ("Everyday Pressure:", "Students carry compounding stress from deadlines, exams, and sleep disruption."),
        ("Clinical Friction:", "Traditional portals feel cold, diagnostic, and intimidating for routine check-ins."),
        ("Streak Guilt:", "Gamified productivity trackers punish missed days instead of supporting rest."),
        ("AI Safety Risk:", "Unbounded chatbots can hallucinate or give unsafe responses during moments of crisis."),
    ], pt_size=12.5, space_after=12)

    # Right card: Calmspace Solution
    add_card(s2, Inches(6.8), Inches(1.55), Inches(5.78), Inches(5.2), COLOR_SURFACE, COLOR_BORDER, COLOR_PRIMARY)
    add_card_title(
        s2, Inches(7.05), Inches(1.85), Inches(5.28),
        "The Calmspace Approach",
        "Calm, private reflection backed by deterministic safety"
    )
    add_bullets(s2, Inches(7.05), Inches(2.7), Inches(5.28), Inches(2.8), [
        ("60-Second Check-Ins:", "Log mood, stress, sleep, and an optional reflection without judgment."),
        ("Pattern Visibility:", "7/14/30-day Mood Trend analytics with accessible data tables."),
        ("Active Reset Tools:", "Breathing Bubble, Guided Video Player, Study Planner, and Sound Lounge."),
        ("Strict Non-Clinical Boundary:", "Never diagnoses, prescribes, or replaces licensed counselling."),
    ], pt_size=12.5, space_after=11)

    # Highlight callout inside right card
    add_card(s2, Inches(7.05), Inches(5.55), Inches(5.28), Inches(0.95), COLOR_SAGE, COLOR_SAGE)
    tb2_call = s2.shapes.add_textbox(Inches(7.25), Inches(5.68), Inches(4.88), Inches(0.75))
    tf2_c = tb2_call.text_frame
    tf2_c.word_wrap = True
    p2c = tf2_c.paragraphs[0]
    p2c.text = "Non-Clinical Guarantee: When elevated distress appears, verified human helplines (Tele-MANAS 14416 / 112) immediately supersede AI dialogue."
    p2c.font.name = FONT_BODY
    p2c.font.size = Pt(11.5)
    p2c.font.bold = True
    p2c.font.color.rgb = COLOR_SAGE_TEXT

    # =========================================================================
    # SLIDE 3: Soft Editorial Wellness Design System
    # =========================================================================
    s3 = prs.slides.add_slide(blank)
    set_slide_background(s3)
    add_header(s3, "Soft Editorial Wellness Design System", "02 • Design Philosophy", 3)

    # Top row: 5 Design Principles
    principles = [
        ("Calm Over Clutter", "Single-column check-in steps, generous whitespace, zero streak guilt.", COLOR_PRIMARY),
        ("Human Over Clinical", "Everyday language ('Doing okay', 'Carrying a lot') over clinical labels.", COLOR_SAGE_TEXT),
        ("Accessible by Default", "Keyboard focus traps, non-color indicators, data tables, reduced motion.", COLOR_PRIMARY),
        ("Safety First", "Verified tel: human support cards supersede charts & AI on HIGH risk.", COLOR_ROSE_TEXT),
        ("Zero-CDN Privacy", "Cabinet Grotesk & Satoshi bundled locally; zero font CDN tracking.", COLOR_PEACH_TEXT),
    ]
    card_w = Inches(2.24)
    gap = Inches(0.16)
    start_x = Inches(0.75)
    for i, (title, desc, acc) in enumerate(principles):
        x = start_x + i * (card_w + gap)
        add_card(s3, x, Inches(1.55), card_w, Inches(2.25), COLOR_SURFACE, COLOR_BORDER, acc)
        add_card_title(s3, x + Inches(0.16), Inches(1.85), card_w - Inches(0.32), title, None)
        tb_d = s3.shapes.add_textbox(x + Inches(0.16), Inches(2.45), card_w - Inches(0.32), Inches(1.2))
        tf_d = tb_d.text_frame
        tf_d.word_wrap = True
        pd = tf_d.paragraphs[0]
        pd.text = desc
        pd.font.name = FONT_BODY
        pd.font.size = Pt(11)
        pd.font.color.rgb = COLOR_TEXT_MUTED

    # Bottom: Color Token Swatches Card
    add_card(s3, Inches(0.75), Inches(4.05), Inches(11.83), Inches(2.7), COLOR_SURFACE, COLOR_BORDER)
    add_card_title(
        s3, Inches(1.0), Inches(4.25), Inches(10.0),
        "Verified Design Tokens (frontend/src/styles/tokens.css)",
        "Harmonized palette engineered for low visual fatigue and WCAG contrast"
    )

    swatches = [
        ("Serene Canvas", "#F7F6FB", COLOR_BG, COLOR_TEXT_MAIN),
        ("Deep Indigo", "#5554B8", COLOR_PRIMARY, COLOR_WHITE),
        ("Soft Lavender", "#E9E7FB", COLOR_LAVENDER, COLOR_PRIMARY_DARK),
        ("Soft Sage", "#DCE9DF", COLOR_SAGE, COLOR_SAGE_TEXT),
        ("Soft Peach", "#F4DCCB", COLOR_PEACH, COLOR_PEACH_TEXT),
        ("Deep Warm Ink", "#25233B", COLOR_TEXT_MAIN, COLOR_WHITE),
    ]
    sw_w = Inches(1.75)
    sw_gap = Inches(0.16)
    for i, (name, hex_code, fill_c, txt_c) in enumerate(swatches):
        sx = Inches(1.0) + i * (sw_w + sw_gap)
        box = s3.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE, sx, Inches(5.12), sw_w, Inches(1.35)
        )
        box.adjustments[0] = 0.08
        box.fill.solid()
        box.fill.fore_color.rgb = fill_c
        box.line.color.rgb = COLOR_BORDER
        box.line.width = Pt(1)
        tf_s = box.text_frame
        tf_s.word_wrap = True
        tf_s.vertical_anchor = MSO_ANCHOR.MIDDLE
        ps1 = tf_s.paragraphs[0]
        ps1.alignment = PP_ALIGN.CENTER
        ps1.text = name
        ps1.font.name = FONT_HEADING
        ps1.font.size = Pt(12)
        ps1.font.bold = True
        ps1.font.color.rgb = txt_c
        ps2 = tf_s.add_paragraph()
        ps2.alignment = PP_ALIGN.CENTER
        ps2.text = hex_code
        ps2.font.name = FONT_BODY
        ps2.font.size = Pt(11)
        ps2.font.color.rgb = txt_c

    # =========================================================================
    # SLIDE 4: Student Experience Flow
    # =========================================================================
    s4 = prs.slides.add_slide(blank)
    set_slide_background(s4)
    add_header(s4, "End-to-End Student Experience Flow", "03 • User Journey", 4)

    steps = [
        ("1. Landing & Overview", "/  and  /app", "3D Lavender Mascot greets the student; Overview surfaces Daily Highlights, Breathing Bubble, & recent mood.", COLOR_LAVENDER, COLOR_PRIMARY_DARK),
        ("2. Daily Check-In", "/checkin", "Single-column flow: Mood (1-5), Stress (1-5), Sleep (hrs), and optional reflection (strict opt-in AI consent).", COLOR_SURFACE, COLOR_TEXT_MAIN),
        ("3. Safety Routing", "safety_evaluator.py", "Pure deterministic engine classifies LOW, MEDIUM, or HIGH/CRISIS before any AI or persistence step.", COLOR_PEACH, COLOR_PEACH_TEXT),
        ("4. Result & Support", "/checkin/result", "LOW/MEDIUM: gentle guidance. HIGH: zero AI calls, instant Tele-MANAS 14416 / 112 + Safe Exit.", COLOR_ROSE, COLOR_ROSE_TEXT),
        ("5. Reflect & Reset", "/insights  /planner  /explore", "7/14/30d Mood Trends, Study Planner + 5-min breather, Guided Videos, & 3D Voice Companion.", COLOR_SAGE, COLOR_SAGE_TEXT),
    ]
    st_w = Inches(2.16)
    st_gap = Inches(0.25)
    for i, (st_title, route, st_desc, bg_c, hd_c) in enumerate(steps):
        sx = Inches(0.75) + i * (st_w + st_gap)
        add_card(s4, sx, Inches(1.75), st_w, Inches(4.5), bg_c, COLOR_BORDER)

        tb_st = s4.shapes.add_textbox(sx + Inches(0.16), Inches(1.98), st_w - Inches(0.32), Inches(4.0))
        tf_st = tb_st.text_frame
        tf_st.word_wrap = True
        p_t = tf_st.paragraphs[0]
        p_t.text = st_title
        p_t.font.name = FONT_HEADING
        p_t.font.size = Pt(15)
        p_t.font.bold = True
        p_t.font.color.rgb = hd_c
        p_t.space_after = Pt(6)

        p_r = tf_st.add_paragraph()
        p_r.text = route
        p_r.font.name = FONT_BODY
        p_r.font.size = Pt(10.5)
        p_r.font.bold = True
        p_r.font.color.rgb = COLOR_PRIMARY
        p_r.space_after = Pt(14)

        p_d = tf_st.add_paragraph()
        p_d.text = st_desc
        p_d.font.name = FONT_BODY
        p_d.font.size = Pt(11.5)
        p_d.font.color.rgb = COLOR_TEXT_MAIN

        if i < len(steps) - 1:
            arr = s4.shapes.add_shape(
                MSO_SHAPE.RIGHT_ARROW,
                sx + st_w + Inches(0.04),
                Inches(3.85),
                Inches(0.17),
                Inches(0.25),
            )
            arr.fill.solid()
            arr.fill.fore_color.rgb = COLOR_PRIMARY
            arr.line.fill.background()

    # =========================================================================
    # SLIDE 5: Full-Stack System Architecture
    # =========================================================================
    s5 = prs.slides.add_slide(blank)
    set_slide_background(s5)
    add_header(s5, "Full-Stack System Architecture", "04 • Technical Stack", 5)

    # 3 Vertical Tier Cards
    tiers = [
        (
            "Frontend SPA",
            "React 18 • TypeScript • Vite 6",
            COLOR_PRIMARY,
            [
                ("Routing & Pages:", "10 routes including /app, /checkin, /insights, /planner, /explore, /companion, /support, /settings."),
                ("3D & Charts:", "Three.js custom GLSL lavender blob + Recharts responsive mood trends."),
                ("Motion & Icons:", "Framer Motion with reduced-motion guard + Lucide icons."),
                ("Session Identity:", "Anonymous X-Session-ID UUID in localStorage (no account wall)."),
            ],
        ),
        (
            "FastAPI Backend & Routers",
            "Python 3.12+ • Pydantic v2 • Uvicorn",
            COLOR_SAGE_TEXT,
            [
                ("checkin.py:", "POST /api/checkin & GET /api/checkin/history with 422 sanitization."),
                ("insights.py:", "GET /api/insights powered by analytics.py aggregation."),
                ("planner.py:", "Full CRUD /api/planner/tasks for study-life pacing."),
                ("support_and_settings.py:", "Helplines, retention settings, and full DELETE /api/settings/data."),
            ],
        ),
        (
            "Safety, AI & Persistence",
            "Zero-I/O Evaluator • SQLite WAL",
            COLOR_PEACH_TEXT,
            [
                ("safety_evaluator.py:", "Pure deterministic risk classifier (98% test coverage)."),
                ("AI Guidance Service:", "Offline mock default or Gemini (x-goog-api-key) with strict output validator."),
                ("SQLite WAL (storage.py):", "Stores numeric scores & timestamps only — zero reflection text column."),
                ("Health & Readiness:", "GET /api/health and GET /api/ready probes."),
            ],
        ),
    ]

    t_w = Inches(3.75)
    t_gap = Inches(0.29)
    for i, (t_title, t_sub, t_acc, t_items) in enumerate(tiers):
        tx = Inches(0.75) + i * (t_w + t_gap)
        add_card(s5, tx, Inches(1.55), t_w, Inches(5.2), COLOR_SURFACE, COLOR_BORDER, t_acc)
        add_card_title(s5, tx + Inches(0.22), Inches(1.85), t_w - Inches(0.44), t_title, t_sub)
        add_bullets(s5, tx + Inches(0.22), Inches(2.75), t_w - Inches(0.44), Inches(3.8), t_items, pt_size=11.5, space_after=11)

    # =========================================================================
    # SLIDE 6: Deterministic Safety & AI-Bypass Engine
    # =========================================================================
    s6 = prs.slides.add_slide(blank)
    set_slide_background(s6)
    add_header(s6, "Deterministic Safety & AI-Bypass Engine", "05 • Safety Architecture", 6)

    # Banner
    add_card(s6, Inches(0.75), Inches(1.5), Inches(11.83), Inches(0.72), COLOR_LAVENDER, COLOR_LAVENDER)
    tb6_b = s6.shapes.add_textbox(Inches(1.0), Inches(1.65), Inches(11.3), Inches(0.45))
    p6b = tb6_b.text_frame.paragraphs[0]
    p6b.text = "Core Rule: Pure deterministic logic (safety_evaluator.py) runs FIRST with zero network I/O. AI never classifies risk."
    p6b.font.name = FONT_HEADING
    p6b.font.size = Pt(13.5)
    p6b.font.bold = True
    p6b.font.color.rgb = COLOR_PRIMARY_DARK

    tiers_safety = [
        (
            "LOW RISK ROUTE",
            "Steady Baseline",
            COLOR_SAGE,
            COLOR_SAGE_TEXT,
            [
                ("Trigger:", "Balanced mood, stress, & sleep with zero crisis keywords."),
                ("AI Consent:", "Strict opt-in per request; deterministic fallback if declined."),
                ("UI Action:", "Gentle editorial reflection + optional planner/breathing prompt."),
            ],
        ),
        (
            "MEDIUM RISK ROUTE",
            "Elevated Load",
            COLOR_PEACH,
            COLOR_PEACH_TEXT,
            [
                ("Trigger:", "High stress, low mood/sleep, or non-crisis overwhelm cues."),
                ("AI Consent:", "Validated supportive language only; fail-closed output guard."),
                ("UI Action:", "Grounding steps + visible human support options."),
            ],
        ),
        (
            "HIGH / CRISIS ROUTE",
            "Immediate Human Escalation",
            COLOR_ROSE,
            COLOR_ROSE_TEXT,
            [
                ("Trigger:", "Crisis/self-harm keywords or severe distress threshold."),
                ("AI Bypass:", "ZERO AI calls executed — hard-blocked in backend router."),
                ("UI Action:", "Instant Tele-MANAS (14416) & 112 tel: cards + Safe Exit button."),
            ],
        ),
    ]

    s_w = Inches(3.75)
    s_gap = Inches(0.29)
    for i, (badge, title, bg_c, txt_c, items) in enumerate(tiers_safety):
        sx = Inches(0.75) + i * (s_w + s_gap)
        add_card(s6, sx, Inches(2.45), s_w, Inches(4.3), bg_c, COLOR_BORDER)
        tb_h = s6.shapes.add_textbox(sx + Inches(0.22), Inches(2.68), s_w - Inches(0.44), Inches(0.85))
        tf_h = tb_h.text_frame
        tf_h.word_wrap = True
        p_b = tf_h.paragraphs[0]
        p_b.text = badge
        p_b.font.name = FONT_HEADING
        p_b.font.size = Pt(10.5)
        p_b.font.bold = True
        p_b.font.color.rgb = txt_c
        p_t = tf_h.add_paragraph()
        p_t.text = title
        p_t.font.name = FONT_HEADING
        p_t.font.size = Pt(17)
        p_t.font.bold = True
        p_t.font.color.rgb = COLOR_TEXT_MAIN
        p_t.space_before = Pt(3)

        add_bullets(s6, sx + Inches(0.22), Inches(3.65), s_w - Inches(0.44), Inches(2.9), items, pt_size=12, space_after=12)

    # =========================================================================
    # SLIDE 7: 3D Calm Voice Companion & Mood Trend Analytics
    # =========================================================================
    s7 = prs.slides.add_slide(blank)
    set_slide_background(s7)
    add_header(s7, "3D Calm Voice Companion & Mood Analytics", "06 • Core Experiences", 7)

    # Left Card: CompanionPage
    add_card(s7, Inches(0.75), Inches(1.55), Inches(5.75), Inches(5.2), COLOR_SURFACE, COLOR_BORDER, COLOR_PRIMARY)
    add_card_title(
        s7, Inches(1.0), Inches(1.85), Inches(5.25),
        "Calm Voice Companion (/companion)",
        "Interactive 3D GLSL lavender blob with voice & text support"
    )
    add_bullets(s7, Inches(1.0), Inches(2.75), Inches(5.25), Inches(3.8), [
        ("Real-Time 3D Presence:", "Three.js custom shader blob reacts smoothly to idle, listening, thinking, and speaking states."),
        ("Voice + Text Modes:", "Supports browser Web Speech recognition & synthesis alongside accessible text input."),
        ("Deterministic Safety Guard:", "Crisis phrases bypass AI immediately and surface verified human helplines."),
        ("Graceful Fallbacks:", "Works seamlessly even when microphone or WebGL is unavailable."),
    ], pt_size=12.5, space_after=12)

    # Right Card: Mood Trend Analytics
    add_card(s7, Inches(6.8), Inches(1.55), Inches(5.78), Inches(5.2), COLOR_SURFACE, COLOR_BORDER, COLOR_SAGE_TEXT)
    add_card_title(
        s7, Inches(7.05), Inches(1.85), Inches(5.28),
        "Mood Trend & Insights (/app & /insights)",
        "Clear, non-judgmental pattern visibility over time"
    )
    add_bullets(s7, Inches(7.05), Inches(2.75), Inches(5.28), Inches(3.8), [
        ("7 / 14 / 30-Day Filters:", "Interactive range selectors aggregate same-day check-ins chronologically."),
        ("Summary Metrics:", "Displays average mood, highest/lowest days, and total check-in counts."),
        ("Accessible Dual View:", "Pairs Recharts area/line visualizations with a screen-reader-friendly data table."),
        ("Empty & Single-Day States:", "Helpful onboarding copy instead of broken or misleading empty charts."),
    ], pt_size=12.5, space_after=12)

    # =========================================================================
    # SLIDE 8: Interactive Wellness Suite (5 New Features)
    # =========================================================================
    s8 = prs.slides.add_slide(blank)
    set_slide_background(s8)
    add_header(s8, "Interactive Wellness Suite", "07 • Guided Practices & Tools", 8)

    quads = [
        (
            "Breathing Bubble Game",
            "BreathingBubbleSection.tsx",
            COLOR_PRIMARY,
            [
                ("3 Guided Patterns:", "4-4-4 Box, 4-7-8 Relax, and 5-5 Coherent rhythms."),
                ("Phase-Reactive Visuals:", "Pastel gradients, glowing aura, & rhythm sync mini-game."),
                ("Audio & Completion Bell:", "Sound On/Off toggle with 7-second gentle bell alarm."),
                ("Persistent Progress:", "Tracks completed sessions, minutes, & post-session mood."),
            ],
        ),
        (
            "Explore & Guided Video Player",
            "ExplorePage.tsx • GuidedVideoPlayer.tsx",
            COLOR_SAGE_TEXT,
            [
                ("Real HD Nature Videos:", "WebM scenes (sunrise, nightfall, waves) with smooth playback."),
                ("Spoken Voice Narration:", "Web Speech API reads guided steps aloud + soothing WAV audio."),
                ("3 Distinct Activities:", "Neck & Eye Strain Relief, Progressive Muscle Unwind, Mental Declutter."),
                ("Interactive Checklists:", "Step-by-step practice checkboxes & saved article bookmarks."),
            ],
        ),
        (
            "Study-Life Balance Planner",
            "PlannerPage.tsx",
            COLOR_PEACH_TEXT,
            [
                ("Balanced Task Pacing:", "Organize study blocks without overwhelming overdue counters."),
                ("5-Minute Breather Timer:", "Built-in recovery break timer between focused study sprints."),
                ("SQLite Persistence:", "Tasks saved cleanly per anonymous session via /api/planner/tasks."),
            ],
        ),
        (
            "Highlights, Challenges & Sound Lounge",
            "DailyHighlights • DailyChallenge • SoundLounge",
            COLOR_PRIMARY_DARK,
            [
                ("Daily Highlights:", "Affirmations and gentle daily focus prompts on Overview."),
                ("Daily Micro-Challenges:", "Low-pressure wellbeing habits with local completion tracking."),
                ("Ambient Sound Lounge:", "Looping meditation, ocean, and nightfall WAV soundscapes."),
            ],
        ),
    ]

    q_w = Inches(5.78)
    q_h = Inches(2.5)
    positions = [
        (Inches(0.75), Inches(1.55)),
        (Inches(6.80), Inches(1.55)),
        (Inches(0.75), Inches(4.25)),
        (Inches(6.80), Inches(4.25)),
    ]
    for (qx, qy), (qt, qs, qa, qitems) in zip(positions, quads):
        add_card(s8, qx, qy, q_w, q_h, COLOR_SURFACE, COLOR_BORDER, qa)
        add_card_title(s8, qx + Inches(0.2), qy + Inches(0.2), q_w - Inches(0.4), qt, qs)
        add_bullets(s8, qx + Inches(0.2), qy + Inches(0.92), q_w - Inches(0.4), Inches(1.5), qitems, pt_size=11, space_after=5)

    # =========================================================================
    # SLIDE 9: Privacy by Architecture & Data Lifecycle
    # =========================================================================
    s9 = prs.slides.add_slide(blank)
    set_slide_background(s9)
    add_header(s9, "Privacy by Architecture & Data Lifecycle", "08 • Privacy & Consent", 9)

    priv_cards = [
        (
            "Zero-Storage Reflections",
            COLOR_PRIMARY,
            [
                ("No Database Column:", "Optional reflection text is never written to SQLite (calmspace.db)."),
                ("Ephemeral Evaluation:", "Processed in memory for safety routing and discarded immediately."),
                ("Numeric Metrics Only:", "Storage retains only mood, stress, sleep scores, & timestamps."),
            ],
        ),
        (
            "Strict Opt-In & Safe Exit",
            COLOR_SAGE_TEXT,
            [
                ("Per-Request Consent:", "AI guidance requires explicit StrictBool consent on every check-in."),
                ("Safe Exit Control:", "One-click Safe Exit on crisis/result views clears session state."),
                ("Anonymous Sessions:", "Uses local UUID (X-Session-ID) — no email, password, or PII."),
            ],
        ),
        (
            "Retention & 2-Step Wipe",
            COLOR_PEACH_TEXT,
            [
                ("Configurable Windows:", "Students choose 14, 30, 60, or 90-day retention in /settings."),
                ("Automatic Pruning:", "Expired records are pruned automatically on read/write."),
                ("2-Step Full Deletion:", "DELETE /api/settings/data permanently wipes all session data."),
            ],
        ),
    ]
    pw = Inches(3.75)
    pg = Inches(0.29)
    for i, (ptitle, pacc, pitems) in enumerate(priv_cards):
        px = Inches(0.75) + i * (pw + pg)
        add_card(s9, px, Inches(1.6), pw, Inches(5.1), COLOR_SURFACE, COLOR_BORDER, pacc)
        add_card_title(s9, px + Inches(0.22), Inches(1.92), pw - Inches(0.44), ptitle)
        add_bullets(s9, px + Inches(0.22), Inches(2.65), pw - Inches(0.44), Inches(3.8), pitems, pt_size=12, space_after=14)

    # =========================================================================
    # SLIDE 10: Verified Human Support & Transparency
    # =========================================================================
    s10 = prs.slides.add_slide(blank)
    set_slide_background(s10)
    add_header(s10, "Verified Human Support & Transparency", "09 • Human Escalation", 10)

    add_card(s10, Inches(0.75), Inches(1.55), Inches(7.2), Inches(5.2), COLOR_SURFACE, COLOR_BORDER, COLOR_ROSE_TEXT)
    add_card_title(
        s10, Inches(1.0), Inches(1.85), Inches(6.7),
        "Verified National Helplines (/support)",
        "Direct one-tap tel: links surfaced immediately on HIGH risk or via Support Network"
    )
    add_bullets(s10, Inches(1.0), Inches(2.75), Inches(6.7), Inches(3.8), [
        ("Tele-MANAS (14416 / 1-800-891-4416):", "24/7 Government of India national mental health helpline."),
        ("National Emergency (112):", "Immediate emergency response for acute physical danger."),
        ("iCall (9152987821):", "Psychosocial counselling service by TISS (Mon–Sat)."),
        ("Vandrevala Foundation (9999 666 555):", "24/7 multilingual crisis support and emotional counselling."),
    ], pt_size=12.5, space_after=14)

    # Right honesty card
    add_card(s10, Inches(8.25), Inches(1.55), Inches(4.33), Inches(5.2), COLOR_PEACH, COLOR_BORDER)
    add_card_title(
        s10, Inches(8.5), Inches(1.85), Inches(3.83),
        "Honest Campus Disclosure",
        "Zero fake local resources"
    )
    add_bullets(s10, Inches(8.5), Inches(2.75), Inches(3.83), Inches(3.8), [
        ("Transparent Placeholders:", "Unconfigured campus counselling entries are explicitly labeled as demo placeholders."),
        ("No Clinical Claims:", "Clear non-diagnostic notice in Overview, Check-In, and Support pages."),
        ("Always Reachable:", "Support Network link remains accessible in persistent navigation."),
    ], pt_size=12, space_after=13)

    # =========================================================================
    # SLIDE 11: Engineering Rigor & Quality Verification
    # =========================================================================
    s11 = prs.slides.add_slide(blank)
    set_slide_background(s11)
    add_header(s11, "Engineering Rigor & Quality Verification", "10 • Testing & Reliability", 11)

    kpis = [
        ("271", "Backend Pytest Tests", "All API routers, storage, & safety routes verified", COLOR_PRIMARY),
        ("98%", "Safety Engine Coverage", "Exhaustive unit & boundary tests on safety_evaluator.py", COLOR_SAGE_TEXT),
        ("12 / 12", "Frontend Suite Passing", "Mood trends, Safe Exit, Wellness persistence, & Voice contracts", COLOR_PRIMARY_DARK),
        ("0 Errors", "TypeScript & Vite Build", "Clean tsc --noEmit & production bundle (vite build)", COLOR_PEACH_TEXT),
    ]
    kw = Inches(2.8)
    kg = Inches(0.21)
    for i, (num, label, sub, kcol) in enumerate(kpis):
        kx = Inches(0.75) + i * (kw + kg)
        add_card(s11, kx, Inches(1.6), kw, Inches(2.25), COLOR_SURFACE, COLOR_BORDER, kcol)
        tb_k = s11.shapes.add_textbox(kx + Inches(0.18), Inches(1.9), kw - Inches(0.36), Inches(1.8))
        tf_k = tb_k.text_frame
        tf_k.word_wrap = True
        pk1 = tf_k.paragraphs[0]
        pk1.text = num
        pk1.font.name = FONT_HEADING
        pk1.font.size = Pt(34)
        pk1.font.bold = True
        pk1.font.color.rgb = kcol
        pk2 = tf_k.add_paragraph()
        pk2.text = label
        pk2.font.name = FONT_HEADING
        pk2.font.size = Pt(13.5)
        pk2.font.bold = True
        pk2.font.color.rgb = COLOR_TEXT_MAIN
        pk2.space_before = Pt(4)
        pk3 = tf_k.add_paragraph()
        pk3.text = sub
        pk3.font.name = FONT_BODY
        pk3.font.size = Pt(10.5)
        pk3.font.color.rgb = COLOR_TEXT_MUTED
        pk3.space_before = Pt(4)

    # Bottom architecture quality card
    add_card(s11, Inches(0.75), Inches(4.15), Inches(11.83), Inches(2.6), COLOR_SURFACE, COLOR_BORDER)
    add_card_title(s11, Inches(1.0), Inches(4.35), Inches(11.0), "Production & CI Safeguards")
    add_bullets(s11, Inches(1.0), Inches(4.9), Inches(5.5), Inches(1.7), [
        ("Ruff Lint & Format:", "Enforced Python code quality across backend/app."),
        ("AbortSignal Timeouts:", "Frontend API client handles outages & recovery cleanly."),
    ], pt_size=12, space_after=10)
    add_bullets(s11, Inches(6.7), Inches(4.9), Inches(5.6), Inches(1.7), [
        ("SQLite WAL Concurrency:", "Write-Ahead Logging with automatic schema initialization."),
        ("Zero-CDN Assets:", "Local fonts, WAV audio, and WebM videos work offline-first."),
    ], pt_size=12, space_after=10)

    # =========================================================================
    # SLIDE 12: Live Demo & Repository
    # =========================================================================
    s12 = prs.slides.add_slide(blank)
    set_slide_background(s12)
    add_header(s12, "Live Demo Walkthrough & Repository", "11 • Summary", 12)

    add_card(s12, Inches(0.75), Inches(1.55), Inches(7.2), Inches(5.2), COLOR_SURFACE, COLOR_BORDER, COLOR_PRIMARY)
    add_card_title(
        s12, Inches(1.0), Inches(1.85), Inches(6.7),
        "5-Minute Live Demo Flow",
        "From 3D welcome to deterministic crisis protection"
    )
    add_bullets(s12, Inches(1.0), Inches(2.75), Inches(6.7), Inches(3.8), [
        ("1. Landing & Overview (/app):", "Show 3D Lavender Mascot, Daily Highlights, and Breathing Bubble with Sound On/Off."),
        ("2. Daily Check-In (/checkin):", "Demonstrate LOW check-in, then HIGH crisis phrase triggering instant Tele-MANAS bypass + Safe Exit."),
        ("3. Explore & Guided Video (/explore):", "Play HD nature WebM video with spoken voice narration and interactive practice checklist."),
        ("4. Insights & Voice Companion:", "Filter 7/14/30d Mood Trends and interact with the 3D Calm Voice Companion."),
        ("5. Privacy & Settings (/settings):", "Show 14–90d retention selector and 2-step full data wipe."),
    ], pt_size=12, space_after=10)

    add_card(s12, Inches(8.25), Inches(1.55), Inches(4.33), Inches(5.2), COLOR_LAVENDER, COLOR_BORDER)
    tb_end = s12.shapes.add_textbox(Inches(8.55), Inches(2.05), Inches(3.73), Inches(4.2))
    tf_end = tb_end.text_frame
    tf_end.word_wrap = True
    pe1 = tf_end.paragraphs[0]
    pe1.text = "Calmspace"
    pe1.font.name = FONT_HEADING
    pe1.font.size = Pt(30)
    pe1.font.bold = True
    pe1.font.color.rgb = COLOR_PRIMARY_DARK
    pe1.space_after = Pt(10)

    pe2 = tf_end.add_paragraph()
    pe2.text = "A quieter space to check in with yourself."
    pe2.font.name = FONT_BODY
    pe2.font.size = Pt(14)
    pe2.font.italic = True
    pe2.font.color.rgb = COLOR_TEXT_MAIN
    pe2.space_after = Pt(24)

    pe3 = tf_end.add_paragraph()
    pe3.text = "GitHub Repository:"
    pe3.font.name = FONT_HEADING
    pe3.font.size = Pt(11.5)
    pe3.font.bold = True
    pe3.font.color.rgb = COLOR_TEXT_MUTED
    pe3.space_after = Pt(4)

    pe4 = tf_end.add_paragraph()
    pe4.text = f"https://{REPO_URL}"
    pe4.font.name = FONT_HEADING
    pe4.font.size = Pt(12.5)
    pe4.font.bold = True
    pe4.font.color.rgb = COLOR_PRIMARY
    pe4.space_after = Pt(24)

    pe5 = tf_end.add_paragraph()
    pe5.text = "Thank you!\nQuestions & Live Demo"
    pe5.font.name = FONT_HEADING
    pe5.font.size = Pt(16)
    pe5.font.bold = True
    pe5.font.color.rgb = COLOR_TEXT_MAIN

    output_path = os.path.join(repo_root, "Calmspace_Presentation.pptx")
    prs.save(output_path)
    print(f"Generated {output_path} ({len(prs.slides)} slides)")


if __name__ == "__main__":
    build_presentation()
