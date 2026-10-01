"""
Pure mapping rules for website enquiry leads.

The dookwebsite InquiryController posts one lead JSON to the old Laravel CRM
(`/tfc/api/capture_lead`) and the same JSON to this CRM. For both CRMs to hold
identical data, this module reproduces the old CRM's handling exactly:
RestHomeController::captureLead plus UserHelper getDataString / getDataFound /
getDataAttached, after Laravel's TrimStrings + ConvertEmptyStringsToNull
middleware. Where this CRM's own rules need a different shape (phone format),
the original value is kept alongside.

No database access here. Lookups that need the DB (segment, lead type,
destination ids, picklist ids) live in website_lead_capture_service.

Field-by-field reference: explainers/tutterfly_con_data.md
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from app.core.validators import PHONE_REGEX

# getDataFound() hardcodes this; the website never sends its own value.
OLD_DEFAULT_FYEAR = "25-26"
DELHI_REGION = "National Capital Territory of Delhi"
# PHP: date('Y-m-d', strtotime($unparseable)) -> date('Y-m-d', false)
UNPARSEABLE_TRAVEL_DATE = "1970-01-01"

# Lead custom fields the capture fills in (name, label). A value is saved only
# when a field with that name exists, same rule as the old CRM.
WEBSITE_CAPTURE_CUSTOM_FIELDS: Tuple[Tuple[str, str], ...] = (
    # Old CRM's same-named lead custom fields
    ("segment", "Segment (website)"),
    ("destination", "Destination"),
    ("description", "Description"),
    ("destination_id", "Destination IDs"),
    ("campaign_url", "Campaign URL"),
    ("bnpl", "BNPL"),
    ("experience", "Experience"),
    ("fyear", "Financial Year"),
    # Old lead columns with no built-in field here
    ("country_of_origin", "Country of Origin"),
    ("form_id", "Website Ref ID"),
    ("lead_qhb", "Lead QHB"),
    ("lead_type", "Lead Type"),
    ("bnpl_flag", "BNPL Flag"),
    ("source", "Source (website)"),
    ("departure_id", "Departure ID"),
    ("record_id", "Old Record Number"),
    ("old_tfc_lead_id", "Old Tutterfly Lead ID"),
    # Originals kept when this CRM had to store a different shape
    ("phone_raw", "Phone (as typed)"),
    ("mobile_raw", "Mobile (as typed)"),
    ("email_raw", "Email (as typed)"),
)

_TRAVEL_DATE_FORMATS: Tuple[str, ...] = (
    "%Y-%m-%d",
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m",  # B2B form month picker, e.g. 2027-05
    "%m/%d/%Y",
    "%d-%m-%Y",
    "%d.%m.%Y",
    "%B %Y",
    "%b %Y",
    "%d %B %Y",
    "%d %b %Y",
    "%B %d, %Y",
    "%b %d, %Y",
)


def clean_value(value: Any) -> Any:
    """Laravel TrimStrings + ConvertEmptyStringsToNull, applied recursively."""
    if isinstance(value, str):
        value = value.strip()
        return value or None
    if isinstance(value, dict):
        return {key: clean_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [clean_value(item) for item in value]
    return value


def split_name(first_name: Optional[str], last_name: Optional[str]) -> Tuple[str, str]:
    """Old captureLead name handling.

    A sent first_name is used as-is. Otherwise last_name is split on single
    spaces: the first two pieces become first/last name and the rest is dropped,
    while a single word stays entirely in last_name.
    """
    last = last_name if last_name is not None else ""
    if first_name is not None:
        return first_name, last
    parts = (last_name or "").split(" ")
    if len(parts) > 1:
        return parts[0], parts[1]
    return "", last


def old_travel_date(value: Any) -> Optional[str]:
    """date('Y-m-d', strtotime($value)) for the formats the website produces."""
    if value is None:
        return None
    text = str(value)
    for fmt in _TRAVEL_DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            continue
    return UNPARSEABLE_TRAVEL_DATE


def to_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(str(value).strip())
    except ValueError:
        return None


def split_destinations(destination: Optional[str]) -> List[str]:
    """Old destination_id lookup: explode(',') then trim each name."""
    if not destination:
        return []
    return [name.strip() for name in destination.split(",") if name.strip()]


def crm_phone(raw: Optional[str], country: Optional[str]) -> Optional[str]:
    """Shape a phone the way this CRM's lead form requires ("+<code> <number>").

    Only unambiguous cases are converted: a value already in that shape, or an
    Indian visitor's 10-digit (or 91-prefixed 12-digit) number. Anything else
    is returned unchanged.
    """
    if raw is None:
        return None
    if re.match(PHONE_REGEX, raw):
        return raw
    digits = re.sub(r"\D", "", raw)
    if country == "India":
        if len(digits) == 10:
            return f"+91 {digits}"
        if len(digits) == 12 and digits.startswith("91"):
            return f"+91 {digits[2:]}"
    return raw


def old_record_number(old_lead_id: Optional[str]) -> Optional[str]:
    """Old AddRecordId job: the old lead id zero-padded to 10 digits."""
    if old_lead_id and old_lead_id.isdigit():
        return old_lead_id.zfill(10)
    return None


def map_website_lead(lead: Dict[str, Any]) -> Dict[str, Any]:
    """Map the website's `lead` object to the values the old CRM stores.

    `custom_field_values` holds the old same-named custom fields; the service
    adds values that need DB lookups (destination_id, lead_type) or request
    headers (old lead id, record number).
    """
    lead = clean_value(lead or {})
    custom = lead.get("custom_fields")
    custom = custom if isinstance(custom, dict) else {}

    first_name, last_name = split_name(lead.get("first_name"), lead.get("last_name"))
    region = lead.get("region")
    country = lead.get("country")
    phone_raw = lead.get("phone")
    mobile_raw = lead.get("mobile")

    fixed_departure = lead.get("fixed_departure")
    is_fixed: Optional[bool] = None
    lead_qhb = "O"
    if fixed_departure is not None:
        is_fixed = fixed_departure == "yes"
        lead_qhb = "F" if is_fixed else "O"

    # getDataAttached: the website's destinations_name wins over custom_fields.destination.
    destination = lead.get("destinations_name") or custom.get("destination")

    return {
        "first_name": first_name,
        "last_name": last_name,
        "title": lead.get("first_name"),
        "company": lead.get("company"),
        "email": lead.get("email"),
        "phone": crm_phone(phone_raw, country),
        "phone_raw": phone_raw,
        "mobile": crm_phone(mobile_raw, country),
        "mobile_raw": mobile_raw,
        "website": lead.get("website"),
        "city": lead.get("city"),
        "state": "Delhi" if region == DELHI_REGION else region,
        "country": country,
        "country_of_origin": country,
        "campaign_name": lead.get("campaign_name"),
        "form_id": lead.get("ref_id"),
        "ip_address": lead.get("ip"),
        "travel_date": old_travel_date(lead.get("travel_date")),
        "no_of_nights": to_int(lead.get("no_of_nights")),
        "no_of_pax": to_int(lead.get("no_of_pax")),
        "is_fixed": is_fixed,
        "lead_qhb": lead_qhb,
        "destination": destination,
        "destination_names": split_destinations(destination),
        "experience": custom.get("experience"),
        "description": custom.get("description"),
        "campaign_url": custom.get("campaign_url"),
        "bnpl_flag": "Y" if custom.get("bnpl") == "Yes" else "N",
        "departure_id": lead.get("departure_id"),
        "source": lead.get("source") or "web",
        "source_medium": lead.get("source_medium") or "Organic",
        "custom_field_values": {
            "segment": custom.get("segment"),
            "destination": destination,
            "description": custom.get("description"),
            "campaign_url": custom.get("campaign_url"),
            "bnpl": custom.get("bnpl"),
            "experience": custom.get("experience"),
            "fyear": OLD_DEFAULT_FYEAR,
        },
    }
