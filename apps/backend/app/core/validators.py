import re
from typing import Any, Optional

# Phone numbers are stored as "+<country code> <number>", e.g. "+91 9876543210" or
# "+971 501234567". Indian numbers (+91) are exactly 10 digits; number lengths differ
# in other countries, so 4 to 14 digits are accepted there.
# No look-arounds: pydantic's `pattern` runs on a regex engine that lacks them.
PHONE_REGEX = r"^\+?(?:91\s\d{10}|(?:\d|(?:[0-8]\d|9[02-9])\d{0,2})\s\d{4,14})$"
PHONE_REGEX_MESSAGE = "Invalid phone format. Please select a country code and enter the number: exactly 10 digits for India, 4 to 14 digits for other countries."

# Extra numbers an account can hold besides phone / mobile.
MAX_OTHER_PHONES = 5


def parse_phone_value(value: str) -> Optional[tuple[str, str]]:
    """Return (country_code, local_digits) when value is +<code> <number>."""
    value = value.strip()
    if not value.startswith("+") or " " not in value:
        return None
    code, _, local = value.partition(" ")
    local_digits = re.sub(r"\D", "", local)
    if not re.match(PHONE_REGEX, f"{code} {local_digits}"):
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


def strict_phone_list_validator(v: Any) -> list[str]:
    """Validate a list of phone numbers; blank entries and repeats are dropped."""
    if v is None:
        return []
    if not isinstance(v, (list, tuple)):
        raise ValueError("Other phones must be a list of phone numbers.")
    phones: list[str] = []
    for item in v:
        formatted = strict_phone_validator(item)
        if formatted and formatted not in phones:
            phones.append(formatted)
    if len(phones) > MAX_OTHER_PHONES:
        raise ValueError(f"At most {MAX_OTHER_PHONES} other phone numbers are allowed.")
    return phones

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
