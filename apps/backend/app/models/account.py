from beanie import Indexed
from pydantic import EmailStr, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from beanie import PydanticObjectId
from app.models.base import BaseDocument

class Account(BaseDocument):
    """Account model matching Laravel Account"""
    
    # Basic Information
    name: Indexed(str)
    email: Optional[Indexed(EmailStr)] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    is_person_account: bool = False
    segment: Optional[str] = None  # B2C, B2B, B2B_DIRECT
    
    # Person Account specific fields
    salutation: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    
    # Billing Address
    billing_street: Optional[str] = None
    billing_city: Optional[str] = None
    billing_state: Optional[str] = None
    billing_zip: Optional[str] = None
    billing_country: Optional[str] = None
    
    # Shipping Address
    shipping_street: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_state: Optional[str] = None
    shipping_zip: Optional[str] = None
    shipping_country: Optional[str] = None
    
    # References
    tenant_id: Indexed(PydanticObjectId)
    owner_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None
    
    # Account Classification
    acc_type_id: Optional[PydanticObjectId] = None
    acc_parent_id: Optional[PydanticObjectId] = None  # For parent-child accounts
    industry_id: Optional[PydanticObjectId] = None
    
    # Custom Fields (flexible schema for MongoDB)
    custom_fields: Dict[str, Any] = Field(default_factory=dict)
    
    # Industry-specific data (validated per-industry via validate_industry_data)
    industry_data: Dict[str, Any] = Field(default_factory=dict)
    
    # Metadata
    view_count: int = 0
    is_favorite: bool = False
    
    # Territory (legacy fields)
    territory_state_id: Optional[PydanticObjectId] = None
    territory_country_id: Optional[PydanticObjectId] = None

    # BD multi-owner triple — auto-resolved from billing address. See
    # bd_assignment_service.resolve_for_address().
    territory_id: Optional[PydanticObjectId] = None
    region_id: Optional[PydanticObjectId] = None
    bd_owner_id: Optional[PydanticObjectId] = None
    reporting_manager_id: Optional[PydanticObjectId] = None
    territory_match_source: Optional[str] = None
    territory_assigned_at: Optional[datetime] = None
    
    @field_validator(
        "acc_type_id", "acc_parent_id", "industry_id",
        "territory_state_id", "territory_country_id",
        "last_modified_by_id",
        mode="before"
    )
    @classmethod
    def empty_string_to_none(cls, v):
        if v == "":
            return None
        return v
    
    class Settings:
        name = "accounts"
        indexes = [
            [("tenant_id", 1), ("deleted_at", 1), ("updated_at", -1)],
            [("tenant_id", 1), ("owner_id", 1)],
            [("tenant_id", 1), ("is_person_account", 1), ("deleted_at", 1)],
            [("tenant_id", 1), ("name", 1)],
        ]

    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Acme Corporation",
                "email": "contact@acme.com",
                "phone": "+1234567890",
                "website": "https://acme.com",
                "billing_city": "New York",
                "billing_country": "USA"
            }
        }
    
    # Helper methods for relationships (will be used in services)
    async def get_owner(self):
        """Get account owner, scoped to this account's tenant."""
        from app.models.user import User
        return await User.find_one(
            {"_id": self.owner_id, "tenant_id": self.tenant_id, "deleted_at": None}
        )

    async def get_parent(self):
        """Get parent account, scoped to this account's tenant."""
        if not self.acc_parent_id:
            return None
        return await Account.find_one(
            {"_id": self.acc_parent_id, "tenant_id": self.tenant_id, "deleted_at": None}
        )
    
    async def get_children(self):
        """Get child accounts"""
        return await Account.find(
            {"acc_parent_id": self.id, "tenant_id": self.tenant_id, "deleted_at": None}
        ).to_list()
    
    async def get_contacts(self):
        """Get associated contacts"""
        from app.models.contact import Contact
        from app.models.account_contact import AccountContact
        
        # Get contact IDs from pivot collection
        pivots = await AccountContact.find(
            {"account_id": self.id, "tenant_id": self.tenant_id}
        ).to_list()
        
        if not pivots:
            return []
            
        contact_ids = [p.contact_id for p in pivots]
        return await Contact.find(
            {"_id": {"$in": contact_ids}, "tenant_id": self.tenant_id, "deleted_at": None}
        ).to_list()
    
    async def get_opportunities(self):
        """Get associated opportunities"""
        from app.models.opportunity import Opportunity
        
        return await Opportunity.find(
            {"account_id": self.id, "tenant_id": self.tenant_id}
        ).to_list()
    
    async def get_tasks(self):
        """Get associated tasks (polymorphic)"""
        from app.models.task import Task
        
        return await Task.find(
            {"taskable_type": "Account", "taskable_id": self.id, "tenant_id": self.tenant_id}
        ).to_list()
    
    async def increment_view_count(self):
        """Increment view count"""
        self.view_count += 1
        await self.save()
