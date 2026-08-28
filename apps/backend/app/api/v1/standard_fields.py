"""
Standard Fields API — Phase 1 parity port.

Mirrors old `rest_standard_fields_*`, `edit_*_standard_fields/{id}`,
`update_*_standard_fields*`, `sort_*_st_fields` endpoints under one
polymorphic resource path.
"""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from beanie import PydanticObjectId

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.field_registry import (
    StandardFieldCreate,
    StandardFieldUpdate,
    StandardFieldResponse,
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


@router.get("/{entity_type}", response_model=List[StandardFieldResponse])
async def list_fields(
    entity_type: str,
    active_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
):
    _check_entity(entity_type)
    fields = await svc.list_standard_fields(
        entity_type, current_user.tenant_id, active_only=active_only,
    )
    return [StandardFieldResponse.model_validate(f, from_attributes=True) for f in fields]


@router.post("/{entity_type}", response_model=StandardFieldResponse)
async def upsert_field(
    entity_type: str,
    payload: StandardFieldCreate,
    current_user: User = Depends(get_current_user),
):
    _check_entity(entity_type)
    if payload.entity_type != entity_type:
        raise HTTPException(400, "entity_type mismatch")
    obj = await svc.upsert_standard_field(payload, current_user.tenant_id)
    return StandardFieldResponse.model_validate(obj, from_attributes=True)


@router.put("/{entity_type}/{field_id}", response_model=StandardFieldResponse)
async def update_field(
    entity_type: str,
    field_id: PydanticObjectId,
    payload: StandardFieldUpdate,
    current_user: User = Depends(get_current_user),
):
    _check_entity(entity_type)
    obj = await svc.update_standard_field(field_id, payload, current_user.tenant_id)
    return StandardFieldResponse.model_validate(obj, from_attributes=True)


@router.post("/{entity_type}/sort")
async def sort_fields(
    entity_type: str,
    payload: FieldSortRequest,
    current_user: User = Depends(get_current_user),
):
    _check_entity(entity_type)
    items = [{"id": i.id, "sorting": i.sorting} for i in payload.items]
    n = await svc.sort_standard_fields(entity_type, items, current_user.tenant_id)
    return {"updated": n}


@router.post("/{entity_type}/status", response_model=StandardFieldResponse)
async def toggle_status(
    entity_type: str,
    payload: FieldStatusToggle,
    current_user: User = Depends(get_current_user),
):
    _check_entity(entity_type)
    obj = await svc.update_standard_field(
        payload.id,
        StandardFieldUpdate(is_active=payload.is_active),
        current_user.tenant_id,
    )
    return StandardFieldResponse.model_validate(obj, from_attributes=True)


@router.post("/{entity_type}/mandatory", response_model=StandardFieldResponse)
async def toggle_mandatory(
    entity_type: str,
    payload: FieldMandatoryToggle,
    current_user: User = Depends(get_current_user),
):
    _check_entity(entity_type)
    obj = await svc.update_standard_field(
        payload.id,
        StandardFieldUpdate(is_mandatory=payload.is_mandatory),
        current_user.tenant_id,
    )
    return StandardFieldResponse.model_validate(obj, from_attributes=True)
