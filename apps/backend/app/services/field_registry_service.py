"""
Field registry service — Phase 1.

Single entry point for AdditionalField CRUD + StandardField CRUD + CustomFieldValue
write across all entity types. Resolves per-entity Beanie Document classes via
a small registry table.

Entity types: account | contact | lead | opportunity | supplier | personal_account | task
"""
from __future__ import annotations
from typing import Optional, List, Type, Dict, Any
from beanie import Document, PydanticObjectId
from datetime import datetime
from fastapi import HTTPException

# Consolidated field models
from app.models.consolidated_fields import (
    AdditionalFieldAccount,
    AdditionalFieldContact,
    AdditionalFieldLead,
    AdditionalFieldOpportunity,
    AdditionalFieldSupplier,
    AdditionalFieldPersonalAccount,
    AdditionalFieldTask,
    AccountCustomField,
    ContactCustomField,
    LeadCustomField,
    OpportunityCustomField,
    SupplierCustomField,
    PersonalAccountCustomField,
    TaskCustomField,
    StandardField,
)
from app.schemas.field_registry import (
    AdditionalFieldCreate,
    AdditionalFieldUpdate,
    StandardFieldCreate,
    StandardFieldUpdate,
    CustomFieldValuePayload,
)


# --------- Registry tables ---------

ADDITIONAL_FIELD_MAP: Dict[str, Type[Document]] = {
    "account": AdditionalFieldAccount,
    "contact": AdditionalFieldContact,
    "lead": AdditionalFieldLead,
    "opportunity": AdditionalFieldOpportunity,
    "supplier": AdditionalFieldSupplier,
    "personal_account": AdditionalFieldPersonalAccount,
    "task": AdditionalFieldTask,
}


# Custom field VALUE document + foreign-key field name on that doc
# pointing at (a) entity record and (b) additional_field record.
CUSTOM_FIELD_VALUE_MAP: Dict[str, Dict[str, Any]] = {
    "account": {
        "doc": AccountCustomField,
        "entity_fk": "account_id",
        "field_fk": "account_additional_field_id",
    },
    "contact": {
        "doc": ContactCustomField,
        "entity_fk": "contact_id",
        "field_fk": "contact_additional_field_id",
    },
    "lead": {
        "doc": LeadCustomField,
        "entity_fk": "lead_id",
        "field_fk": "lead_additional_field_id",
    },
    "opportunity": {
        "doc": OpportunityCustomField,
        "entity_fk": "opportunity_id",
        "field_fk": "opp_additional_field_id",
    },
    "supplier": {
        "doc": SupplierCustomField,
        "entity_fk": "supplier_id",
        "field_fk": "supplier_additional_field_id",
    },
    "personal_account": {
        "doc": PersonalAccountCustomField,
        "entity_fk": "personal_account_id",
        "field_fk": "personal_account_additional_field_id",
    },
    "task": {
        "doc": TaskCustomField,
        "entity_fk": "task_id",
        "field_fk": "task_additional_field_id",
    },
}


def _resolve_additional_doc(entity_type: str) -> Type[Document]:
    if entity_type not in ADDITIONAL_FIELD_MAP:
        raise HTTPException(400, f"Unknown entity_type: {entity_type}")
    return ADDITIONAL_FIELD_MAP[entity_type]


def _resolve_value_config(entity_type: str) -> Dict[str, Any]:
    if entity_type not in CUSTOM_FIELD_VALUE_MAP:
        raise HTTPException(400, f"Unknown entity_type: {entity_type}")
    return CUSTOM_FIELD_VALUE_MAP[entity_type]


# --------- AdditionalField CRUD ---------

async def list_additional_fields(
    entity_type: str,
    tenant_id: PydanticObjectId,
    active_only: bool = False,
) -> List[Document]:
    Doc = _resolve_additional_doc(entity_type)
    filter_dict: dict = {"tenant_id": tenant_id, "entity_type": entity_type}
    if active_only:
        filter_dict["is_active"] = True
    query = Doc.find(filter_dict)
    return await query.sort("+sorting").to_list()


async def get_additional_field(
    entity_type: str,
    field_id: PydanticObjectId,
    tenant_id: PydanticObjectId,
) -> Document:
    Doc = _resolve_additional_doc(entity_type)
    obj = await Doc.find_one(
        {"_id": field_id, "tenant_id": tenant_id, "entity_type": entity_type}
    )
    if not obj:
        raise HTTPException(404, f"{entity_type} additional field not found")
    return obj


async def create_additional_field(
    entity_type: str,
    payload: AdditionalFieldCreate,
    tenant_id: PydanticObjectId,
    created_by: Optional[PydanticObjectId] = None,
) -> Document:
    Doc = _resolve_additional_doc(entity_type)
    # If sorting not provided (== 0), append to end
    if payload.sorting == 0:
        max_sort_doc = await Doc.find({"tenant_id": tenant_id, "entity_type": entity_type}).sort("-sorting").first_or_none()
        next_sort = (max_sort_doc.sorting + 1) if max_sort_doc else 1
    else:
        next_sort = payload.sorting
    obj_kwargs = payload.model_dump()
    obj_kwargs["sorting"] = next_sort
    obj_kwargs["tenant_id"] = tenant_id
    if hasattr(Doc, "model_fields") and "created_by" in Doc.model_fields:
        obj_kwargs["created_by"] = created_by
    obj = Doc(**obj_kwargs)
    await obj.insert()
    return obj


async def update_additional_field(
    entity_type: str,
    field_id: PydanticObjectId,
    payload: AdditionalFieldUpdate,
    tenant_id: PydanticObjectId,
    modified_by: Optional[PydanticObjectId] = None,
) -> Document:
    obj = await get_additional_field(entity_type, field_id, tenant_id)
    data = payload.model_dump(exclude_none=True)
    for k, v in data.items():
        setattr(obj, k, v)
    if hasattr(obj, "last_modified_by_id") and modified_by:
        obj.last_modified_by_id = modified_by
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj


async def delete_additional_field(
    entity_type: str,
    field_id: PydanticObjectId,
    tenant_id: PydanticObjectId,
) -> None:
    obj = await get_additional_field(entity_type, field_id, tenant_id)
    # Cascade-delete the associated custom-field values — MUST be tenant-scoped
    # so a shared field_id cannot ever delete value rows belonging to another
    # tenant.
    cfg = _resolve_value_config(entity_type)
    ValueDoc = cfg["doc"]
    field_fk = cfg["field_fk"]
    await ValueDoc.find({field_fk: field_id, "tenant_id": tenant_id}).delete()
    await obj.delete()


async def sort_additional_fields(
    entity_type: str,
    items: List[Dict[str, Any]],
    tenant_id: PydanticObjectId,
) -> int:
    """Bulk update sort order. Items: [{id, sorting}]."""
    Doc = _resolve_additional_doc(entity_type)
    updated = 0
    # Bulk tenant-scoped fetch — avoids per-item TOCTOU and cuts N queries to 1.
    ids = [item["id"] for item in items if item.get("id")]
    if not ids:
        return 0
    docs = await Doc.find(
        {"_id": {"$in": ids}, "tenant_id": tenant_id}
    ).to_list()
    docs_by_id = {str(d.id): d for d in docs}
    for item in items:
        obj = docs_by_id.get(str(item.get("id")))
        if obj is not None:
            obj.sorting = item["sorting"]
            obj.updated_at = datetime.utcnow()
            await obj.save()
            updated += 1
    return updated


async def toggle_additional_field_status(
    entity_type: str,
    field_id: PydanticObjectId,
    is_active: bool,
    tenant_id: PydanticObjectId,
) -> Document:
    obj = await get_additional_field(entity_type, field_id, tenant_id)
    obj.is_active = is_active
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj


async def toggle_additional_field_mandatory(
    entity_type: str,
    field_id: PydanticObjectId,
    is_mandatory: bool,
    tenant_id: PydanticObjectId,
) -> Document:
    obj = await get_additional_field(entity_type, field_id, tenant_id)
    obj.is_mandatory = is_mandatory
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj


# --------- StandardField defaults (lazy-seeded per tenant) ---------

# Each entry: (field_key, label, field_type, is_mandatory, system_mandatory)
# system_mandatory=True → admin CANNOT deactivate or remove the mandatory flag.
# is_mandatory=True, system_mandatory=False → mandatory by default, admin can toggle.

DEFAULT_STANDARD_FIELDS: Dict[str, list] = {
    # ----- ACCOUNT (Business) -----
    # Source: AccountForm.tsx JSX (isPersonAccount=false)
    # NOTE: salutation/first_name/last_name hidden by {!isPersonAccount} guard
    # NOTE: shipping_* fields have no JSX rendering in the form
    "account": [
        ("name",              "Account Name",        "text",     True,  True),
        ("email",             "Email",               "email",    True,  True),
        ("phone",             "Phone",               "phone",    True,  True),
        ("website",           "Website",             "url",      False, False),
        ("industry_id",       "Industry",            "lookup",   True,  False),
        ("acc_type_id",       "Account Type",        "lookup",   True,  False),
        ("billing_street",    "Billing Street",      "text",     False, False),
        ("billing_city",      "Billing City",        "text",     False, False),
        ("billing_state",     "Billing State",       "text",     True,  True),
        ("billing_zip",       "Billing Zip",         "text",     False, False),
        ("billing_country",   "Billing Country",     "text",     True,  True),
        ("owner_id",          "Account Owner",       "lookup",   False, False),
    ],

    # ----- CONTACT -----
    # Source: ContactForm.tsx → contactFormSchema
    "contact": [
        ("salutation",        "Salutation",          "select",   False, False),
        ("first_name",        "First Name",          "text",     False, False),
        ("last_name",         "Last Name",           "text",     True,  True),
        ("email",             "Email",               "email",    True,  True),
        ("phone",             "Phone",               "phone",    False, False),
        ("mobile",            "Mobile",              "phone",    True,  True),
        ("title",             "Job Title",           "text",     False, False),
        ("account_id",        "Account",             "lookup",   True,  True),
    ],

    # ----- LEAD -----
    # Source: LeadForm.tsx → leadFormSchema / genericBaseFields
    "lead": [
        ("salutation",        "Salutation",          "select",   False, False),
        ("first_name",        "First Name",          "text",     False, False),
        ("last_name",         "Last Name",           "text",     True,  True),
        ("company",           "Company",             "text",     False, False),
        ("email",             "Email",               "email",    False, False),
        ("phone",             "Phone",               "phone",    False, False),
        ("mobile",            "Mobile",              "phone",    False, False),
        ("no_employees",      "No. of Employees",    "number",   False, False),
        ("website",           "Website",             "url",      False, False),
        ("title",             "Title / Designation", "text",     False, False),
        ("lead_status_id",    "Lead Status",         "lookup",   False, False),
        ("source_id",         "Source",              "lookup",   False, False),
        ("source_medium",     "Source Medium",       "text",     False, False),
        ("combined_source",   "Combined Source",     "select",   True,  False),
        ("industry_id",       "Industry",            "lookup",   False, False),
        ("street",            "Street",              "text",     False, False),
        ("city",              "City",                "text",     True,  False),
        ("state",             "State",               "text",     True,  False),
        ("zip",               "Zip / Postal Code",   "text",     False, False),
        ("country",           "Country",             "text",     True,  False),
        ("campaign_name",     "Campaign Name",       "text",     False, False),
        ("segment",           "Segment",             "select",   False, False),
        ("creation_type",     "Creation Type",       "select",   False, False),
    ],

    # ----- OPPORTUNITY -----
    # Source: OpportunityForm.tsx → opportunityFormSchema
    "opportunity": [
        ("name",              "Opportunity Name",    "text",     True,  True),
        ("amount",            "Amount",              "currency", False, False),
        ("sales_stage_id",    "Sales Stage",         "lookup",   True,  True),
        ("probability",       "Probability (%)",     "number",   False, False),
        ("opportunity_type_id","Opportunity Type",   "lookup",   False, False),
        ("owner_id",          "Opportunity Owner",   "lookup",   False, False),
        ("close_date",        "Close Date",          "date",     False, False),
        ("description",       "Description",         "textarea", False, False),
        ("account_id",        "Account",             "lookup",   False, False),
        ("contact_id",        "Contact",             "lookup",   False, False),
        ("close_lost_reason", "Close Lost Reason",   "select",   False, False),
    ],

    # ----- SUPPLIER -----
    # Source: supplier-form.tsx → supplierFormSchema
    "supplier": [
        ("name",              "Supplier Name",       "text",     True,  True),
        ("supplier_type",     "Supplier Type",       "select",   True,  True),
        ("owner_id",          "Supplier Owner",      "lookup",   False, False),
        ("contact_person_name","Contact Person",     "text",     False, False),
        ("phone",             "Phone",               "phone",    True,  True),
        ("mobile",            "Mobile",              "phone",    False, False),
        ("email",             "Email",               "email",    False, False),
        ("services",          "Services",            "multiselect", False, False),
        ("countries",         "Countries",           "multiselect", False, False),
        ("states",            "States",              "multiselect", False, False),
        ("service_cities",    "Service Cities",      "multiselect", False, False),
        ("destinations",      "Destinations",        "multiselect", False, False),
        ("street",            "Street",              "text",     False, False),
        ("city",              "City",                "text",     False, False),
        ("state",             "State",               "text",     False, False),
        ("zip",               "Zip / Postal Code",   "text",     False, False),
        ("country",           "Country",             "text",     False, False),
        ("is_active",         "Active",              "boolean",  False, False),
    ],

    # ----- PERSONAL_ACCOUNT -----
    # Source: AccountForm.tsx JSX (isPersonAccount=true)
    # NOTE: name hidden (person accounts use salutation+first+last)
    # NOTE: website, industry_id, acc_type_id hidden by {!isPersonAccount} guards
    # NOTE: shipping_* fields have no JSX rendering in the form
    "personal_account": [
        ("salutation",        "Salutation",          "select",   False, False),
        ("first_name",        "First Name",          "text",     False, False),
        ("last_name",         "Last Name",           "text",     True,  True),
        ("email",             "Email",               "email",    True,  True),
        ("phone",             "Phone",               "phone",    True,  True),
        ("billing_street",    "Billing Street",      "text",     False, False),
        ("billing_city",      "Billing City",        "text",     False, False),
        ("billing_state",     "Billing State",       "text",     True,  True),
        ("billing_zip",       "Billing Zip",         "text",     False, False),
        ("billing_country",   "Billing Country",     "text",     True,  True),
        ("owner_id",          "Account Owner",       "lookup",   False, False),
    ],

    # ----- TASK -----
    # Source: task-form.tsx → taskFormSchema
    "task": [
        ("name",              "Subject",             "text",     True,  True),
        ("due_date",          "Due Date",            "date",     False, False),
        ("status",            "Status",              "select",   False, False),
        ("priority",          "Priority",            "select",   False, False),
        ("assigned_user_id",  "Assigned To",         "lookup",   True,  True),
        ("description",       "Comments",            "textarea", False, False),
        ("related_to_type",   "Related To (Type)",   "select",   False, False),
        ("account_id",        "Account",             "lookup",   False, False),
        ("contact_id",        "Contact",             "lookup",   False, False),
        ("opportunity_id",    "Opportunity",         "lookup",   False, False),
    ],
}

import logging
_logger = logging.getLogger(__name__)


async def _seed_defaults_if_empty(
    entity_type: str,
    tenant_id: PydanticObjectId,
) -> bool:
    """Lazy-seed standard field definitions for a tenant + entity on first access.

    Returns True if seeding was performed, False if fields already existed.
    This is idempotent and race-condition safe: duplicate (tenant_id, entity_type,
    field_key) combos are silently skipped via field_key uniqueness in the query.
    """
    defaults = DEFAULT_STANDARD_FIELDS.get(entity_type)
    if not defaults:
        return False

    # Quick existence check — if at least 1 STANDARD field exists, skip seeding.
    # IMPORTANT: must filter by is_custom=False because StandardField shares the
    # field_registry collection with AdditionalField* models (no Beanie _class_id
    # discrimination), so without this filter, custom fields would prevent seeding.
    count = await StandardField.find(
        {"tenant_id": tenant_id, "entity_type": entity_type, "is_custom": False}
    ).count()
    if count > 0:
        return False

    now = datetime.utcnow()
    docs = []
    for sorting, (field_key, label, field_type, is_mandatory, system_mandatory) in enumerate(defaults):
        docs.append(StandardField(
            tenant_id=tenant_id,
            entity_type=entity_type,
            name=field_key,              # required by BaseField
            field_key=field_key,
            label=label,
            field_type=field_type,
            is_active=True,
            is_mandatory=is_mandatory,
            system_mandatory=system_mandatory,
            is_custom=False,
            sorting=sorting,
            created_at=now,
            updated_at=now,
        ))

    try:
        await StandardField.insert_many(docs)
        _logger.info(
            f"[STANDARD_FIELDS] Seeded {len(docs)} defaults for "
            f"entity_type={entity_type}, tenant_id={tenant_id}"
        )
    except Exception as e:
        # If a race condition causes a duplicate, log and proceed.
        # The subsequent query will return whatever was inserted first.
        _logger.warning(
            f"[STANDARD_FIELDS] insert_many partial/failed for "
            f"entity_type={entity_type}, tenant_id={tenant_id}: {e}"
        )

    return True


# --------- StandardField CRUD ---------

async def list_standard_fields(
    entity_type: str,
    tenant_id: PydanticObjectId,
    active_only: bool = False,
) -> List[StandardField]:
    # Lazy-seed defaults on first access for this tenant + entity
    await _seed_defaults_if_empty(entity_type, tenant_id)

    std_filter: dict = {"tenant_id": tenant_id, "entity_type": entity_type, "is_custom": False}
    if active_only:
        std_filter["is_active"] = True
    query = StandardField.find(std_filter)
    return await query.sort("+sorting").to_list()


async def upsert_standard_field(
    payload: StandardFieldCreate,
    tenant_id: PydanticObjectId,
) -> StandardField:
    obj = await StandardField.find_one(
        {"tenant_id": tenant_id, "entity_type": payload.entity_type, "field_key": payload.field_key}
    )
    if obj:
        for k, v in payload.model_dump(exclude={"entity_type", "field_key"}).items():
            setattr(obj, k, v)
        obj.updated_at = datetime.utcnow()
        await obj.save()
        return obj
    obj = StandardField(**payload.model_dump(), tenant_id=tenant_id)
    await obj.insert()
    return obj


async def update_standard_field(
    field_id: PydanticObjectId,
    payload: StandardFieldUpdate,
    tenant_id: PydanticObjectId,
) -> StandardField:
    obj = await StandardField.find_one(
        {"_id": field_id, "tenant_id": tenant_id}
    )
    if not obj:
        raise HTTPException(404, "Standard field not found")
    if obj.system_mandatory and payload.is_mandatory is False:
        raise HTTPException(400, "Cannot disable mandatory on system_mandatory field")
    if obj.system_mandatory and payload.is_active is False:
        raise HTTPException(400, "Cannot deactivate system_mandatory field")
    data = payload.model_dump(exclude_none=True)
    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj


async def sort_standard_fields(
    entity_type: str,
    items: List[Dict[str, Any]],
    tenant_id: PydanticObjectId,
) -> int:
    # Bulk tenant-scoped fetch — collapses N lookups to one and guarantees
    # we never touch another tenant's standard fields.
    ids = [item["id"] for item in items if item.get("id")]
    if not ids:
        return 0
    docs = await StandardField.find(
        {"_id": {"$in": ids}, "tenant_id": tenant_id, "entity_type": entity_type}
    ).to_list()
    by_id = {str(d.id): d for d in docs}
    updated = 0
    for item in items:
        obj = by_id.get(str(item.get("id")))
        if obj is None:
            continue
        obj.sorting = item["sorting"]
        obj.updated_at = datetime.utcnow()
        await obj.save()
        updated += 1
    return updated


# --------- Custom field VALUE write paths (called by entity services) ---------

def _coerce_custom_field_values(
    values: Any,
) -> List[CustomFieldValuePayload]:
    """
    Accept any of these shapes and produce a uniform payload list:
      - List[CustomFieldValuePayload] (already typed)
      - List[Dict] with keys {id|additional_field_id, value|field_value, type?}
      - Dict[str, scalar] mapping additional_field_id_str -> value
      - None
    """
    if not values:
        return []
    out: List[CustomFieldValuePayload] = []
    if isinstance(values, dict):
        import json as _json
        for k, v in values.items():
            try:
                fid = PydanticObjectId(k)
            except Exception:
                continue
            val = _json.dumps(v) if not isinstance(v, str) else v
            out.append(CustomFieldValuePayload(additional_field_id=fid, field_value=val))
        return out
    if isinstance(values, list):
        import json as _json
        for item in values:
            if isinstance(item, CustomFieldValuePayload):
                out.append(item)
                continue
            if not isinstance(item, dict):
                continue
            raw_id = item.get("additional_field_id") or item.get("id")
            if raw_id is None:
                continue
            try:
                fid = raw_id if isinstance(raw_id, PydanticObjectId) else PydanticObjectId(str(raw_id))
            except Exception:
                continue
            raw_val = item.get("field_value", item.get("value", ""))
            val = _json.dumps(raw_val) if not isinstance(raw_val, str) else raw_val
            out.append(CustomFieldValuePayload(additional_field_id=fid, field_value=val))
    return out


async def write_custom_field_values(
    entity_type: str,
    entity_id: PydanticObjectId,
    values: Any,
    tenant_id: PydanticObjectId,
) -> int:
    """
    Insert or update custom field values for an entity.
    Idempotent: existing (entity, additional_field) pair gets value updated.
    Accepts list/dict shapes via `_coerce_custom_field_values`.
    Returns number of writes.
    """
    values = _coerce_custom_field_values(values)
    if not values:
        return 0
    cfg = _resolve_value_config(entity_type)
    ValueDoc = cfg["doc"]
    entity_fk = cfg["entity_fk"]
    field_fk = cfg["field_fk"]

    # Resolve type metadata from AdditionalField definition
    Doc = _resolve_additional_doc(entity_type)

    written = 0
    for v in values:
        defn = await Doc.find_one(
            {"_id": v.additional_field_id, "tenant_id": tenant_id, "entity_type": entity_type}
        )
        if not defn:
            continue
        # Existing lookup is also tenant-scoped — the value doc inherits the
        # tenant, never write to another tenant's value row.
        existing = await ValueDoc.find_one(
            {
                entity_fk: entity_id,
                field_fk: v.additional_field_id,
                "tenant_id": tenant_id,
            }
        )
        if existing:
            existing.field_value = v.field_value
            existing.type = defn.field_type
            existing.updated_at = datetime.utcnow()
            await existing.save()
        else:
            obj_kwargs = {
                entity_fk: entity_id,
                field_fk: v.additional_field_id,
                "field_value": v.field_value,
                "type": defn.field_type,
                "tenant_id": tenant_id,
            }
            obj = ValueDoc(**obj_kwargs)
            await obj.insert()
        written += 1
    return written


async def read_custom_field_values(
    entity_type: str,
    entity_id: PydanticObjectId,
    tenant_id: PydanticObjectId,
) -> Dict[str, Any]:
    """
    Return {additional_field_id_str: {value, type, name, label}}
    """
    cfg = _resolve_value_config(entity_type)
    ValueDoc = cfg["doc"]
    entity_fk = cfg["entity_fk"]
    field_fk = cfg["field_fk"]

    rows = await ValueDoc.find(
        {entity_fk: entity_id, "tenant_id": tenant_id}
    ).to_list()
    if not rows:
        return {}

    Doc = _resolve_additional_doc(entity_type)
    field_ids = [getattr(r, field_fk) for r in rows]
    from app.core.tenant_scope import fetch_additional_fields_in_tenant
    defs = await fetch_additional_fields_in_tenant(
        Doc, tenant_id, field_ids, entity_type=entity_type
    )
    defs_by_id = {str(d.id): d for d in defs}

    out: Dict[str, Any] = {}
    for r in rows:
        fid = getattr(r, field_fk)
        defn = defs_by_id.get(str(fid))
        out[str(fid)] = {
            "value": r.field_value,
            "type": r.type,
            "name": defn.name if defn else None,
            "label": defn.label if defn else None,
        }
    return out


async def bulk_read_custom_field_values(
    entity_type: str,
    entity_ids: List[PydanticObjectId],
    tenant_id: PydanticObjectId,
) -> Dict[str, Dict[str, Any]]:
    """
    Sprint D — batch-fetch custom-field values for many entities.
    Returns: {entity_id_str: {field_id_str: {value, type, name, label}}}
    """
    if not entity_ids:
        return {}
    cfg = _resolve_value_config(entity_type)
    ValueDoc = cfg["doc"]
    entity_fk = cfg["entity_fk"]
    field_fk = cfg["field_fk"]

    rows = await ValueDoc.find(
        {entity_fk: {"$in": entity_ids}, "tenant_id": tenant_id},
    ).to_list()
    if not rows:
        return {str(eid): {} for eid in entity_ids}

    Doc = _resolve_additional_doc(entity_type)
    field_ids = list({getattr(r, field_fk) for r in rows})
    from app.core.tenant_scope import fetch_additional_fields_in_tenant
    defs = await fetch_additional_fields_in_tenant(
        Doc, tenant_id, field_ids, entity_type=entity_type
    )
    defs_by_id = {str(d.id): d for d in defs}

    out: Dict[str, Dict[str, Any]] = {str(eid): {} for eid in entity_ids}
    for r in rows:
        eid = str(getattr(r, entity_fk))
        fid = str(getattr(r, field_fk))
        defn = defs_by_id.get(fid)
        out.setdefault(eid, {})[fid] = {
            "value": r.field_value,
            "type": r.type,
            "name": defn.name if defn else None,
            "label": defn.label if defn else None,
        }
    return out


async def attach_custom_fields(
    entity_type: str,
    doc: Any,
    tenant_id: PydanticObjectId,
) -> Dict[str, Any]:
    """
    Sprint D — return `doc.model_dump()` enriched with `custom_fields` key
    populated by joining against the entity's custom-field value collection.

    Caller feeds the resulting dict into a Pydantic Response schema that has
    `custom_fields: Optional[Dict[str, Any]] = None`.
    """
    if doc is None:
        return {}
    data = doc.model_dump() if hasattr(doc, "model_dump") else dict(doc)
    try:
        cf = await read_custom_field_values(entity_type, doc.id, tenant_id)
        data["custom_fields"] = cf
    except Exception:
        data["custom_fields"] = {}
    return data


async def attach_custom_fields_bulk(
    entity_type: str,
    docs: List[Any],
    tenant_id: PydanticObjectId,
) -> List[Dict[str, Any]]:
    """Sprint D — vectorised helper for list endpoints."""
    if not docs:
        return []
    ids = [d.id for d in docs]
    try:
        bulk = await bulk_read_custom_field_values(entity_type, ids, tenant_id)
    except Exception:
        bulk = {str(i): {} for i in ids}
    out: List[Dict[str, Any]] = []
    for d in docs:
        data = d.model_dump() if hasattr(d, "model_dump") else dict(d)
        data["custom_fields"] = bulk.get(str(d.id), {})
        out.append(data)
    return out


async def delete_custom_field_values_for_entity(
    entity_type: str,
    entity_id: PydanticObjectId,
    tenant_id: PydanticObjectId,
) -> int:
    """Cascade-delete all custom-field values when an entity is deleted."""
    cfg = _resolve_value_config(entity_type)
    ValueDoc = cfg["doc"]
    entity_fk = cfg["entity_fk"]
    res = await ValueDoc.find(
        {entity_fk: entity_id, "tenant_id": tenant_id}
    ).delete()
    return res.deleted_count if hasattr(res, "deleted_count") else 0


async def copy_custom_field_values(
    src_entity_type: str,
    src_entity_id: PydanticObjectId,
    dst_entity_type: str,
    dst_entity_id: PydanticObjectId,
    tenant_id: PydanticObjectId,
    field_name_map: Optional[Dict[str, str]] = None,
) -> int:
    """
    Copy custom-field values from one entity to another (e.g. Lead → Opportunity).
    Resolution: match by AdditionalField.name (override via field_name_map).
    Returns count of values copied.
    """
    if src_entity_type == dst_entity_type and src_entity_id == dst_entity_id:
        return 0

    src_values = await read_custom_field_values(src_entity_type, src_entity_id, tenant_id)
    if not src_values:
        return 0

    DstDoc = _resolve_additional_doc(dst_entity_type)
    dst_defs = await DstDoc.find({"tenant_id": tenant_id, "entity_type": dst_entity_type}).to_list()
    dst_by_name: Dict[str, Document] = {d.name: d for d in dst_defs}

    copied = 0
    for _src_field_id, info in src_values.items():
        src_name = info.get("name")
        if not src_name:
            continue
        target_name = (field_name_map or {}).get(src_name, src_name)
        dst_def = dst_by_name.get(target_name)
        if not dst_def:
            continue
        await write_custom_field_values(
            dst_entity_type,
            dst_entity_id,
            [CustomFieldValuePayload(
                additional_field_id=dst_def.id,
                field_value=info["value"],
            )],
            tenant_id,
        )
        copied += 1
    return copied


# --------- Mandatory validation (Phase 1 §F) ---------

async def validate_mandatory_fields(
    entity_type: str,
    payload: Dict[str, Any],
    custom_field_values: List[CustomFieldValuePayload],
    tenant_id: PydanticObjectId,
) -> None:
    """
    Reject payload if any active is_mandatory standard field is missing,
    or any active is_mandatory additional field has no value.
    Raises HTTPException(422) on violation.
    """
    # Standard fields
    std_fields = await list_standard_fields(entity_type, tenant_id, active_only=True)
    missing_std = [
        s.field_key for s in std_fields
        if s.is_mandatory and not payload.get(s.field_key)
    ]
    if missing_std:
        raise HTTPException(
            status_code=422,
            detail={"missing_mandatory_standard_fields": missing_std},
        )

    # Additional fields
    Doc = _resolve_additional_doc(entity_type)
    add_fields = await Doc.find(
        {"tenant_id": tenant_id, "entity_type": entity_type, "is_active": True, "is_mandatory": True}
    ).to_list()
    if not add_fields:
        return

    submitted_ids = {str(v.additional_field_id) for v in custom_field_values}
    missing_add = [str(f.id) for f in add_fields if str(f.id) not in submitted_ids]
    if missing_add:
        raise HTTPException(
            status_code=422,
            detail={"missing_mandatory_additional_field_ids": missing_add},
        )
