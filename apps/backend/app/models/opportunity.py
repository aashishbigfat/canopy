"""
Opportunity model - Industry-agnostic Sales Pipeline Management

Travel-specific fields (travel_date, no_of_pax, destination_ids, etc.) have been
migrated to the `industry_data` dict. All industries (including travel) now
store their metadata in `industry_data`.
"""
from beanie import Indexed
from pydantic import Field
from typing import Optional, List, Dict, Any
from beanie import PydanticObjectId
from datetime import datetime, date
from app.models.base import BaseDocument

class Opportunity(BaseDocument):
    """Opportunity model for sales pipeline"""
    
    # Basic Information
    name: Indexed(str)
    amount: Optional[float] = None
    description: Optional[str] = None
    close_date: Optional[datetime] = None
    
    # Sales Information
    sales_stage_id: Indexed(PydanticObjectId)
    probability: Optional[int] = 0  # 0-100
    
    # Relationships (polymorphic - can belong to Account or PersonalAccount)
    opportunitable_type: Optional[str] = None  # "Account" or "PersonalAccount"
    opportunitable_id: Optional[PydanticObjectId] = None  # Account or PersonalAccount ID
    
    # Direct relationships
    account_id: Optional[PydanticObjectId] = None  # For direct account link
    contact_id: Optional[PydanticObjectId] = None
    lead_id: Optional[PydanticObjectId] = None  # If converted from lead
    
    # Classification
    opportunity_type_id: Optional[PydanticObjectId] = None
    
    # Source tracking
    source_id: Optional[PydanticObjectId] = None
    source_medium_id: Optional[PydanticObjectId] = None
    source_url: Optional[str] = None
    
    # Close lost reason
    close_lost_reason: Optional[str] = None
    
    # Team & Operations
    owner_id: Indexed(PydanticObjectId)
    operation_user_id: Optional[PydanticObjectId] = None
    team_member_ids: List[PydanticObjectId] = Field(default_factory=list)
    
    # Tenant & Audit
    tenant_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None
    
    # Additional flags
    is_queue: bool = False
    key_deal: bool = False
    segment: Optional[str] = "B2C"  # B2B or B2C
    
    # Financial year
    fyear: Optional[str] = None
    
    # Custom Fields
    custom_fields: Dict[str, Any] = Field(default_factory=dict)
    
    # Industry-specific data — ALL industries store metadata here.
    # Travel: travel_date, no_of_pax, destination_ids, inclusions, etc.
    # Healthcare: treatment_type, insurance_id, etc.
    # Education: course_id, enrollment_date, etc.
    # Manufacturing: order_type, production_line, etc.
    industry_data: Dict[str, Any] = Field(default_factory=dict)
    
    # Metadata
    view_count: int = 0
    is_locked: bool = False
    locked_by: Optional[PydanticObjectId] = None
    locked_at: Optional[datetime] = None
    
    class Settings:
        name = "opportunities"
        indexes = [
            [("tenant_id", 1), ("deleted_at", 1), ("created_at", -1)],
            [("tenant_id", 1), ("owner_id", 1)],
            [("tenant_id", 1), ("sales_stage_id", 1)],
            [("tenant_id", 1), ("close_date", 1)],
            [("tenant_id", 1), ("account_id", 1)],
        ]

    
    async def get_owner(self):
        # """Get opportunity owner"""
        from app.models.user import User
        return await User.get(self.owner_id)
    
    async def get_account(self):
        # """Get associated account"""
        if self.account_id:
            from app.models.account import Account
            return await Account.get(self.account_id)
        return None
    
    async def get_contact(self):
        # """Get associated contact"""
        if self.contact_id:
            from app.models.contact import Contact
            return await Contact.get(self.contact_id)
        return None
    
    async def get_sales_stage(self):
        # """Get current sales stage"""
        from app.models.opportunity_picklists import SalesStage
        return await SalesStage.get(self.sales_stage_id)
    
    async def lock(self, user_id: PydanticObjectId):
        # """Lock opportunity for editing"""
        self.is_locked = True
        self.locked_by = user_id
        self.locked_at = datetime.utcnow()
        await self.save()
    
    async def unlock(self):
        # """Unlock opportunity"""
        self.is_locked = False
        self.locked_by = None
        self.locked_at = None
        await self.save()
    
    async def increment_view_count(self):
        # """Increment view count"""
        self.view_count += 1
        await self.save()
