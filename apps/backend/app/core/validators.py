import re
from typing import Any, Optional

# E.164 standard phone number regex (e.g. +919876543210 or +91 9876543210)
PHONE_REGEX = r"^\+?\d{1,4}\s\d{10}$"
PHONE_REGEX_MESSAGE = "Invalid phone format. Please select a country code and enter exactly a 10-digit number."


def parse_phone_value(value: str) -> Optional[tuple[str, str]]:
    """Return (country_code, local_digits) when value is +<code> <10 digits>."""
    value = value.strip()
    if not value.startswith("+") or " " not in value:
        return None
    code, _, local = value.partition(" ")
    local_digits = re.sub(r"\D", "", local)
    if not re.match(r"^\+\d{1,4}$", code) or len(local_digits) != 10:
        return None
    return code, local_digits


def format_phone_value(value: str) -> Optional[str]:
    parsed = parse_phone_value(value)
    if not parsed:
        return None
    code, digits = parsed
    return f"{code} {digits}"


def strict_phone_validator(v: Any) -> Optional[str]:
    """Reject invalid phone numbers instead of silently coercing to None."""
    if v is None:
        return None
    s = str(v).strip()
    if not s:
        return None
    formatted = format_phone_value(s)
    if not formatted:
        raise ValueError(PHONE_REGEX_MESSAGE)
    return formatted

# Standard alphunumeric zip codes (e.g. 10001 or W1A 0AX)
ZIP_REGEX = r"^[A-Za-z0-9\s-]{3,10}$"
ZIP_REGEX_MESSAGE = "Invalid Zip/Postal code format."

# Strong passwords: 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
def validate_password_complexity(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", v):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"\d", v):
        raise ValueError("Password must contain at least one number")
    if not re.search(r"[@$!%*?&#^_-]", v):
        raise ValueError("Password must contain at least one special character")
    return v
