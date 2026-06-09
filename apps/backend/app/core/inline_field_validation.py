"""
Validation rules for single-field (inline / single-column) updates on CRM entities.
Mirrors the same constraints enforced by the create/edit forms.
"""
from __future__ import annotations

import re
from typing import Any, Optional

from fastapi import HTTPException
from pydantic import EmailStr, TypeAdapter, ValidationError

from app.core.validators import PHONE_REGEX_MESSAGE, format_phone_value

_EMAIL_ADAPTER = TypeAdapter(EmailStr)

# Fields allowed to be updated via single-column / inline table edits.
INLINE_EDITABLE_FIELDS: dict[str, frozenset[str]] = {
    "contact": frozenset({"first_name", "last_name", "email", "phone", "mobile"}),
    "lead": frozenset({"first_name", "last_name", "email", "phone", "mobile"}),
    "account": frozenset({"first_name", "last_name", "email", "phone", "mobile", "name"}),
}


def _normalize_value(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _validate_email(value: str, *, required: bool) -> None:
    if not value:
        if required:
            raise HTTPException(status_code=422, detail="Email is required.")
        return
    try:
        _EMAIL_ADAPTER.validate_python(value)
    except ValidationError:
        raise HTTPException(status_code=422, detail="Invalid email address.")


def _validate_phone(value: str, *, required: bool) -> str | None:
    if not value:
        if required:
            raise HTTPException(status_code=422, detail="Phone is required.")
        return None
    formatted = format_phone_value(value)
    if not formatted:
        raise HTTPException(status_code=422, detail=PHONE_REGEX_MESSAGE)
    return formatted


def _validate_text(
    value: str,
    *,
    required: bool,
    min_length: Optional[int] = None,
    max_length: Optional[int] = None,
    field_label: str,
) -> None:
    if not value:
        if required:
            raise HTTPException(status_code=422, detail=f"{field_label} is required.")
        return
    if min_length is not None and len(value) < min_length:
        raise HTTPException(
            status_code=422,
            detail=f"{field_label} must be at least {min_length} characters.",
        )
    if max_length is not None and len(value) > max_length:
        raise HTTPException(
            status_code=422,
            detail=f"{field_label} must be at most {max_length} characters.",
        )


def validate_inline_field_update(
    entity_type: str,
    field_name: str,
    field_value: Any,
    *,
    is_person_account: bool = False,
) -> Any:
    """
    Validate and normalize a single inline field update.
    Returns the normalized value to persist.
  """
    allowed = INLINE_EDITABLE_FIELDS.get(entity_type)
    if not allowed or field_name not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid field: {field_name}")

    value = _normalize_value(field_value)

    if entity_type == "contact":
        if field_name == "first_name":
            _validate_text(value, required=False, max_length=100, field_label="First name")
        elif field_name == "last_name":
            _validate_text(value, required=True, min_length=2, max_length=100, field_label="Last name")
        elif field_name == "email":
            _validate_email(value, required=True)
        elif field_name == "phone":
            value = _validate_phone(value, required=False) or ""
        elif field_name == "mobile":
            normalized = _validate_phone(value, required=True)
            value = normalized or ""

    elif entity_type == "lead":
        if field_name == "first_name":
            _validate_text(value, required=False, max_length=100, field_label="First name")
        elif field_name == "last_name":
            _validate_text(value, required=True, min_length=1, max_length=100, field_label="Last name")
        elif field_name == "email":
            _validate_email(value, required=False)
        elif field_name in {"phone", "mobile"}:
            value = _validate_phone(value, required=False) or ""

    elif entity_type == "account":
        if field_name == "name":
            _validate_text(value, required=True, min_length=2, max_length=255, field_label="Account name")
        elif field_name == "first_name":
            _validate_text(value, required=False, max_length=100, field_label="First name")
        elif field_name == "last_name":
            min_len = 1 if is_person_account else None
            _validate_text(
                value,
                required=is_person_account,
                min_length=min_len,
                max_length=100,
                field_label="Last name",
            )
        elif field_name == "email":
            _validate_email(value, required=True)
        elif field_name == "phone":
            normalized = _validate_phone(value, required=True)
            value = normalized or ""
        elif field_name == "mobile":
            value = _validate_phone(value, required=False) or ""

    return value if value else None
