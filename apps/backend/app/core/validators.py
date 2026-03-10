import re

# E.164 standard phone number regex (e.g. +919876543210 or 9876543210)
PHONE_REGEX = r"^\+?[1-9]\d{1,14}$"
PHONE_REGEX_MESSAGE = "Invalid phone format. Please use a valid number (e.g. +91 9876543210)."

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
