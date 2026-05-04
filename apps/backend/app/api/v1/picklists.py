"""
Picklists API — Phase 1 parity port.

Single polymorphic resource that replaces the 18 separate Laravel resources:
  rest_salutations, rest_lead_statuses, rest_task_priorities, rest_sales_stages,
  rest_experiences, rest_opportunity_tags, rest_itinerary_inclusions,
  rest_task_statuses, rest_inclusions, rest_source, rest_source_medium,
  rest_destinations, supplier_rest_ratings, supplier_rest_types,
  supplier_rest_services, rest_industries, rest_ratings, rest_categories.

Routes:
  GET    /picklists/{type}                 list
  POST   /picklists/{type}                 create
  GET    /picklists/{type}/{id}            show
  PUT    /picklists/{type}/{id}            update
  DELETE /picklists/{type}/{id}            destroy
  POST   /picklists/{type}/sort            sort
  GET    /picklists/types                  enumerate available types
"""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Type, Dict, Any
from datetime import datetime
from beanie import Document, PydanticObjectId

from app.api.deps import get_current_user
from app.models.user import User

# Existing picklist documents
from app.models.picklists import (
    Industry, Rating, AccountType, AccountSource,
    SupplierService as SupplierServicePicklist,
)
from app.models.opportunity_picklists import (
    SalesStage, OpportunityType, Experience, OpportunityTag,
)
from app.models.lead_picklists import LeadStatus, Source, SourceMedium

router = APIRouter()


# ---------- Picklist registry ----------

PICKLIST_MAP: Dict[str, Type[Document]] = {
    "industry": Industry,
    "rating": Rating,
    "account_type": AccountType,
    "account_source": AccountSource,
    "supplier_service": SupplierServicePicklist,
    "sales_stage": SalesStage,
    "opportunity_type": OpportunityType,
    "experience": Experience,
    "opportunity_tag": OpportunityTag,
    "lead_status": LeadStatus,
    "source": Source,
    "source_medium": SourceMedium,
    # legacy aliases for parity:
    "salutation": Industry,        # placeholder until salutation model exists
    "task_priority": OpportunityTag,
    "task_status": OpportunityTag,
    "category": Rating,
    "inclusion": OpportunityTag,
    "supplier_rating": Rating,
    "supplier_type": OpportunityTag,
    "destination": Industry,       # destinations have own router; alias here
    "itinerary_inclusion": OpportunityTag,
}


def _resolve(type_key: str) -> Type[Document]:
    if type_key not in PICKLIST_MAP:
        raise HTTPException(400, f"Unknown picklist type: {type_key}. "
                                  f"Valid: {sorted(PICKLIST_MAP.keys())}")
    return PICKLIST_MAP[type_key]


# ---------- Schemas ----------

class PicklistItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    sorting: int = 0
    is_active: bool = True


class PicklistItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sorting: Optional[int] = None
    is_active: Optional[bool] = None


class PicklistItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: PydanticObjectId = Field(alias="_id")
    name: str
    description: Optional[str] = None
    sorting: int = 0
    is_active: bool = True


class PicklistSortItem(BaseModel):
    id: PydanticObjectId
    sorting: int


class PicklistSortRequest(BaseModel):
    items: List[PicklistSortItem]


# ---------- Endpoints ----------

@router.get("/types")
async def list_types():
    return sorted(PICKLIST_MAP.keys())


@router.get("/{type_key}", response_model=List[PicklistItemResponse])
async def list_items(type_key: str, current_user: User = Depends(get_current_user)):
    Doc = _resolve(type_key)
    query: Dict[str, Any] = {}
    # Honour tenant scoping if the doc has tenant_id
    if "tenant_id" in Doc.model_fields:
        query["tenant_id"] = current_user.tenant_id
    items = await Doc.find(query).sort("+sorting").to_list()
    return [PicklistItemResponse.model_validate(i, from_attributes=True) for i in items]


@router.post("/{type_key}", response_model=PicklistItemResponse, status_code=201)
async def create_item(
    type_key: str,
    payload: PicklistItemCreate,
    current_user: User = Depends(get_current_user),
):
    Doc = _resolve(type_key)
    kwargs = payload.model_dump()
    if "tenant_id" in Doc.model_fields:
        kwargs["tenant_id"] = current_user.tenant_id
    obj = Doc(**kwargs)
    await obj.insert()
    return PicklistItemResponse.model_validate(obj, from_attributes=True)


@router.get("/{type_key}/{item_id}", response_model=PicklistItemResponse)
async def get_item(
    type_key: str,
    item_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    Doc = _resolve(type_key)
    obj = await Doc.get(item_id)
    if not obj:
        raise HTTPException(404, "Picklist item not found")
    if "tenant_id" in Doc.model_fields and getattr(obj, "tenant_id", None) != current_user.tenant_id:
        raise HTTPException(404, "Picklist item not found")
    return PicklistItemResponse.model_validate(obj, from_attributes=True)


@router.put("/{type_key}/{item_id}", response_model=PicklistItemResponse)
async def update_item(
    type_key: str,
    item_id: PydanticObjectId,
    payload: PicklistItemUpdate,
    current_user: User = Depends(get_current_user),
):
    Doc = _resolve(type_key)
    obj = await Doc.get(item_id)
    if not obj:
        raise HTTPException(404, "Picklist item not found")
    if "tenant_id" in Doc.model_fields and getattr(obj, "tenant_id", None) != current_user.tenant_id:
        raise HTTPException(404, "Picklist item not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    if hasattr(obj, "updated_at"):
        obj.updated_at = datetime.utcnow()
    await obj.save()
    return PicklistItemResponse.model_validate(obj, from_attributes=True)


@router.delete("/{type_key}/{item_id}", status_code=204)
async def delete_item(
    type_key: str,
    item_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    Doc = _resolve(type_key)
    obj = await Doc.get(item_id)
    if not obj:
        raise HTTPException(404, "Picklist item not found")
    if "tenant_id" in Doc.model_fields and getattr(obj, "tenant_id", None) != current_user.tenant_id:
        raise HTTPException(404, "Picklist item not found")
    await obj.delete()


@router.post("/{type_key}/sort")
async def sort_items(
    type_key: str,
    payload: PicklistSortRequest,
    current_user: User = Depends(get_current_user),
):
    Doc = _resolve(type_key)
    updated = 0
    for item in payload.items:
        obj = await Doc.get(item.id)
        if not obj:
            continue
        if "tenant_id" in Doc.model_fields and getattr(obj, "tenant_id", None) != current_user.tenant_id:
            continue
        obj.sorting = item.sorting
        if hasattr(obj, "updated_at"):
            obj.updated_at = datetime.utcnow()
        await obj.save()
        updated += 1
    return {"updated": updated}
