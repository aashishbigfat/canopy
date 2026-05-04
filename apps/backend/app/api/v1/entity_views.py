"""
Phase 4 — Polymorphic entity views/columns/filters/pinned-views API.

Replaces per-entity Laravel resources (rest_account_views, rest_lead_views,
rest_*_columns, rest_*_filters, rest_pin_views_*, rest_unpin_views_*) with a
single resource keyed by entity_type.

Routes (all under /api/v1/entity_views):
  Views:
    GET    /views/{entity_type}
    POST   /views/{entity_type}
    GET    /views/{entity_type}/{view_id}
    PUT    /views/{entity_type}/{view_id}
    DELETE /views/{entity_type}/{view_id}
  Columns:
    GET    /columns/{entity_type}
    POST   /columns/{entity_type}                 (bulk replace + sort)
    PUT    /columns/{entity_type}/{column_id}
    DELETE /columns/{entity_type}/{column_id}
    POST   /columns/{entity_type}/sort
  Filters:
    GET    /filters/{entity_type}
    POST   /filters/{entity_type}
    DELETE /filters/{entity_type}/{filter_id}
  Pinned views:
    GET    /pinned/{entity_type}
    POST   /pinned/{entity_type}                  (pin)
    DELETE /pinned/{entity_type}/{view_id}        (unpin)
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List, Dict, Any
from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import get_current_user
from app.models.user import User
from app.models.entity_views import (
    EntityView, EntityColumn, EntityFilter, EntityPinView,
)

router = APIRouter()

VALID = {"account", "contact", "lead", "opportunity",
         "supplier", "personal_account", "task"}


def _check(entity_type: str) -> None:
    if entity_type not in VALID:
        raise HTTPException(400, f"Unknown entity_type: {entity_type}")


# ============== schemas ==============

class ViewIn(BaseModel):
    name: str
    description: Optional[str] = None
    filters: Dict[str, Any] = Field(default_factory=dict)
    sort_by: Optional[str] = None
    sort_dir: Optional[str] = "desc"
    is_public: bool = False
    is_default: bool = False


class ViewUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None
    sort_by: Optional[str] = None
    sort_dir: Optional[str] = None
    is_public: Optional[bool] = None
    is_default: Optional[bool] = None


class ColumnIn(BaseModel):
    field_key: str
    is_additional: bool = False
    label: str
    is_visible: bool = True
    is_editable: bool = False
    sorting: int = 0
    width: Optional[int] = None


class ColumnSortItem(BaseModel):
    id: PydanticObjectId
    sorting: int


class ColumnSortRequest(BaseModel):
    items: List[ColumnSortItem]


class FilterIn(BaseModel):
    name: Optional[str] = None
    expression: Dict[str, Any]


# ============== VIEWS ==============

@router.get("/views/{entity_type}")
async def list_views(entity_type: str, current_user: User = Depends(get_current_user)):
    _check(entity_type)
    rows = await EntityView.find(
        {"tenant_id": current_user.tenant_id, "entity_type": entity_type}
    ).to_list()
    own = [r for r in rows if r.created_by == current_user.id or r.is_public]
    return [r.model_dump() for r in own]


@router.post("/views/{entity_type}", status_code=201)
async def create_view(
    entity_type: str,
    payload: ViewIn,
    current_user: User = Depends(get_current_user),
):
    _check(entity_type)
    obj = EntityView(
        entity_type=entity_type,
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
        **payload.model_dump(),
    )
    await obj.insert()
    return obj.model_dump()


@router.get("/views/{entity_type}/{view_id}")
async def get_view(
    entity_type: str,
    view_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    _check(entity_type)
    obj = await EntityView.get(view_id)
    if (not obj or obj.tenant_id != current_user.tenant_id
            or obj.entity_type != entity_type):
        raise HTTPException(404, "View not found")
    return obj.model_dump()


@router.put("/views/{entity_type}/{view_id}")
async def update_view(
    entity_type: str,
    view_id: PydanticObjectId,
    payload: ViewUpdate,
    current_user: User = Depends(get_current_user),
):
    _check(entity_type)
    obj = await EntityView.get(view_id)
    if (not obj or obj.tenant_id != current_user.tenant_id
            or obj.entity_type != entity_type):
        raise HTTPException(404, "View not found")
    if obj.created_by != current_user.id:
        raise HTTPException(403, "Cannot edit another user's view")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


@router.delete("/views/{entity_type}/{view_id}", status_code=204)
async def delete_view(
    entity_type: str,
    view_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    _check(entity_type)
    obj = await EntityView.get(view_id)
    if (not obj or obj.tenant_id != current_user.tenant_id
            or obj.entity_type != entity_type):
        raise HTTPException(404, "View not found")
    if obj.created_by != current_user.id:
        raise HTTPException(403, "Cannot delete another user's view")
    # cascade unpin
    await EntityPinView.find(
        {"tenant_id": current_user.tenant_id, "view_id": view_id}
    ).delete()
    await obj.delete()


# ============== COLUMNS ==============

@router.get("/columns/{entity_type}")
async def list_columns(entity_type: str, current_user: User = Depends(get_current_user)):
    _check(entity_type)
    rows = await EntityColumn.find(
        {"tenant_id": current_user.tenant_id, "entity_type": entity_type}
    ).sort("+sorting").to_list()
    return [r.model_dump() for r in rows]


@router.post("/columns/{entity_type}", status_code=201)
async def create_column(
    entity_type: str,
    payload: ColumnIn,
    current_user: User = Depends(get_current_user),
):
    _check(entity_type)
    obj = EntityColumn(
        entity_type=entity_type,
        tenant_id=current_user.tenant_id,
        **payload.model_dump(),
    )
    await obj.insert()
    return obj.model_dump()


@router.put("/columns/{entity_type}/{column_id}")
async def update_column(
    entity_type: str,
    column_id: PydanticObjectId,
    payload: ColumnIn,
    current_user: User = Depends(get_current_user),
):
    _check(entity_type)
    obj = await EntityColumn.get(column_id)
    if (not obj or obj.tenant_id != current_user.tenant_id
            or obj.entity_type != entity_type):
        raise HTTPException(404, "Column not found")
    for k, v in payload.model_dump().items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


@router.delete("/columns/{entity_type}/{column_id}", status_code=204)
async def delete_column(
    entity_type: str,
    column_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    _check(entity_type)
    obj = await EntityColumn.get(column_id)
    if (not obj or obj.tenant_id != current_user.tenant_id
            or obj.entity_type != entity_type):
        raise HTTPException(404, "Column not found")
    await obj.delete()


@router.post("/columns/{entity_type}/sort")
async def sort_columns(
    entity_type: str,
    payload: ColumnSortRequest,
    current_user: User = Depends(get_current_user),
):
    _check(entity_type)
    updated = 0
    for item in payload.items:
        obj = await EntityColumn.get(item.id)
        if (obj and obj.tenant_id == current_user.tenant_id
                and obj.entity_type == entity_type):
            obj.sorting = item.sorting
            obj.updated_at = datetime.utcnow()
            await obj.save()
            updated += 1
    return {"updated": updated}


# ============== FILTERS ==============

@router.get("/filters/{entity_type}")
async def list_filters(entity_type: str, current_user: User = Depends(get_current_user)):
    _check(entity_type)
    rows = await EntityFilter.find(
        {"tenant_id": current_user.tenant_id, "entity_type": entity_type, "user_id": current_user.id}
    ).to_list()
    return [r.model_dump() for r in rows]


@router.post("/filters/{entity_type}", status_code=201)
async def save_filter(
    entity_type: str,
    payload: FilterIn,
    current_user: User = Depends(get_current_user),
):
    _check(entity_type)
    obj = EntityFilter(
        entity_type=entity_type,
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        name=payload.name,
        expression=payload.expression,
    )
    await obj.insert()
    return obj.model_dump()


@router.delete("/filters/{entity_type}/{filter_id}", status_code=204)
async def delete_filter(
    entity_type: str,
    filter_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    _check(entity_type)
    obj = await EntityFilter.get(filter_id)
    if (not obj or obj.tenant_id != current_user.tenant_id
            or obj.entity_type != entity_type
            or obj.user_id != current_user.id):
        raise HTTPException(404, "Filter not found")
    await obj.delete()


# ============== PINNED VIEWS ==============

class PinIn(BaseModel):
    view_id: PydanticObjectId


@router.get("/pinned/{entity_type}")
async def list_pinned(entity_type: str, current_user: User = Depends(get_current_user)):
    _check(entity_type)
    rows = await EntityPinView.find(
        {"tenant_id": current_user.tenant_id, "entity_type": entity_type, "user_id": current_user.id}
    ).sort("-pinned_at").to_list()
    return [r.model_dump() for r in rows]


@router.post("/pinned/{entity_type}", status_code=201)
async def pin_view(
    entity_type: str,
    payload: PinIn,
    current_user: User = Depends(get_current_user),
):
    _check(entity_type)
    # idempotent
    existing = await EntityPinView.find_one(
        {"tenant_id": current_user.tenant_id, "entity_type": entity_type, "user_id": current_user.id, "view_id": payload.view_id}
    )
    if existing:
        return existing.model_dump()
    obj = EntityPinView(
        entity_type=entity_type,
        view_id=payload.view_id,
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
    )
    await obj.insert()
    return obj.model_dump()


@router.delete("/pinned/{entity_type}/{view_id}", status_code=204)
async def unpin_view(
    entity_type: str,
    view_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    _check(entity_type)
    obj = await EntityPinView.find_one(
        {"tenant_id": current_user.tenant_id, "entity_type": entity_type, "user_id": current_user.id, "view_id": view_id}
    )
    if obj:
        await obj.delete()
