"""
Central Verified Support Resource Directory
Every contact contains verification source, official URL, and last-verified date.
Campus contacts are strictly flagged as demo placeholders unless verified.
"""

from app.models.schemas import SupportContact

VERIFIED_SUPPORT_RESOURCES: list[SupportContact] = [
    SupportContact(
        id="tele-manas",
        name="Tele-MANAS (National Mental Health Helpline)",
        category="helpline",
        description="Comprehensive 24/7 mental health care service by Govt. of India. Free, confidential, and available in 20+ languages.",
        contact_number="14416",
        display_phone="14416 / 1800-891-4416",
        hours="24/7, Everyday",
        is_urgent=True,
        verification_source="Ministry of Health and Family Welfare (MoHFW), Govt. of India",
        official_source_url="https://telemanas.mohfw.gov.in",
        last_verified_date="2026-11-20",
        badge_label="Official 24/7 National Helpline",
        is_demo_placeholder=False,
        is_active=True,
    ),
    SupportContact(
        id="national-emergency",
        name="Emergency Services (Police / Medical / Fire)",
        category="emergency",
        description="Immediate emergency response across India for critical physical safety or acute medical distress.",
        contact_number="112",
        display_phone="112 (Single Emergency Helpline)",
        hours="24/7 Instant Dispatch",
        is_urgent=True,
        verification_source="Emergency Response Support System (ERSS), Ministry of Home Affairs, Govt. of India",
        official_source_url="https://erss.in",
        last_verified_date="2026-11-20",
        badge_label="Immediate Emergency Dispatch",
        is_demo_placeholder=False,
        is_active=True,
    ),
    SupportContact(
        id="vandrevala-foundation",
        name="Vandrevala Foundation Helpline",
        category="helpline",
        description="Experienced counselling team offering free empathetic crisis intervention and psychological support via phone and WhatsApp.",
        contact_number="+919999666555",
        display_phone="+91 9999 666 555",
        hours="24/7, Everyday",
        is_urgent=False,
        verification_source="Vandrevala Foundation Mental Health Registry",
        official_source_url="https://www.vandrevalafoundation.com",
        last_verified_date="2026-11-20",
        badge_label="Trained Counsellors",
        is_demo_placeholder=False,
        is_active=True,
    ),
    SupportContact(
        id="icall-tiss",
        name="iCALL Psychosocial Helpline (TISS)",
        category="helpline",
        description="Professional, confidential psychosocial helpline run by the School of Human Ecology, Tata Institute of Social Sciences.",
        contact_number="02225521111",
        display_phone="022-25521111 / +91 9152 987 821",
        email="icall@tiss.edu",
        hours="Mon – Sat: 08:00 – 21:00",
        is_urgent=False,
        verification_source="iCALL Psychosocial Helpline, School of Human Ecology, TISS (icallhelpline.org)",
        official_source_url="https://icallhelpline.org",
        last_verified_date="2026-11-20",
        badge_label="Academic Initiative",
        is_demo_placeholder=False,
        is_active=True,
    ),
    SupportContact(
        id="campus-counselling",
        name="University Student Wellbeing & Counselling Unit",
        category="campus",
        description="Template integration point for campus psychologists, advisors, or university health centers. Must be configured with your institution's verified details prior to production.",
        contact_number="14416",
        display_phone="Institutional Config Required",
        email=None,
        hours="Mon – Fri: 09:00 – 17:30 (Configurable)",
        is_urgent=False,
        verification_source="Demo template placeholder (Must be configured with verified institutional directory)",
        official_source_url=None,
        last_verified_date="2026-11-20",
        badge_label="Demo Placeholder",
        is_demo_placeholder=True,
        placeholder_note="This is a template placeholder. In production, configure with your institution's verified student welfare directory and live booking portal.",
        is_active=True,
    ),
]


def get_support_directory(active_only: bool = True) -> list[SupportContact]:
    """Returns verified human support directory. Inactive/disabled contacts are filtered out by default."""
    if active_only:
        return [c for c in VERIFIED_SUPPORT_RESOURCES if c.is_active]
    return list(VERIFIED_SUPPORT_RESOURCES)


def get_urgent_contacts(active_only: bool = True) -> list[SupportContact]:
    """Returns prioritized contacts for high-risk escalation: verified national helplines first, then campus demo."""
    return [
        c
        for c in VERIFIED_SUPPORT_RESOURCES
        if (not active_only or c.is_active)
        and (c.is_urgent or c.category in ("campus", "helpline"))
    ]


def disable_resource(contact_id: str) -> bool:
    """Disables a resource without requiring UI code changes."""
    for contact in VERIFIED_SUPPORT_RESOURCES:
        if contact.id == contact_id:
            contact.is_active = False
            return True
    return False


def enable_resource(contact_id: str) -> bool:
    """Re-enables a resource."""
    for contact in VERIFIED_SUPPORT_RESOURCES:
        if contact.id == contact_id:
            contact.is_active = True
            return True
    return False


def reset_support_directory() -> None:
    """Resets all resources to active (useful in testing suites)."""
    for contact in VERIFIED_SUPPORT_RESOURCES:
        contact.is_active = True
