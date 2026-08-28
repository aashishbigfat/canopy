"""
Destination API endpoints — Travel-industry module.

All routes are guarded by ``require_module("destinations")`` so only tenants
with the destinations module enabled can access them.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.models.user import User
from app.schemas.destination import (
    DestinationCreate, DestinationUpdate, DestinationResponse,
    DestinationDetailResponse, DestinationListResponse, DestinationLinkRequest
)
from app.services.destination_service import DestinationService
from app.api.deps import get_current_user, check_permission
from app.middleware.industry_guard import require_module

router = APIRouter(dependencies=[Depends(require_module("destinations"))])


@router.post("/", response_model=DestinationDetailResponse, status_code=201)
async def create_destination(
    destination_data: DestinationCreate,
    current_user: User = Depends(check_permission("create_destination"))
):
    """Create a new destination"""
    service = DestinationService()
    
    try:
        destination = await service.create_destination(
            destination_data,
            current_user.id,
            current_user.tenant_id
        )
        
        # Get with counts
        result = await service.get_destination_with_counts(
            str(destination.id),
            current_user.tenant_id
        )
        
        return DestinationDetailResponse(
            **DestinationResponse.from_orm(result["destination"]).model_dump(),
            opportunity_count=result["opportunity_count"],
            lead_count=result["lead_count"],
            itinerary_count=result["itinerary_count"]
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=DestinationListResponse)
async def get_destinations(
    country_id: Optional[str] = None,
    is_popular: Optional[bool] = None,
    is_active: Optional[bool] = None,
    destination_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(check_permission("view_destination"))
):
    """Get all destinations with filters"""
    service = DestinationService()
    
    destinations = await service.get_destinations_by_tenant(
        current_user.tenant_id,
        country_id=country_id,
        is_popular=is_popular,
        is_active=is_active,
        destination_type=destination_type,
        skip=skip,
        limit=limit
    )
    
    return DestinationListResponse(
        destinations=[DestinationResponse.from_orm(d) for d in destinations],
        total=len(destinations)
    )


@router.get("/search")
async def search_destinations(
    query: str,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(check_permission("view_destination"))
):
    """Search destinations"""
    service = DestinationService()
    
    destinations = await service.search_destinations(
        query,
        current_user.tenant_id,
        skip=skip,
        limit=limit
    )
    
    return {
        "destinations": [DestinationResponse.from_orm(d) for d in destinations],
        "total": len(destinations)
    }


@router.get("/popular")
async def get_popular_destinations(
    limit: int = 10,
    current_user: User = Depends(check_permission("view_destination"))
):
    """Get popular destinations"""
    service = DestinationService()
    
    destinations = await service.get_popular_destinations(
        current_user.tenant_id,
        limit=limit
    )
    
    return {
        "destinations": [DestinationResponse.from_orm(d) for d in destinations],
        "total": len(destinations)
    }


@router.get("/country/{country_id}")
async def get_destinations_by_country(
    country_id: str,
    current_user: User = Depends(check_permission("view_destination"))
):
    """Get all destinations for a country"""
    service = DestinationService()
    
    destinations = await service.get_destinations_by_country(
        country_id,
        current_user.tenant_id
    )
    
    return {
        "destinations": [DestinationResponse.from_orm(d) for d in destinations],
        "total": len(destinations)
    }


@router.get("/{destination_id}", response_model=DestinationDetailResponse)
async def get_destination(
    destination_id: str,
    current_user: User = Depends(check_permission("view_destination"))
):
    """Get destination by ID with counts"""
    service = DestinationService()
    
    result = await service.get_destination_with_counts(
        destination_id,
        current_user.tenant_id
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Destination not found")
    
    return DestinationDetailResponse(
        **DestinationResponse.from_orm(result["destination"]).model_dump(),
        opportunity_count=result["opportunity_count"],
        lead_count=result["lead_count"],
        itinerary_count=result["itinerary_count"]
    )


@router.put("/{destination_id}", response_model=DestinationResponse)
async def update_destination(
    destination_id: str,
    destination_data: DestinationUpdate,
    current_user: User = Depends(check_permission("edit_destination"))
):
    """Update a destination"""
    service = DestinationService()
    
    try:
        destination = await service.update_destination(
            destination_id,
            destination_data,
            current_user.id,
            current_user.tenant_id
        )
        
        if not destination:
            raise HTTPException(status_code=404, detail="Destination not found")
        
        return DestinationResponse.from_orm(destination)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{destination_id}")
async def delete_destination(
    destination_id: str,
    current_user: User = Depends(check_permission("delete_destination"))
):
    """Delete a destination (soft delete)"""
    service = DestinationService()
    
    success = await service.delete_destination(destination_id, current_user.tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Destination not found")
    
    return {
        "error": False,
        "message": "Destination deleted successfully"
    }


@router.post("/opportunity/{opportunity_id}/link")
async def link_destination_to_opportunity(
    opportunity_id: str,
    link_data: DestinationLinkRequest,
    current_user: User = Depends(check_permission("edit_opportunity"))
):
    """Link destination to opportunity"""
    service = DestinationService()
    
    try:
        await service.link_to_opportunity(
            link_data.destination_id,
            opportunity_id,
            current_user.tenant_id,
            link_data
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return {
        "error": False,
        "message": "Destination linked to opportunity successfully"
    }


@router.delete("/opportunity/{opportunity_id}/unlink")
async def unlink_destination_from_opportunity(
    opportunity_id: str,
    destination_id: str = Query(...),
    current_user: User = Depends(check_permission("edit_opportunity"))
):
    """Unlink destination from opportunity"""
    service = DestinationService()
    
    success = await service.unlink_from_opportunity(destination_id, opportunity_id, current_user.tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Link not found")
    
    return {
        "error": False,
        "message": "Destination unlinked from opportunity successfully"
    }


@router.get("/opportunity/{opportunity_id}")
async def get_opportunity_destinations(
    opportunity_id: str,
    current_user: User = Depends(check_permission("view_opportunity"))
):
    """Get all destinations for an opportunity"""
    service = DestinationService()
    
    destinations = await service.get_destinations_for_opportunity(
        opportunity_id,
        current_user.tenant_id
    )
    
    return {
        "destinations": [
            {
                "destination": DestinationResponse.from_orm(d["destination"]),
                "is_primary": d["is_primary"],
                "notes": d["notes"]
            }
            for d in destinations
        ],
        "total": len(destinations)
    }


@router.post("/lead/{lead_id}/link")
async def link_destination_to_lead(
    lead_id: str,
    link_data: DestinationLinkRequest,
    current_user: User = Depends(check_permission("edit_lead"))
):
    """Link destination to lead"""
    service = DestinationService()
    
    try:
        await service.link_to_lead(
            link_data.destination_id,
            lead_id,
            current_user.tenant_id,
            link_data
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return {
        "error": False,
        "message": "Destination linked to lead successfully"
    }


@router.delete("/lead/{lead_id}/unlink")
async def unlink_destination_from_lead(
    lead_id: str,
    destination_id: str = Query(...),
    current_user: User = Depends(check_permission("edit_lead"))
):
    """Unlink destination from lead"""
    service = DestinationService()
    
    success = await service.unlink_from_lead(destination_id, lead_id, current_user.tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Link not found")
    
    return {
        "error": False,
        "message": "Destination unlinked from lead successfully"
    }


@router.get("/lead/{lead_id}")
async def get_lead_destinations(
    lead_id: str,
    current_user: User = Depends(check_permission("view_lead"))
):
    """Get all destinations for a lead"""
    service = DestinationService()
    
    destinations = await service.get_destinations_for_lead(
        lead_id,
        current_user.tenant_id
    )
    
    return {
        "destinations": [
            {
                "destination": DestinationResponse.from_orm(d["destination"]),
                "is_primary": d["is_primary"],
                "notes": d["notes"]
            }
            for d in destinations
        ],
        "total": len(destinations)
    }
