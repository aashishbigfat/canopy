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

# Consolidated picklist documents
from app.models.consolidated_picklists import (
    Industry, AccountType, AccountSource,
    SupplierServicePicklist, SalesStage, OpportunityType,
    Experience, OpportunityTag, LeadStatus, Source, SourceMedium,
    Salutation, TaskStatus, TaskPriority,
    Inclusion, ItineraryInclusion, SupplierType, DestinationPicklist,
)

router = APIRouter()


# ---------- Picklist registry ----------

PICKLIST_MAP: Dict[str, Type[Document]] = {
    "industry": Industry,
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
    "salutation": Salutation,
    "task_priority": TaskPriority,
    "task_status": TaskStatus,
    # Travel-specific picklists (each with own discriminator model):
    "inclusion": Inclusion,
    "supplier_type": SupplierType,
    "destination": DestinationPicklist,
    "itinerary_inclusion": ItineraryInclusion,
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
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: PydanticObjectId = Field(validation_alias="_id", serialization_alias="id")
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
async def list_items(
    type_key: str,
    active_only: bool = False,
    current_user: User = Depends(get_current_user),
):
    Doc = _resolve(type_key)
    # Multi-tenant + multi-industry SaaS architecture:
    # - Show platform defaults (tenant_id=None) FILTERED by tenant's industry
    # - Show tenant-specific overrides (tenant_id=current)
    # - picklist_type prevents cross-type contamination in shared collection
    if "tenant_id" in Doc.model_fields:
        from app.core.picklist_query import build_picklist_query
        from app.models.tenant import Tenant

        # Resolve tenant industry for proper scoping
        tenant = await Tenant.get(current_user.tenant_id)
        tenant_industry = tenant.industry if tenant else None

        query = build_picklist_query(
            current_user.tenant_id,
            industry=tenant_industry,
            active_only=active_only,
            picklist_type=type_key,
        )
    else:
        query = {"picklist_type": type_key}
        if active_only:
            query["is_active"] = True
    items = await Doc.find(query).sort("+sorting").to_list()

    # Tenant items shadow (override) platform defaults with the same name
    if "tenant_id" in Doc.model_fields:
        from app.core.picklist_query import dedup_picklist_items
        items = dedup_picklist_items(items)

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
    obj_tenant = getattr(obj, "tenant_id", None)
    # Allow reading platform defaults (tenant_id=None) + own tenant items
    if "tenant_id" in Doc.model_fields and obj_tenant is not None and obj_tenant != current_user.tenant_id:
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

    obj_tenant = getattr(obj, "tenant_id", None)

    # ── Copy-on-Write for platform defaults ──
    # Platform defaults (tenant_id=None) are shared across ALL tenants.
    # When a tenant wants to modify one (e.g. toggle is_active), we create
    # a tenant-specific clone instead of mutating the shared record.
    if "tenant_id" in Doc.model_fields and obj_tenant is None:
        update_data = payload.model_dump(exclude_none=True)

        # Check if a tenant-specific clone already exists for this name
        existing_clone = await Doc.find_one({
            "tenant_id": current_user.tenant_id,
            "picklist_type": type_key,
            "name": obj.name,
        })

        if existing_clone:
            # Update the existing clone
            for k, v in update_data.items():
                setattr(existing_clone, k, v)
            if hasattr(existing_clone, "updated_at"):
                existing_clone.updated_at = datetime.utcnow()
            await existing_clone.save()
            return PicklistItemResponse.model_validate(existing_clone, from_attributes=True)
        else:
            # Create a new tenant-specific clone from the platform default
            clone_data = {
                "name": obj.name,
                "description": getattr(obj, "description", None),
                "sorting": getattr(obj, "sorting", 0),
                "is_active": getattr(obj, "is_active", True),
                "tenant_id": current_user.tenant_id,
                "picklist_type": type_key,
            }
            # Copy optional fields if they exist
            for field in ["color", "industry"]:
                if hasattr(obj, field):
                    clone_data[field] = getattr(obj, field)
            # Apply the requested updates on top
            for k, v in update_data.items():
                clone_data[k] = v

            clone = Doc(**clone_data)
            await clone.insert()
            return PicklistItemResponse.model_validate(clone, from_attributes=True)

    # ── Direct update for tenant-owned items ──
    if obj_tenant != current_user.tenant_id:
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
    obj_tenant = getattr(obj, "tenant_id", None)
    # Cannot delete platform defaults; only tenant-owned items
    if obj_tenant is None:
        raise HTTPException(403, "Cannot delete platform default items. Toggle active status instead.")
    if obj_tenant != current_user.tenant_id:
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
        obj_tenant = getattr(obj, "tenant_id", None)
        # Skip platform defaults and other tenants' items
        if "tenant_id" in Doc.model_fields and obj_tenant is not None and obj_tenant != current_user.tenant_id:
            continue
        # For platform defaults, create clone with new sorting
        if obj_tenant is None:
            continue  # Platform defaults maintain their own sorting
        obj.sorting = item.sorting
        if hasattr(obj, "updated_at"):
            obj.updated_at = datetime.utcnow()
        await obj.save()
        updated += 1
    return {"updated": updated}
