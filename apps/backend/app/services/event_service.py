"""
Event service layer - Business logic for calendar and event management
"""
from typing import List, Optional, Tuple
from bson import ObjectId
from datetime import datetime, timedelta
from app.models.event import Event
from app.schemas.event import EventCreate, EventUpdate

class EventService:
    """Service for Event business logic"""
    
    async def create_event(
        self,
        event_data: EventCreate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Event:
        """Create a new event"""
        
        event = Event(
            **event_data.model_dump(exclude_unset=True, exclude={'assigned_user_ids'}),
            tenant_id=tenant_id,
            owner_id=user_id,
            created_by=user_id
        )
        
        # Set assigned users
        if event_data.assigned_user_ids:
            event.assigned_user_ids = [ObjectId(u) for u in event_data.assigned_user_ids]
        
        await event.insert()
        return event
    
    async def get_event(self, event_id: str, tenant_id: ObjectId) -> Optional[Event]:
        """Get event by ID"""
        event = await Event.get(ObjectId(event_id))
        
        if event and event.tenant_id == tenant_id and not event.deleted_at:
            return event
        return None
    
    async def update_event(
        self,
        event_id: str,
        event_data: EventUpdate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Optional[Event]:
        """Update an event"""
        event = await self.get_event(event_id, tenant_id)
        
        if not event:
            return None
        
        # Update fields
        update_data = event_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(event, field, value)
        
        event.last_modified_by_id = user_id
        await event.save()
        
        return event
    
    async def delete_event(self, event_id: str, tenant_id: ObjectId) -> bool:
        """Soft delete an event"""
        event = await self.get_event(event_id, tenant_id)
        
        if not event:
            return False
        
        await event.soft_delete()
        return True
    
    async def get_events_by_tenant(
        self,
        tenant_id: ObjectId,
        skip: int = 0,
        limit: int = 10,
        owner_id: Optional[ObjectId] = None,
        status: Optional[str] = None
    ) -> Tuple[List[Event], int]:
        """Get events for a tenant with pagination"""
        
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None
        }
        
        if owner_id:
            query["owner_id"] = owner_id
        
        if status:
            query["status"] = status
        
        # Get total count
        total = await Event.find(query).count()
        
        # Get paginated results
        events = await Event.find(query)\
            .sort("-start_datetime")\
            .skip(skip)\
            .limit(limit)\
            .to_list()
        
        return events, total
    
    async def get_events_by_entity(
        self,
        eventable_type: str,
        eventable_id: str,
        tenant_id: ObjectId
    ) -> List[Event]:
        """Get all events for a specific entity"""
        events = await Event.find(
            Event.eventable_type == eventable_type,
            Event.eventable_id == ObjectId(eventable_id),
            Event.tenant_id == tenant_id,
            Event.deleted_at == None
        ).sort("-start_datetime").to_list()
        
        return events
    
    async def get_events_by_date_range(
        self,
        tenant_id: ObjectId,
        start_date: datetime,
        end_date: datetime,
        user_id: Optional[ObjectId] = None
    ) -> List[Event]:
        """Get events within a date range (for calendar view)"""
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None,
            "start_datetime": {"$gte": start_date, "$lte": end_date}
        }
        
        if user_id:
            query["owner_id"] = user_id
        
        events = await Event.find(query).sort("+start_datetime").to_list()
        return events
    
    async def get_upcoming_events(
        self,
        tenant_id: ObjectId,
        user_id: Optional[ObjectId] = None,
        days: int = 7
    ) -> List[Event]:
        """Get upcoming events"""
        now = datetime.utcnow()
        future = now + timedelta(days=days)
        
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None,
            "start_datetime": {"$gte": now, "$lte": future},
            "status": {"$ne": "Cancelled"}
        }
        
        if user_id:
            query["owner_id"] = user_id
        
        events = await Event.find(query).sort("+start_datetime").to_list()
        return events
    
    async def mark_held(
        self,
        event_id: str,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Optional[Event]:
        """Mark event as held"""
        event = await self.get_event(event_id, tenant_id)
        
        if not event:
            return None
        
        await event.mark_held(user_id)
        return event
