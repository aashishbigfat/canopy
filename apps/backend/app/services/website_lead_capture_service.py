"""
Website enquiry capture.

Receives the lead JSON dookwebsite already posts to the old CRM and creates a
real Lead holding the same values the old CRM stores. The mapping rules are in
website_lead_mapper; this module does the tenant lookups those rules need and
writes through LeadService, so the normal lead invariants (industry_data
validation, required fields, BD assignment, activity log) still apply.

Tenant, owner and creator come from server settings, never from the request.
Field-by-field reference: explainers/tutterfly_con_data.md
"""
from __future__ import annotations

import hmac
import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from beanie import PydanticObjectId
from fastapi import Request
from pydantic import EmailStr, TypeAdapter, ValidationError

from app.core.config import settings
from app.core.industry_guard import resolve_industry_data
from app.core.picklist_query import build_picklist_query, dedup_picklist_items
from app.models.account import Account
from app.models.consolidated_picklists import (
    AccountType,
    BasePicklist,
    DestinationPicklist,
    Experience,
    LeadStatus,
    Source,
    SourceMedium,
)
from app.models.contact import Contact
from app.models.lead import Lead
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.field_registry import CustomFieldValuePayload
from app.schemas.lead import LeadCreate
from app.services import field_registry_service
from app.services.industry_service import get_tenant_industry
from app.services.lead_service import LeadService
from app.services.website_lead_mapper import map_website_lead, old_record_number

logger = logging.getLogger(__name__)

# Old CRM ids resolved to names via its seeders (ids follow seeding order):
# AccountTypeTableSeeder -> id 3 "Corporate Client"; LeadStatusTableSeeder -> id 2 "Open".
OLD_CORPORATE_ACCOUNT_TYPE = "corporate client"
OLD_WEBSITE_LEAD_STATUS = "Open"

# Old lead columns (and preserved originals) saved as same-named custom fields.
_COLUMN_CUSTOM_FIELD_KEYS = ("country_of_origin", "form_id", "lead_qhb", "bnpl_flag", "source", "departure_id")

_EMAIL = TypeAdapter(EmailStr)


class WebsiteCaptureNotConfigured(RuntimeError):
    """Website capture settings are missing or point at an unusable tenant/user."""


def is_valid_api_key(provided: Optional[str]) -> bool:
    expected = settings.WEBSITE_CAPTURE_API_KEY
    if not expected or not provided:
        return False
    return hmac.compare_digest(provided.encode(), expected.encode())


def _exact_ci(value: str) -> Dict[str, str]:
    return {"$regex": f"^{re.escape(value)}$", "$options": "i"}


def _valid_email(email: Optional[str]) -> Optional[str]:
    if not email:
        return None
    try:
        _EMAIL.validate_python(email)
    except ValidationError:
        return None
    return email


async def _active_user(user_id: PydanticObjectId, tenant_id: PydanticObjectId) -> Optional[User]:
    return await User.find_one(
        {"_id": user_id, "tenant_id": tenant_id, "is_active": True, "deleted_at": None}
    )


async def _load_context() -> Tuple[Tenant, User, User]:
    try:
        tenant_id = PydanticObjectId(settings.WEBSITE_CAPTURE_TENANT_ID)
        owner_id = PydanticObjectId(settings.WEBSITE_CAPTURE_OWNER_USER_ID)
        creator_id = PydanticObjectId(
            settings.WEBSITE_CAPTURE_CREATED_BY_USER_ID or settings.WEBSITE_CAPTURE_OWNER_USER_ID
        )
    except Exception as exc:
        raise WebsiteCaptureNotConfigured("tenant/owner ids are not valid ObjectIds") from exc

    tenant = await Tenant.find_one({"_id": tenant_id, "deleted_at": None})
    if not tenant or not tenant.is_active:
        raise WebsiteCaptureNotConfigured("tenant not found or inactive")

    owner = await _active_user(owner_id, tenant_id)
    creator = owner if creator_id == owner_id else await _active_user(creator_id, tenant_id)
    if not owner or not creator:
        raise WebsiteCaptureNotConfigured("owner/creator user not active in the tenant")
    return tenant, owner, creator


async def _account_lead_type(account: Account, tenant_id: PydanticObjectId, industry: str) -> str:
    """Old leadType(): 'P' person account, 'C' corporate account type, else 'A'."""
    if account.is_person_account:
        return "P"
    if account.acc_type_id:
        query = build_picklist_query(
            tenant_id, industry=industry, picklist_type="account_type", active_only=False
        )
        query["_id"] = account.acc_type_id
        acc_type = await AccountType.find_one(query)
        if acc_type and (acc_type.name or "").strip().lower() == OLD_CORPORATE_ACCOUNT_TYPE:
            return "C"
    return "A"


async def _email_classification(
    email: Optional[str], tenant_id: PydanticObjectId, industry: str
) -> Tuple[Optional[str], Optional[str]]:
    """Old UserHelper::leadType / leadTypeMail -> (segment, lead_type), checked in
    the old order: company account, then contact's account, then person account.
    The old email_segment domain table has no equivalent here yet, so unmatched
    emails stay unset."""
    if not email:
        return None, None
    base = {"tenant_id": tenant_id, "deleted_at": None, "email": _exact_ci(email)}

    company = await Account.find_one({**base, "is_person_account": False})
    if company:
        return "B2B", await _account_lead_type(company, tenant_id, industry)

    contact = await Contact.find_one(base)
    if contact and contact.account_id:
        account = await Account.find_one(
            {"_id": contact.account_id, "tenant_id": tenant_id, "deleted_at": None}
        )
        if account:
            segment = "B2C" if account.is_person_account else "B2B"
            return segment, await _account_lead_type(account, tenant_id, industry)

    if await Account.find_one({**base, "is_person_account": True}):
        return "B2C", "P"
    return None, None


async def _picklist_by_name(
    model: type[BasePicklist],
    picklist_type: str,
    tenant_id: PydanticObjectId,
    industry: str,
    name: Optional[str],
) -> Optional[BasePicklist]:
    if not name:
        return None
    query = build_picklist_query(tenant_id, industry=industry, picklist_type=picklist_type)
    query["name"] = _exact_ci(name)
    items = dedup_picklist_items(await model.find(query).sort("+sorting").to_list())
    return items[0] if items else None


async def _destination_items(
    names: List[str], tenant_id: PydanticObjectId, industry: str
) -> List[BasePicklist]:
    if not names:
        return []
    query = build_picklist_query(tenant_id, industry=industry, picklist_type="destination")
    query["name"] = {"$in": [re.compile(f"^{re.escape(n)}$", re.IGNORECASE) for n in names]}
    return dedup_picklist_items(await DestinationPicklist.find(query).to_list())


async def _website_lead_status(tenant_id: PydanticObjectId, industry: str) -> Optional[BasePicklist]:
    status = await _picklist_by_name(LeadStatus, "lead_status", tenant_id, industry, OLD_WEBSITE_LEAD_STATUS)
    if status:
        return status
    query = build_picklist_query(tenant_id, industry=industry, picklist_type="lead_status")
    query["is_default"] = True
    items = dedup_picklist_items(await LeadStatus.find(query).sort("+sorting").to_list())
    return items[0] if items else None


async def _write_named_custom_fields(
    lead_id: PydanticObjectId, tenant_id: PydanticObjectId, values: Dict[str, Any]
) -> int:
    """The old CRM saved a value only when a lead custom field with that name
    existed. Same here, so capture works before any field is set up."""
    fields = await field_registry_service.list_additional_fields("lead", tenant_id)
    field_ids = {(f.name or "").strip().lower(): f.id for f in fields}

    payloads = []
    for key, value in values.items():
        field_id = field_ids.get(key.lower())
        if field_id is None or value is None or value == "":
            continue
        payloads.append(
            CustomFieldValuePayload(
                additional_field_id=field_id,
                field_value=value if isinstance(value, str) else json.dumps(value),
            )
        )
    if not payloads:
        return 0
    return await field_registry_service.write_custom_field_values("lead", lead_id, payloads, tenant_id)


async def capture_website_lead(
    payload: Dict[str, Any], old_lead_id: Optional[str], request: Request
) -> Lead:
    """Create a Lead from the website payload. Raises WebsiteCaptureNotConfigured,
    pydantic.ValidationError / ValueError / HTTPException(422) on bad data."""
    lead_in = payload.get("lead")
    if not isinstance(lead_in, dict):
        raise ValueError("lead object is required")

    tenant, owner, creator = await _load_context()
    tenant_id = tenant.id
    industry = await get_tenant_industry(tenant_id)
    if industry != "travel":
        raise WebsiteCaptureNotConfigured(f"tenant industry is '{industry}', expected 'travel'")

    mapped = map_website_lead(lead_in)
    email = _valid_email(mapped["email"])

    segment, lead_type = await _email_classification(mapped["email"], tenant_id, industry)
    destinations = await _destination_items(mapped["destination_names"], tenant_id, industry)
    medium = await _picklist_by_name(SourceMedium, "source_medium", tenant_id, industry, mapped["source_medium"])
    source = await _picklist_by_name(Source, "source", tenant_id, industry, mapped["source_medium"])
    if medium is None and source is None:
        source = await _picklist_by_name(Source, "source", tenant_id, industry, "Organic")
    status = await _website_lead_status(tenant_id, industry)
    experience = await _picklist_by_name(Experience, "experience", tenant_id, industry, mapped["experience"])

    industry_data = {
        key: value
        for key, value in {
            "travel_date": mapped["travel_date"],
            "no_of_nights": mapped["no_of_nights"],
            "no_of_pax": mapped["no_of_pax"],
            "destinations": [mapped["destination"]] if mapped["destination"] else [],
            "destination_ids": [str(item.id) for item in destinations],
            "experience_id": str(experience.id) if experience else None,
            "is_fixed": mapped["is_fixed"],
        }.items()
        if value is not None
    }

    lead_data = LeadCreate(
        first_name=mapped["first_name"],
        last_name=mapped["last_name"],
        email=email,
        company=mapped["company"],
        title=mapped["title"],
        website=mapped["website"],
        city=mapped["city"],
        state=mapped["state"],
        country=mapped["country"],
        lead_status_id=str(status.id) if status else None,
        source_id=str(source.id) if source else None,
        source_medium_id=str(medium.id) if medium else None,
        source_medium=mapped["source_medium"],
        campaign_name=mapped["campaign_name"],
        ip_address=mapped["ip_address"],
        segment=segment,
        creation_type="auto",
        industry_data=industry_data,
    )
    # LeadCreate drops numbers it cannot read as "+<code> <number>". Keep the
    # value (formatted when unambiguous, otherwise as typed) instead of losing it.
    lead_data.phone = mapped["phone"]
    lead_data.mobile = mapped["mobile"]

    lead_data.industry_data = await resolve_industry_data(
        tenant_id, lead_data.industry_data, mode="lead", require_for_travel=True
    )
    lead_data.industry_data["destination_names"] = [item.name for item in destinations]

    service = LeadService()
    service.set_request_context(request, creator)
    lead = await service.create_lead(
        lead_data=lead_data,
        user_id=creator.id,
        tenant_id=tenant_id,
        user_name=creator.name or creator.email,
        skip_duplicate_check=True,  # the old CRM creates a lead for every enquiry
    )

    if owner.id != creator.id:
        lead.owner_id = owner.id
        lead.owner_name = owner.name
        await lead.save()

    custom_values = dict(mapped["custom_field_values"])
    custom_values["destination_id"] = (
        ",".join(str(item.id) for item in destinations) if mapped["destination"] else None
    )
    custom_values.update({key: mapped[key] for key in _COLUMN_CUSTOM_FIELD_KEYS})
    custom_values["lead_type"] = lead_type
    custom_values["old_tfc_lead_id"] = old_lead_id
    custom_values["record_id"] = old_record_number(old_lead_id)
    # Originals, only where this CRM stores something different from what was typed.
    custom_values["phone_raw"] = mapped["phone_raw"] if mapped["phone_raw"] != mapped["phone"] else None
    custom_values["mobile_raw"] = mapped["mobile_raw"] if mapped["mobile_raw"] != mapped["mobile"] else None
    custom_values["email_raw"] = mapped["email"] if mapped["email"] and email is None else None
    try:
        await _write_named_custom_fields(lead.id, tenant_id, custom_values)
    except Exception:
        # The lead itself is saved; a custom-field failure must not turn it into an error.
        logger.exception("Website capture: custom fields not saved for lead %s", lead.id)

    return lead
