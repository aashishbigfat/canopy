import pytest
from fastapi import HTTPException

from app.core.inline_field_validation import validate_inline_field_update


def test_contact_email_required():
    with pytest.raises(HTTPException) as exc:
        validate_inline_field_update("contact", "email", "")
    assert exc.value.status_code == 422
    assert "Email is required" in exc.value.detail


def test_contact_invalid_email():
    with pytest.raises(HTTPException) as exc:
        validate_inline_field_update("contact", "email", "not-an-email")
    assert exc.value.status_code == 422


def test_contact_invalid_phone_rejected():
    with pytest.raises(HTTPException) as exc:
        validate_inline_field_update("contact", "phone", "12345")
    assert exc.value.status_code == 422


def test_contact_mobile_required():
    with pytest.raises(HTTPException) as exc:
        validate_inline_field_update("contact", "mobile", "")
    assert exc.value.status_code == 422


def test_contact_valid_phone_normalized():
    value = validate_inline_field_update("contact", "phone", "+91 9876543210")
    assert value == "+91 9876543210"


def test_contact_rejects_more_than_ten_local_digits():
    with pytest.raises(HTTPException):
        validate_inline_field_update("contact", "phone", "+91 98765432101")


def test_lead_last_name_required():
    with pytest.raises(HTTPException):
        validate_inline_field_update("lead", "last_name", "")


def test_account_phone_required():
    with pytest.raises(HTTPException):
        validate_inline_field_update("account", "phone", "", is_person_account=False)


def test_person_account_last_name_required():
    with pytest.raises(HTTPException):
        validate_inline_field_update("account", "last_name", "", is_person_account=True)


def test_invalid_field_rejected():
    with pytest.raises(HTTPException) as exc:
        validate_inline_field_update("contact", "owner_id", "abc")
    assert exc.value.status_code == 400
