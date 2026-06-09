"""
Canonical required-field rules aligned with CRM create/edit forms.
Enforced on create and after merge on update so partial PUT cannot clear required data.
"""
from __future__ import annotations

from typing import Any, Mapping, Optional

from bson import ObjectId


def _field(record: Any, name: str) -> Any:
    if isinstance(record, Mapping):
        return record.get(name)
    return getattr(record, name, None)


def _is_empty(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str) and not value.strip():
        return True
    if isinstance(value, (list, dict, tuple, set)) and len(value) == 0:
        return True
    return False


def _require(value: Any, label: str, *, min_length: Optional[int] = None) -> None:
    if _is_empty(value):
        raise ValueError(f"{label} is required.")
    if min_length is not None and isinstance(value, str) and len(value.strip()) < min_length:
        raise ValueError(f"{label} must be at least {min_length} characters.")


def validate_contact_record(record: Any) -> None:
    _require(_field(record, "last_name"), "Last name", min_length=2)
    _require(_field(record, "email"), "Email")
    _require(_field(record, "mobile"), "Mobile")
    account_id = _field(record, "account_id")
    if _is_empty(account_id):
        raise ValueError("Account is required.")


def validate_lead_record(record: Any, *, industry: Optional[str] = None) -> None:
    _require(_field(record, "last_name"), "Last name", min_length=1)
    _require(_field(record, "city"), "City")
    _require(_field(record, "state"), "State")
    _require(_field(record, "country"), "Country")
    if _is_empty(_field(record, "source_id")) and _is_empty(_field(record, "source_medium_id")):
        raise ValueError("Source is required.")

    if industry == "travel":
        industry_data = _field(record, "industry_data") or {}
        _require(industry_data.get("travel_date"), "Travel date")
        destinations = industry_data.get("destinations") or industry_data.get("destination_ids") or []
        if _is_empty(destinations):
            raise ValueError("Destinations are required.")


def validate_account_record(record: Any, *, is_person_account: bool) -> None:
    if is_person_account:
        _require(_field(record, "last_name"), "Last name", min_length=1)
    else:
        _require(_field(record, "name"), "Account name", min_length=2)
        _require(_field(record, "industry_id"), "Industry")
        _require(_field(record, "acc_type_id"), "Account type")
    _require(_field(record, "email"), "Email")
    _require(_field(record, "phone"), "Phone")
    _require(_field(record, "billing_state"), "State")
    _require(_field(record, "billing_country"), "Country")


def validate_opportunity_record(record: Any, *, require_contact: bool = False) -> None:
    _require(_field(record, "name"), "Deal name", min_length=1)
    _require(_field(record, "sales_stage_id"), "Sales stage")
    _require(_field(record, "account_id"), "Account")
    if require_contact:
        _require(_field(record, "contact_id"), "Contact")


def validate_supplier_record(record: Any) -> None:
    _require(_field(record, "name"), "Name", min_length=2)
    _require(_field(record, "supplier_type"), "Supplier type")
    _require(_field(record, "phone"), "Phone")


def validate_task_record(record: Any) -> None:
    _require(_field(record, "name"), "Task name", min_length=2)
    _require(_field(record, "assigned_user_id"), "Assigned user")


def validate_user_record(record: Any, *, is_create: bool = False) -> None:
    _require(_field(record, "name"), "Name", min_length=2)
    _require(_field(record, "email"), "Email")
    if is_create:
        _require(_field(record, "role_hierarchy_id"), "Role hierarchy")
        role_ids = _field(record, "role_ids")
        if _is_empty(role_ids):
            raise ValueError("Profile is required.")


async def opportunity_requires_contact(account_id: Any, tenant_id: ObjectId) -> bool:
    """B2B opportunities require a contact when the account is not a person account."""
    if _is_empty(account_id):
        return False
    from app.models.account import Account

    try:
        oid = ObjectId(account_id)
    except Exception:
        return True
    account = await Account.find_one(
        {"_id": oid, "tenant_id": tenant_id, "deleted_at": None}
    )
    if not account:
        return True
    return not account.is_person_account
