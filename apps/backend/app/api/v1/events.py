"""
Event API endpoints - Calendar and scheduling
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timedelta

from app.models.user import User
from app.models.event import Event
from app.schemas.event import EventCreate, EventUpdate, EventResponse, EventListResponse
from app.services.event_service import EventService
from app.api.deps import get_current_user, check_permission

router = APIRouter()

@router.post("/", response_model=EventResponse, status_code=201)
async def create_event(
    event_data: EventCreate,
    current_user: User = Depends(check_permission("create_event"))
):
    """Create a new event"""
    service = EventService()
    event = await service.create_event(
        event_data,
        current_user.id,
        current_user.tenant_id
    )
    
    return EventResponse.from_orm(event)


@router.get("/", response_model=dict)
async def get_events(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    owner_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(check_permission("view_event"))
):
    """Get all events with pagination"""
    service = EventService()
    
    skip = (page - 1) * per_page
    owner_obj_id = ObjectId(owner_id) if owner_id else None
    
    events, total = await service.get_events_by_tenant(
        current_user.tenant_id,
        skip=skip,
        limit=per_page,
        owner_id=owner_obj_id,
        status=status
    )
    
    pages = (total + per_page - 1) // per_page
    
    # Get users for assignment
    users = await User.find(
        User.tenant_id == current_user.tenant_id,
        User.is_active == True
    ).sort("+name").to_list()
    
    return {
        "events": [EventResponse.from_orm(e) for e in events],
        "pagination": {
            "current_page": page,
            "total": total,
            "per_page": per_page,
            "pages": pages
        },
        "users": [
            {"id": str(u.id), "name": u.name, "email": u.email}
            for u in users
        ]
    }


@router.get("/upcoming")
async def get_upcoming_events(
    days: int = Query(7, ge=1, le=30),
    current_user: User = Depends(check_permission("view_event"))
):
    """Get upcoming events"""
    service = EventService()
    events = await service.get_upcoming_events(
        current_user.tenant_id,
        user_id=current_user.id,
        days=days
    )
    
    return {
        "events": [EventResponse.from_orm(e) for e in events],
        "total": len(events)
    }


@router.get("/calendar")
async def get_calendar_events(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    current_user: User = Depends(check_permission("view_event"))
):
    """Get events for calendar view (date range)"""
    service = EventService()
    events = await service.get_events_by_date_range(
        current_user.tenant_id,
        start_date,
        end_date,
        user_id=current_user.id
    )
    
    return {
        "events": [EventResponse.from_orm(e) for e in events],
        "total": len(events)
    }


@router.get("/entity/{eventable_type}/{eventable_id}")
async def get_events_by_entity(
    eventable_type: str,
    eventable_id: str,
    current_user: User = Depends(check_permission("view_event"))
):
    """Get all events for a specific entity"""
    service = EventService()
    events = await service.get_events_by_entity(
        eventable_type,
        eventable_id,
        current_user.tenant_id
    )
    
    return {
        "events": [EventResponse.from_orm(e) for e in events],
        "total": len(events)
    }


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: str,
    current_user: User = Depends(check_permission("view_event"))
):
    """Get event by ID"""
    service = EventService()
    event = await service.get_event(event_id, current_user.tenant_id)
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    await event.increment_view_count()
    
    return EventResponse.from_orm(event)


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: str,
    event_data: EventUpdate,
    current_user: User = Depends(check_permission("edit_event"))
):
    """Update an event"""
    service = EventService()
    event = await service.update_event(
        event_id,
        event_data,
        current_user.id,
        current_user.tenant_id
    )
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return EventResponse.from_orm(event)


@router.delete("/{event_id}")
async def delete_event(
    event_id: str,
    current_user: User = Depends(check_permission("delete_event"))
):
    """Delete an event (soft delete)"""
    service = EventService()
    success = await service.delete_event(event_id, current_user.tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return {
        "error": False,
        "message": "Event deleted successfully"
    }


@router.post("/{event_id}/mark-held")
async def mark_event_held(
    event_id: str,
    current_user: User = Depends(check_permission("edit_event"))
):
    """Mark event as held"""
    service = EventService()
    event = await service.mark_held(
        event_id,
        current_user.id,
        current_user.tenant_id
    )
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return {
        "error": False,
        "message": "Event marked as held",
        "event": EventResponse.from_orm(event)
    }
