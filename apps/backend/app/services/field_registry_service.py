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
    filter_dict: dict = {"tenant_id": tenant_id}
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
    obj = await Doc.get(field_id)
    if not obj or obj.tenant_id != tenant_id:
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
        max_sort_doc = await Doc.find({"tenant_id": tenant_id}).sort("-sorting").first_or_none()
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
    # Cascade-delete the associated custom-field values
    cfg = _resolve_value_config(entity_type)
    ValueDoc = cfg["doc"]
    field_fk = cfg["field_fk"]
    await ValueDoc.find(getattr(ValueDoc, field_fk) == field_id).delete()
    await obj.delete()


async def sort_additional_fields(
    entity_type: str,
    items: List[Dict[str, Any]],
    tenant_id: PydanticObjectId,
) -> int:
    """Bulk update sort order. Items: [{id, sorting}]."""
    Doc = _resolve_additional_doc(entity_type)
    updated = 0
    for item in items:
        obj = await Doc.get(item["id"])
        if obj and obj.tenant_id == tenant_id:
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


# --------- StandardField CRUD ---------

async def list_standard_fields(
    entity_type: str,
    tenant_id: PydanticObjectId,
    active_only: bool = False,
) -> List[StandardField]:
    std_filter: dict = {"tenant_id": tenant_id, "entity_type": entity_type}
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
    obj = await StandardField.get(field_id)
    if not obj or obj.tenant_id != tenant_id:
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
    updated = 0
    for item in items:
        obj = await StandardField.get(item["id"])
        if obj and obj.tenant_id == tenant_id and obj.entity_type == entity_type:
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
        defn = await Doc.get(v.additional_field_id)
        if not defn or defn.tenant_id != tenant_id:
            continue
        existing = await ValueDoc.find_one(
            getattr(ValueDoc, entity_fk) == entity_id,
            getattr(ValueDoc, field_fk) == v.additional_field_id,
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
    defs = await Doc.find({"_id": {"$in": field_ids}}).to_list()
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
    defs = await Doc.find({"_id": {"$in": field_ids}}).to_list()
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
    dst_defs = await DstDoc.find({"tenant_id": tenant_id}).to_list()
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
        {"tenant_id": tenant_id, "is_active": True, "is_mandatory": True}
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
