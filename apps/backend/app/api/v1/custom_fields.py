"""
Custom (Additional) Fields API — Phase 1 parity port.

Mirrors the old Laravel `rest_addfield_*` and `sort_*_fields` endpoints
under a single polymorphic resource path.
"""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from beanie import PydanticObjectId

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.field_registry import (
    AdditionalFieldCreate,
    AdditionalFieldUpdate,
    AdditionalFieldResponse,
    FieldSortRequest,
    FieldStatusToggle,
    FieldMandatoryToggle,
)
from app.services import field_registry_service as svc

router = APIRouter()


VALID_ENTITIES = {"account", "contact", "lead", "opportunity",
                  "supplier", "personal_account", "task"}


def _check_entity(entity_type: str) -> None:
    if entity_type not in VALID_ENTITIES:
        raise HTTPException(400, f"Unknown entity_type: {entity_type}. "
                                  f"Valid: {sorted(VALID_ENTITIES)}")


# ---------- list / read ----------

@router.get("/{entity_type}", response_model=List[AdditionalFieldResponse])
async def list_fields(
    entity_type: str,
    active_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
):
    _check_entity(entity_type)
    fields = await svc.list_additional_fields(
        entity_type, current_user.tenant_id, active_only=active_only,
    )
    return [AdditionalFieldResponse.model_validate(f, from_attributes=True) for f in fields]


@router.get("/{entity_type}/active", response_model=List[AdditionalFieldResponse])
async def list_active_fields(
    entity_type: str,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/rest_addfield_{entity}_active` and `/admin_addfield_{entity}_active`."""
    _check_entity(entity_type)
    fields = await svc.list_additional_fields(
        entity_type, current_user.tenant_id, active_only=True,
    )
    return [AdditionalFieldResponse.model_validate(f, from_attributes=True) for f in fields]


@router.get("/{entity_type}/{field_id}", response_model=AdditionalFieldResponse)
async def get_field(
    entity_type: str,
    field_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    _check_entity(entity_type)
    obj = await svc.get_additional_field(entity_type, field_id, current_user.tenant_id)
    return AdditionalFieldResponse.model_validate(obj, from_attributes=True)


# ---------- write ----------

@router.post("/{entity_type}", response_model=AdditionalFieldResponse, status_code=201)
async def create_field(
    entity_type: str,
    payload: AdditionalFieldCreate,
    current_user: User = Depends(get_current_user),
):
    _check_entity(entity_type)
    obj = await svc.create_additional_field(
        entity_type, payload, current_user.tenant_id, created_by=current_user.id,
    )
    return AdditionalFieldResponse.model_validate(obj, from_attributes=True)


@router.put("/{entity_type}/{field_id}", response_model=AdditionalFieldResponse)
async def update_field(
    entity_type: str,
    field_id: PydanticObjectId,
    payload: AdditionalFieldUpdate,
    current_user: User = Depends(get_current_user),
):
    _check_entity(entity_type)
    obj = await svc.update_additional_field(
        entity_type, field_id, payload, current_user.tenant_id,
        modified_by=current_user.id,
    )
    return AdditionalFieldResponse.model_validate(obj, from_attributes=True)


@router.delete("/{entity_type}/{field_id}", status_code=204)
async def delete_field(
    entity_type: str,
    field_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    _check_entity(entity_type)
    await svc.delete_additional_field(entity_type, field_id, current_user.tenant_id)


# ---------- bulk operations ----------

@router.post("/{entity_type}/sort", status_code=200)
async def sort_fields(
    entity_type: str,
    payload: FieldSortRequest,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/sort_{entity}_fields`."""
    _check_entity(entity_type)
    items = [{"id": i.id, "sorting": i.sorting} for i in payload.items]
    n = await svc.sort_additional_fields(entity_type, items, current_user.tenant_id)
    return {"updated": n}


@router.post("/{entity_type}/status", response_model=AdditionalFieldResponse)
async def toggle_status(
    entity_type: str,
    payload: FieldStatusToggle,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/status_update_additional_field`."""
    _check_entity(entity_type)
    obj = await svc.toggle_additional_field_status(
        entity_type, payload.id, payload.is_active, current_user.tenant_id,
    )
    return AdditionalFieldResponse.model_validate(obj, from_attributes=True)


@router.post("/{entity_type}/mandatory", response_model=AdditionalFieldResponse)
async def toggle_mandatory(
    entity_type: str,
    payload: FieldMandatoryToggle,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/mandatory_update_additional_field`."""
    _check_entity(entity_type)
    obj = await svc.toggle_additional_field_mandatory(
        entity_type, payload.id, payload.is_mandatory, current_user.tenant_id,
    )
    return AdditionalFieldResponse.model_validate(obj, from_attributes=True)


# ---------- VALUES per entity record (Phase 1 §C) ----------

@router.get("/{entity_type}/values/{entity_id}")
async def read_values_for_entity(
    entity_type: str,
    entity_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    """
    Read all custom-field values for one entity record.
    Returns: {additional_field_id: {value, type, name, label}}
    """
    _check_entity(entity_type)
    return await svc.read_custom_field_values(
        entity_type, entity_id, current_user.tenant_id,
    )


# ---------- email-template tokens (Phase 1 §H prereq) ----------

@router.get("/{entity_type}/template-tokens")
async def list_template_tokens(
    entity_type: str,
    current_user: User = Depends(get_current_user),
):
    """Tokens for email template picker: `{{custom.<name>}}`."""
    _check_entity(entity_type)
    fields = await svc.list_additional_fields(
        entity_type, current_user.tenant_id, active_only=True,
    )
    return [
        {"token": f"{{{{custom.{f.name}}}}}", "label": f.label or f.name, "id": str(f.id)}
        for f in fields
    ]
