"""
Industry Registry — Central configuration for multi-industry CRM.

Defines:
  - INDUSTRY_MODULE_DEFAULTS: which modules are enabled by default per industry
  - INDUSTRY_LABELS: UI display name overrides per industry
  - SUPPORTED_INDUSTRIES: list of valid industry identifiers
"""

from typing import Dict, List

# ---------------------------------------------------------------------------
# Supported Industries
# ---------------------------------------------------------------------------
SUPPORTED_INDUSTRIES: List[str] = [
    "travel",
    "healthcare",
    "education",
    "manufacturing",
]

# ---------------------------------------------------------------------------
# Default Module Flags per Industry
# ---------------------------------------------------------------------------
# When a new tenant is created and selects an industry, these modules are
# automatically enabled.  Modules not listed here default to False.
# ---------------------------------------------------------------------------
INDUSTRY_MODULE_DEFAULTS: Dict[str, Dict[str, bool]] = {
    "travel": {
        "destinations": True,
        "itineraries": True,
        "packages": True,
        "suppliers": True,
    },
    "healthcare": {
        "patients": True,
        "providers": True,
        "referrals": True,
        "appointments": True,
        "insurance": True,
        "care_plans": True,
        "suppliers": True,
    },
    "education": {
        "programs": True,
        "admissions": True,
        "enrollments": True,
        "courses": True,
        "faculty": True,
        "academic_terms": True,
        "scholarships": True,
        "suppliers": True,
    },
    "manufacturing": {
        "product_catalog": True,
        "bom": True,
        "production_orders": True,
        "work_orders": True,
        "inventory": True,
        "quality_inspections": True,
        "suppliers": True,
    },
}

# ---------------------------------------------------------------------------
# UI Label Overrides per Industry
# ---------------------------------------------------------------------------
# The frontend uses these to rename core CRM concepts so that the user sees
# language appropriate to their domain.
# ---------------------------------------------------------------------------
INDUSTRY_LABELS: Dict[str, Dict[str, str]] = {
    "travel": {
        "lead": "Lead",
        "leads": "Leads",
        "opportunity": "Opportunity",
        "opportunities": "Opportunities",
        "supplier": "Supplier",
        "suppliers": "Suppliers",
        "account": "Client",
        "accounts": "Clients",
        "pipeline_section": "Travel Requirements",
    },
    "healthcare": {
        "lead": "Patient Inquiry",
        "leads": "Patient Inquiries",
        "opportunity": "Case",
        "opportunities": "Cases",
        "supplier": "Provider",
        "suppliers": "Providers",
        "account": "Clinic / Hospital",
        "accounts": "Clinics",
        "pipeline_section": "Clinical Details",
    },
    "education": {
        "lead": "Prospect",
        "leads": "Prospects",
        "opportunity": "Application",
        "opportunities": "Applications",
        "supplier": "Institution",
        "suppliers": "Institutions",
        "account": "School / University",
        "accounts": "Institutions",
        "pipeline_section": "Academic Details",
    },
    "manufacturing": {
        "lead": "RFQ",
        "leads": "RFQs",
        "opportunity": "Deal",
        "opportunities": "Deals",
        "supplier": "Vendor",
        "suppliers": "Vendors",
        "account": "Manufacturer",
        "accounts": "Manufacturers",
        "pipeline_section": "Production Requirements",
    },
}


def get_default_modules(industry: str) -> Dict[str, bool]:
    """Return the default module flags for a given industry.

    Raises ValueError on an unrecognised industry instead of silently falling
    back to travel. A silent fallback caused new industries to inherit
    travel-only module flags and biased the system toward one vertical.
    """
    if industry not in INDUSTRY_MODULE_DEFAULTS:
        raise ValueError(
            f"Unknown industry '{industry}'. Supported: {SUPPORTED_INDUSTRIES}"
        )
    return INDUSTRY_MODULE_DEFAULTS[industry].copy()


def get_industry_labels(industry: str) -> Dict[str, str]:
    """Return the UI label map for a given industry.

    Raises ValueError on an unrecognised industry — see get_default_modules
    for the rationale.
    """
    if industry not in INDUSTRY_LABELS:
        raise ValueError(
            f"Unknown industry '{industry}'. Supported: {SUPPORTED_INDUSTRIES}"
        )
    return INDUSTRY_LABELS[industry].copy()
