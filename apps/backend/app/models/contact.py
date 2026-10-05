"""
Contact model matching Laravel Contact
"""
from beanie import Indexed, before_event, Insert
from pydantic import EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from beanie import PydanticObjectId
from app.models.base import BaseDocument

class Contact(BaseDocument):
    """Contact model"""
    
    # Name fields
    salutation: Optional[str] = None  # Mr., Mrs., Ms., Dr., etc.
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    date_of_birth: Optional[datetime] = None

    # Contact Information
    email: Optional[Indexed(EmailStr)] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    fax: Optional[str] = None
    
    # Professional Information
    title: Optional[str] = None  # Job title
    department: Optional[str] = None
    
    # Address
    mailing_street: Optional[str] = None
    mailing_city: Optional[str] = None
    mailing_state: Optional[str] = None
    mailing_zip: Optional[str] = None
    mailing_country: Optional[str] = None
    
    other_street: Optional[str] = None
    other_city: Optional[str] = None
    other_state: Optional[str] = None
    other_zip: Optional[str] = None
    other_country: Optional[str] = None
    
    # Additional Info
    description: Optional[str] = None
    assistant: Optional[str] = None
    assistant_phone: Optional[str] = None
    
    # References
    tenant_id: Indexed(PydanticObjectId)
    owner_id: Indexed(PydanticObjectId)
    # Denormalized owner name (PERF, server-managed; not a form field).
    owner_name: Optional[str] = None
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None

    # Account relationship (primary account)
    account_id: Optional[Indexed(PydanticObjectId)] = None
    # Denormalized account name (PERF, server-managed; not a form field).
    account_name: Optional[str] = None
    
    # Custom Fields
    custom_fields: Dict[str, Any] = Field(default_factory=dict)
    
    # Industry-specific data (validated per-industry via validate_industry_data)
    industry_data: Dict[str, Any] = Field(default_factory=dict)
    
    # Metadata
    view_count: int = 0
    is_favorite: bool = False

    # BD multi-owner triple — resolved from mailing address.
    territory_id: Optional[PydanticObjectId] = None
    region_id: Optional[PydanticObjectId] = None
    bd_owner_id: Optional[PydanticObjectId] = None
    reporting_manager_id: Optional[PydanticObjectId] = None
    territory_match_source: Optional[str] = None
    territory_assigned_at: Optional[datetime] = None

    @before_event(Insert)
    async def _denormalize_names(self):
        """PERF: populate owner_name + account_name on create."""
        from app.services.denormalize import resolve_owner_name, resolve_account_name
        if self.owner_id and not self.owner_name:
            self.owner_name = await resolve_owner_name(self.tenant_id, self.owner_id)
        if self.account_id and not self.account_name:
            self.account_name = await resolve_account_name(self.tenant_id, self.account_id)

    class Settings:
        name = "contacts"
        indexes = [
            [("tenant_id", 1), ("deleted_at", 1), ("updated_at", -1)],
            [("tenant_id", 1), ("owner_id", 1)],
            [("tenant_id", 1), ("account_id", 1)],
        ]

    
    @property
    def full_name(self) -> str:
        # """Get full name"""
        parts = []
        if self.salutation:
            parts.append(self.salutation)
        if self.first_name:
            parts.append(self.first_name)
        if self.middle_name:
            parts.append(self.middle_name)
        if self.last_name:
            parts.append(self.last_name)
        return " ".join(parts)
    
    async def get_owner(self):
        """Get contact owner, scoped to this contact's tenant."""
        from app.models.user import User
        return await User.find_one(
            {"_id": self.owner_id, "tenant_id": self.tenant_id, "deleted_at": None}
        )

    async def get_account(self):
        """Get primary account, scoped to this contact's tenant."""
        if not self.account_id:
            return None
        from app.models.account import Account
        return await Account.find_one(
            {"_id": self.account_id, "tenant_id": self.tenant_id, "deleted_at": None}
        )
    
    async def get_accounts(self):
        """Get all associated accounts (many-to-many)"""
        from app.models.account import Account
        from app.models.account_contact import AccountContact
        
        pivots = await AccountContact.find(
            {"contact_id": self.id, "tenant_id": self.tenant_id}
        ).to_list()
        
        if not pivots:
            return []
            
        account_ids = [p.account_id for p in pivots]
        return await Account.find(
            {"_id": {"$in": account_ids}, "tenant_id": self.tenant_id, "deleted_at": None}
        ).to_list()
    
    async def get_opportunities(self):
        # """Get associated opportunities"""
        from app.models.opportunity import Opportunity
        
        return await Opportunity.find(
            {"contact_id": self.id, "tenant_id": self.tenant_id}
        ).to_list()
    
    async def increment_view_count(self):
        # """Increment view count"""
        self.view_count += 1
        await self.save()
