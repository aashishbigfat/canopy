import pytest

from app.core.entity_required_fields import (
    validate_contact_record,
    validate_lead_record,
    validate_account_record,
    validate_supplier_record,
    validate_task_record,
    validate_user_record,
)


def test_contact_requires_core_fields():
    with pytest.raises(ValueError, match="Email is required"):
        validate_contact_record({"last_name": "Doe", "mobile": "+91 1234567890", "account_id": "abc"})


def test_lead_requires_address_and_source():
    with pytest.raises(ValueError, match="City is required"):
        validate_lead_record({"last_name": "Doe", "state": "X", "country": "Y", "source_id": "s1"})


def test_travel_lead_requires_industry_data():
    with pytest.raises(ValueError, match="Travel date"):
        validate_lead_record(
            {"last_name": "Doe", "city": "A", "state": "B", "country": "C", "source_id": "s1", "industry_data": {}},
            industry="travel",
        )


def test_company_account_requires_classification():
    with pytest.raises(ValueError, match="Industry"):
        validate_account_record(
            {"name": "Acme", "email": "a@b.com", "phone": "+91 1234567890", "billing_state": "S", "billing_country": "IN"},
            is_person_account=False,
        )


def test_person_account_requires_last_name():
    with pytest.raises(ValueError, match="Last name"):
        validate_account_record(
            {"email": "a@b.com", "phone": "+91 1234567890", "billing_state": "S", "billing_country": "IN"},
            is_person_account=True,
        )


def test_supplier_requires_phone():
    with pytest.raises(ValueError, match="Phone is required"):
        validate_supplier_record({"name": "Vendor", "supplier_type": "Hotel"})


def test_task_requires_assignee():
    with pytest.raises(ValueError, match="Assigned user"):
        validate_task_record({"name": "Follow up"})


def test_user_create_requires_profile():
    with pytest.raises(ValueError, match="Profile is required"):
        validate_user_record({"name": "Admin User", "email": "a@b.com", "role_hierarchy_id": "h1"}, is_create=True)
