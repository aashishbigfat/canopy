"""
Event model with polymorphic relationships - Calendar and scheduling
"""
from beanie import Indexed
from pydantic import Field
from typing import Optional, List
from beanie import PydanticObjectId
from datetime import datetime
from app.models.base import BaseDocument

class Event(BaseDocument):
    """Event model for calendar and scheduling"""
    
    # Basic Information
    name: Indexed(str)
    description: Optional[str] = None
    location: Optional[str] = None
    
    # Timing
    start_datetime: datetime
    end_datetime: datetime
    all_day: bool = False
    
    # Event Type
    event_type: str = "Meeting"  # Meeting, Call, Email, Task, Other
    
    # Polymorphic relationship (eventable)
    eventable_type: Optional[str] = None  # "Account", "Contact", "Lead", "Opportunity"
    eventable_id: Optional[PydanticObjectId] = None
    
    # Direct relationships
    contact_id: Optional[PydanticObjectId] = None
    account_id: Optional[PydanticObjectId] = None
    
    # Participants
    assigned_user_ids: List[PydanticObjectId] = Field(default_factory=list)
    owner_id: Indexed(PydanticObjectId)
    
    # Reminders
    reminder_minutes: Optional[int] = None  # Minutes before event
    reminder_sent: bool = False
    
    # Status
    status: str = "Planned"  # Planned, Held, Not Held, Cancelled
    
    # Tenant & Audit
    tenant_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None
    
    # Metadata
    view_count: int = 0
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None
    
    class Settings:
        name = "events"
        # indexes = [
        # "tenant_id",
        # "owner_id",
        # "start_datetime",
        # "status",
        # [("tenant_id", 1), ("owner_id", 1)],
            # [("tenant_id", 1), ("start_datetime", 1)],
            # [("eventable_type", 1), ("eventable_id", 1)],
        # ]
    
    async def get_owner(self):
        """Get event owner, scoped to this event's tenant."""
        from app.models.user import User
        return await User.find_one(
            {"_id": self.owner_id, "tenant_id": self.tenant_id, "deleted_at": None}
        )

    async def get_eventable(self):
        """Get the related entity (polymorphic), scoped to this event's tenant."""
        if not self.eventable_type or not self.eventable_id:
            return None

        common = {"_id": self.eventable_id, "tenant_id": self.tenant_id, "deleted_at": None}

        if self.eventable_type == "Account":
            from app.models.account import Account
            return await Account.find_one(common)
        elif self.eventable_type == "Contact":
            from app.models.contact import Contact
            return await Contact.find_one(common)
        elif self.eventable_type == "Lead":
            from app.models.lead import Lead
            return await Lead.find_one(common)
        elif self.eventable_type == "Opportunity":
            from app.models.opportunity import Opportunity
            return await Opportunity.find_one(common)

        return None
    
    async def mark_held(self, user_id: PydanticObjectId):
        # """Mark event as held"""
        self.status = "Held"
        self.last_modified_by_id = user_id
        await self.save()
    
    async def increment_view_count(self):
        # """Increment view count"""
        self.view_count += 1
        await self.save()
