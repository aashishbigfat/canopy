"""
Note model with polymorphic relationships - Notes for any entity
"""
from beanie import Indexed
from pydantic import Field
from typing import Optional
from beanie import PydanticObjectId
from datetime import datetime
from app.models.base import BaseDocument

class Note(BaseDocument):
    """Note model for adding notes to any entity"""
    
    # Basic Information
    title: Optional[str] = None
    content: str
    
    # Polymorphic relationship (noteable)
    noteable_type: Optional[str] = None  # "Account", "Contact", "Lead", "Opportunity"
    noteable_id: Optional[PydanticObjectId] = None
    
    # Ownership
    owner_id: Indexed(PydanticObjectId)
    
    # Tenant & Audit
    tenant_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None
    
    # Privacy
    is_private: bool = False  # Private notes only visible to owner
    
    # Metadata
    is_pinned: bool = False
    
    class Settings:
        name = "notes"
        # indexes = [
        # "tenant_id",
        # "owner_id",
        # [("tenant_id", 1), ("owner_id", 1)],
            # [("noteable_type", 1), ("noteable_id", 1)],
        # ]
    
    async def get_owner(self):
        # """Get note owner"""
        from app.models.user import User
        return await User.get(self.owner_id)
    
    async def get_noteable(self):
        # """Get the related entity (polymorphic)"""
        if not self.noteable_type or not self.noteable_id:
            return None
        
        if self.noteable_type == "Account":
            from app.models.account import Account
            return await Account.get(self.noteable_id)
        elif self.noteable_type == "Contact":
            from app.models.contact import Contact
            return await Contact.get(self.noteable_id)
        elif self.noteable_type == "Lead":
            from app.models.lead import Lead
            return await Lead.get(self.noteable_id)
        elif self.noteable_type == "Opportunity":
            from app.models.opportunity import Opportunity
            return await Opportunity.get(self.noteable_id)
        
        return None
