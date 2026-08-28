"""
Itinerary API endpoints — Travel-industry module.

All routes are guarded by ``require_module("itineraries")`` so only tenants
with the itineraries module enabled can access them.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.models.user import User
from app.schemas.itinerary import (
    ItineraryCreate, ItineraryUpdate, ItineraryResponse,
    ItineraryDetailResponse, ItineraryListResponse,
    ItineraryDayResponse, ItineraryDayCreate
)
from app.services.itinerary_service import ItineraryService
from app.api.deps import get_current_user, check_permission
from app.middleware.industry_guard import require_module

router = APIRouter(dependencies=[Depends(require_module("itineraries"))])

@router.post("/", response_model=ItineraryDetailResponse, status_code=201)
async def create_itinerary(
    itinerary_data: ItineraryCreate,
    current_user: User = Depends(check_permission("create_itinerary"))
):
    """Create a new itinerary with days"""
    service = ItineraryService()
    itinerary = await service.create_itinerary(
        itinerary_data,
        current_user.id,
        current_user.tenant_id
    )
    
    # Get with days
    result = await service.get_itinerary_with_days(
        str(itinerary.id),
        current_user.tenant_id
    )
    
    return ItineraryDetailResponse(
        **ItineraryResponse.from_orm(result["itinerary"]).model_dump(),
        days=[ItineraryDayResponse.from_orm(d) for d in result["days"]]
    )


@router.get("/", response_model=ItineraryListResponse)
async def get_itineraries(
    is_template: Optional[bool] = None,
    current_user: User = Depends(check_permission("view_itinerary"))
):
    """Get all itineraries"""
    service = ItineraryService()
    
    itineraries = await service.get_itineraries_by_tenant(
        current_user.tenant_id,
        is_template=is_template
    )
    
    return ItineraryListResponse(
        itineraries=[ItineraryResponse.from_orm(i) for i in itineraries],
        total=len(itineraries)
    )


@router.get("/{itinerary_id}", response_model=ItineraryDetailResponse)
async def get_itinerary(
    itinerary_id: str,
    current_user: User = Depends(check_permission("view_itinerary"))
):
    """Get itinerary by ID with all days"""
    service = ItineraryService()
    
    result = await service.get_itinerary_with_days(
        itinerary_id,
        current_user.tenant_id
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    
    return ItineraryDetailResponse(
        **ItineraryResponse.from_orm(result["itinerary"]).model_dump(),
        days=[ItineraryDayResponse.from_orm(d) for d in result["days"]]
    )


@router.put("/{itinerary_id}", response_model=ItineraryResponse)
async def update_itinerary(
    itinerary_id: str,
    itinerary_data: ItineraryUpdate,
    current_user: User = Depends(check_permission("edit_itinerary"))
):
    """Update an itinerary"""
    service = ItineraryService()
    
    itinerary = await service.update_itinerary(
        itinerary_id,
        itinerary_data,
        current_user.id,
        current_user.tenant_id
    )
    
    if not itinerary:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    
    return ItineraryResponse.from_orm(itinerary)


@router.delete("/{itinerary_id}")
async def delete_itinerary(
    itinerary_id: str,
    current_user: User = Depends(check_permission("delete_itinerary"))
):
    """Delete an itinerary (soft delete)"""
    service = ItineraryService()
    
    success = await service.delete_itinerary(itinerary_id, current_user.tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    
    return {
        "error": False,
        "message": "Itinerary deleted successfully"
    }


@router.post("/{itinerary_id}/days", response_model=ItineraryDayResponse, status_code=201)
async def add_itinerary_day(
    itinerary_id: str,
    day_data: ItineraryDayCreate,
    current_user: User = Depends(check_permission("edit_itinerary"))
):
    """Add a day to an itinerary"""
    service = ItineraryService()
    
    day = await service.create_itinerary_day(
        itinerary_id,
        day_data,
        current_user.tenant_id
    )
    
    return ItineraryDayResponse.from_orm(day)


@router.post("/opportunity/{opportunity_id}/link")
async def link_itinerary_to_opportunity(
    opportunity_id: str,
    itinerary_id: str = Query(...),
    notes: Optional[str] = None,
    current_user: User = Depends(check_permission("edit_opportunity"))
):
    """Link itinerary to opportunity"""
    service = ItineraryService()
    
    try:
        await service.link_to_opportunity(
            itinerary_id,
            opportunity_id,
            current_user.tenant_id,
            notes=notes
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return {
        "error": False,
        "message": "Itinerary linked to opportunity successfully"
    }


@router.delete("/opportunity/{opportunity_id}/unlink")
async def unlink_itinerary_from_opportunity(
    opportunity_id: str,
    itinerary_id: str = Query(...),
    current_user: User = Depends(check_permission("edit_opportunity"))
):
    """Unlink itinerary from opportunity"""
    service = ItineraryService()
    
    success = await service.unlink_from_opportunity(itinerary_id, opportunity_id, current_user.tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Link not found")
    
    return {
        "error": False,
        "message": "Itinerary unlinked from opportunity successfully"
    }


@router.get("/opportunity/{opportunity_id}")
async def get_opportunity_itineraries(
    opportunity_id: str,
    current_user: User = Depends(check_permission("view_opportunity"))
):
    """Get all itineraries for an opportunity"""
    service = ItineraryService()
    
    itineraries = await service.get_itineraries_for_opportunity(
        opportunity_id,
        current_user.tenant_id
    )
    
    return {
        "itineraries": [
            {
                "itinerary": ItineraryResponse.from_orm(i["itinerary"]),
                "notes": i["notes"]
            }
            for i in itineraries
        ],
        "total": len(itineraries)
    }
