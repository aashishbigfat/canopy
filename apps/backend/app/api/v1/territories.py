"""
API endpoints for Regions and Territories.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_user, check_permission
from app.models.user import User
from app.services.territory_service import territory_service
from app.schemas.territory import (
    RegionCreate, RegionUpdate, RegionResponse, RegionListResponse,
    TerritoryCreate, TerritoryUpdate, TerritoryResponse, TerritoryListResponse,
    TerritoryAssignmentRequest, TerritoryAssignmentResponse
)

router = APIRouter()


# ==================== Regions ====================

@router.post("/regions", response_model=RegionResponse)
async def create_region(
    data: RegionCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new region."""
    region = await territory_service.create_region(
        data=data,
        user_id=str(current_user.id),
        tenant_id=str(current_user.tenant_id)
    )
    return RegionResponse(
        id=str(region.id),
        **region.model_dump(exclude={"id"})
    )


@router.get("/regions", response_model=RegionListResponse)
async def list_regions(
    parent_id: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """List regions."""
    regions, total = await territory_service.list_regions(
        tenant_id=current_user.tenant_id,
        parent_id=parent_id,
        is_active=is_active,
        search=search,
        page=page,
        per_page=per_page
    )
    return RegionListResponse(
        regions=[
            RegionResponse(id=str(r.id), **r.model_dump(exclude={"id"}))
            for r in regions
        ],
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/regions/{region_id}", response_model=RegionResponse)
async def get_region(
    region_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a region by ID."""
    region = await territory_service.get_region(region_id, current_user.tenant_id)
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
    return RegionResponse(
        id=str(region.id),
        **region.model_dump(exclude={"id"})
    )


@router.put("/regions/{region_id}", response_model=RegionResponse)
async def update_region(
    region_id: str,
    data: RegionUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a region."""
    region = await territory_service.update_region(
        region_id=region_id,
        data=data,
        tenant_id=current_user.tenant_id
    )
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
    return RegionResponse(
        id=str(region.id),
        **region.model_dump(exclude={"id"})
    )


@router.delete("/regions/{region_id}")
async def delete_region(
    region_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a region."""
    try:
        deleted = await territory_service.delete_region(region_id, current_user.tenant_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Region not found")
        return {"message": "Region deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== Territories ====================

@router.post("/territories", response_model=TerritoryResponse)
async def create_territory(
    data: TerritoryCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new territory."""
    try:
        territory = await territory_service.create_territory(
            data=data,
            user_id=str(current_user.id),
            tenant_id=current_user.tenant_id
        )
        return TerritoryResponse(
            id=str(territory.id),
            **territory.model_dump(exclude={"id"})
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/territories", response_model=TerritoryListResponse)
async def list_territories(
    region_id: Optional[str] = Query(None),
    parent_id: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """List territories."""
    territories, total = await territory_service.list_territories(
        tenant_id=current_user.tenant_id,
        region_id=region_id,
        parent_id=parent_id,
        user_id=user_id,
        search=search,
        page=page,
        per_page=per_page
    )
    
    # Enrich with region names for response
    response_list = []
    for t in territories:
        region = await territory_service.get_region(t.region_id, current_user.tenant_id)
        response_list.append(
            TerritoryResponse(
                id=str(t.id),
                region_name=region.name if region else None,
                **t.model_dump(exclude={"id"})
            )
        )
        
    return TerritoryListResponse(
        territories=response_list,
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/territories/check-assignment", response_model=TerritoryAssignmentResponse)
async def check_assignment(
    country: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    postal_code: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """Check territory assignment for an address."""
    assignment = await territory_service.find_territory_for_address(
        tenant_id=current_user.tenant_id,
        country=country,
        state=state,
        postal_code=postal_code
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="No matching territory found")
    return assignment


@router.get("/territories/{territory_id}", response_model=TerritoryResponse)
async def get_territory(
    territory_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a territory by ID."""
    territory = await territory_service.get_territory(territory_id, current_user.tenant_id)
    if not territory:
        raise HTTPException(status_code=404, detail="Territory not found")
        
    region = await territory_service.get_region(territory.region_id, current_user.tenant_id)
    
    return TerritoryResponse(
        id=str(territory.id),
        region_name=region.name if region else None,
        **territory.model_dump(exclude={"id"})
    )


@router.put("/territories/{territory_id}", response_model=TerritoryResponse)
async def update_territory(
    territory_id: str,
    data: TerritoryUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a territory."""
    territory = await territory_service.update_territory(
        territory_id=territory_id,
        data=data,
        tenant_id=current_user.tenant_id
    )
    if not territory:
        raise HTTPException(status_code=404, detail="Territory not found")
    return TerritoryResponse(
        id=str(territory.id),
        **territory.model_dump(exclude={"id"})
    )


@router.delete("/territories/{territory_id}")
async def delete_territory(
    territory_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a territory."""
    try:
        deleted = await territory_service.delete_territory(territory_id, current_user.tenant_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Territory not found")
        return {"message": "Territory deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
