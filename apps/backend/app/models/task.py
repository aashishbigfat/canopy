"""
Task model with polymorphic relationships - Can belong to Account, Contact, Lead, or Opportunity
"""
from beanie import Indexed
from pydantic import Field
from typing import Optional
from beanie import PydanticObjectId
from datetime import datetime, date
from app.models.base import BaseDocument

class Task(BaseDocument):
    """Task model for CRM task management"""
    
    # Basic Information
    name: str = "Untitled Task"
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    
    # Status & Priority
    status: str = "Not Started"  # Not Started, In Progress, Completed, Deferred
    priority: str = "Normal"  # Low, Normal, High, Urgent
    
    # Polymorphic relationship (taskable)
    taskable_type: Optional[str] = None  # "Account", "Contact", "Lead", "Opportunity"
    taskable_id: Optional[PydanticObjectId] = None
    
    # Direct relationships
    contact_id: Optional[PydanticObjectId] = None
    account_id: Optional[PydanticObjectId] = None
    
    # Assignment
    assigned_user_id: Optional[PydanticObjectId] = None
    owner_id: Optional[PydanticObjectId] = None
    
    # Tenant & Audit
    tenant_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None
    
    # Completion
    completed_at: Optional[datetime] = None
    completed_by: Optional[PydanticObjectId] = None
    
    # Metadata
    view_count: int = 0
    
    class Settings:
        name = "tasks"
        # indexes = [
        # "tenant_id",
        # "assigned_user_id",
        # "owner_id",
        # "status",
        # "due_date",
        # [("tenant_id", 1), ("assigned_user_id", 1)],
            # [("tenant_id", 1), ("status", 1)],
            # [("tenant_id", 1), ("due_date", 1)],
            # [("taskable_type", 1), ("taskable_id", 1)],
        # ]
    
    async def get_assigned_user(self):
        """Get assigned user, scoped to this task's tenant."""
        from app.models.user import User
        return await User.find_one(
            {"_id": self.assigned_user_id, "tenant_id": self.tenant_id, "deleted_at": None}
        )

    async def get_taskable(self):
        """Get the related entity (polymorphic), scoped to this task's tenant."""
        if not self.taskable_type or not self.taskable_id:
            return None

        common = {"_id": self.taskable_id, "tenant_id": self.tenant_id, "deleted_at": None}

        if self.taskable_type == "Account":
            from app.models.account import Account
            return await Account.find_one(common)
        elif self.taskable_type == "Contact":
            from app.models.contact import Contact
            return await Contact.find_one(common)
        elif self.taskable_type == "Lead":
            from app.models.lead import Lead
            return await Lead.find_one(common)
        elif self.taskable_type == "Opportunity":
            from app.models.opportunity import Opportunity
            return await Opportunity.find_one(common)

        return None
    
    async def mark_completed(self, user_id: PydanticObjectId):
        # """Mark task as completed"""
        self.status = "Completed"
        self.completed_at = datetime.utcnow()
        self.completed_by = user_id
        await self.save()
    
    async def increment_view_count(self):
        # """Increment view count"""
        self.view_count += 1
        await self.save()
