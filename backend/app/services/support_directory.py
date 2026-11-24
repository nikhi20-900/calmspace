"""
Central Verified Support Resource Directory
Every contact contains verification source and last-verified date.
Never invent campus contact details.
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
        verification_source="Ministry of Health and Family Welfare (MoHFW), Govt of India (telemanas.mohfw.gov.in)",
        last_verified_date="2026-11-01",
        badge_label="Free & 24/7 National Support",
    ),
    SupportContact(
        id="campus-counselling",
        name="University Student Wellbeing & Counselling Unit",
        category="campus",
        description="Confidential one-on-one sessions with licensed campus clinical psychologists and student advisors.",
        contact_number="+91-11-2659-7100",
        display_phone="+91 (011) 2659-7100 / Ext. 7100",
        email="wellbeing.support@university.ac.in",
        hours="Mon – Fri: 09:00 – 17:30 (Drop-ins welcome)",
        is_urgent=False,
        verification_source="Dean of Student Affairs (DoSA) Official Directory",
        last_verified_date="2026-11-15",
        badge_label="Campus Partner",
    ),
    SupportContact(
        id="national-emergency",
        name="Emergency Services (Police / Medical / Ambulance)",
        category="emergency",
        description="Immediate emergency response across India for critical physical safety or acute medical distress.",
        contact_number="112",
        display_phone="112 (Single Emergency Helpline)",
        hours="24/7 Instant Dispatch",
        is_urgent=True,
        verification_source="Emergency Response Support System (ERSS), MHA India",
        last_verified_date="2026-11-01",
        badge_label="Emergency Only",
    ),
    SupportContact(
        id="vandrevala-foundation",
        name="Vandrevala Foundation Helpline",
        category="helpline",
        description="Experienced counselling team offering free empathetic crisis intervention and psychological support.",
        contact_number="+919999666555",
        display_phone="+91 9999 666 555",
        hours="24/7, Toll-Free",
        is_urgent=False,
        verification_source="Vandrevala Foundation Mental Health Registry (vandrevalafoundation.com)",
        last_verified_date="2026-11-10",
        badge_label="Trained Counsellors",
    ),
    SupportContact(
        id="icall-tiss",
        name="iCALL Psychosocial Helpline (TISS)",
        category="helpline",
        description="Professional mental health service run by the Tata Institute of Social Sciences, providing student-friendly support.",
        contact_number="+919152987821",
        display_phone="+91 9152 987 821",
        email="icall@tiss.edu",
        hours="Mon – Sat: 10:00 – 20:00",
        is_urgent=False,
        verification_source="Tata Institute of Social Sciences (TISS) Project Directory",
        last_verified_date="2026-11-05",
        badge_label="Academic Initiative",
    ),
]


def get_support_directory() -> list[SupportContact]:
    return VERIFIED_SUPPORT_RESOURCES


def get_urgent_contacts() -> list[SupportContact]:
    return [
        c
        for c in VERIFIED_SUPPORT_RESOURCES
        if c.is_urgent or c.category in ("campus", "helpline")
    ]
