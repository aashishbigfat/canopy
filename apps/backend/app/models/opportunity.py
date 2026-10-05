"""
Opportunity model - Industry-agnostic Sales Pipeline Management

Travel-specific fields (travel_date, no_of_pax, destination_ids, etc.) have been
migrated to the `industry_data` dict. All industries (including travel) now
store their metadata in `industry_data`.
"""
from beanie import Indexed, before_event, Insert
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
    # Denormalized account name (PERF, server-managed; not a form field).
    account_name: Optional[str] = None
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
    # Denormalized owner name (PERF, server-managed; not a form field).
    owner_name: Optional[str] = None
    operation_user_id: Optional[PydanticObjectId] = None
    team_member_ids: List[PydanticObjectId] = Field(default_factory=list)

    # BD multi-owner triple â€” auto-resolved from address (account billing fields
    # if account-linked, else lead address at conversion time). See
    # bd_assignment_service.resolve_for_address().
    territory_id: Optional[PydanticObjectId] = None
    region_id: Optional[PydanticObjectId] = None
    bd_owner_id: Optional[PydanticObjectId] = None
    reporting_manager_id: Optional[PydanticObjectId] = None
    territory_match_source: Optional[str] = None  # postal_code|postal_code_pattern|state|country|manual
    territory_assigned_at: Optional[datetime] = None
    
    # Tenant & Audit
    tenant_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None
    
    # Additional flags
    is_queue: bool = False
    key_deal: bool = False
    # Whether the deal has been verified by the linked account (parity with
    # reference CRM's "Verified by Account" flag shown on the opportunity).
    verified_by_account: bool = False
    segment: Optional[str] = "B2C"  # B2B or B2C
    # How the opportunity was created. User-settable ("Manual"/"Auto"); for
    # lead-converted opportunities the response always reports "Auto" (lead_id set).
    creation_type: Optional[str] = "Manual"
    
    # Financial year
    fyear: Optional[str] = None
    
    # Custom Fields
    custom_fields: Dict[str, Any] = Field(default_factory=dict)
    
    # Industry-specific data â€” ALL industries store metadata here.
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

    # Human-readable sequential display ID (per-tenant, zero-padded to 10 digits on frontend)
    opportunity_number: Optional[int] = None
    
    @before_event(Insert)
    async def _denormalize_names(self):
        """PERF: populate owner_name + account_name on create."""
        from app.services.denormalize import resolve_owner_name, resolve_account_name
        if self.owner_id and not self.owner_name:
            self.owner_name = await resolve_owner_name(self.tenant_id, self.owner_id)
        if self.account_id and not self.account_name:
            self.account_name = await resolve_account_name(self.tenant_id, self.account_id)

    class Settings:
        name = "opportunities"
        indexes = [
            [("tenant_id", 1), ("deleted_at", 1), ("created_at", -1)],
            [("tenant_id", 1), ("owner_id", 1)],
            [("tenant_id", 1), ("sales_stage_id", 1)],
            [("tenant_id", 1), ("close_date", 1)],
            [("tenant_id", 1), ("account_id", 1)],
            [("tenant_id", 1), ("contact_id", 1)],
            [("tenant_id", 1), ("opportunity_number", 1)],
        ]

    
    async def get_owner(self):
        """Get opportunity owner, scoped to this opportunity's tenant."""
        from app.models.user import User
        return await User.find_one(
            {"_id": self.owner_id, "tenant_id": self.tenant_id, "deleted_at": None}
        )

    async def get_account(self):
        """Get associated account, scoped to this opportunity's tenant."""
        if not self.account_id:
            return None
        from app.models.account import Account
        return await Account.find_one(
            {"_id": self.account_id, "tenant_id": self.tenant_id, "deleted_at": None}
        )

    async def get_contact(self):
        """Get associated contact, scoped to this opportunity's tenant."""
        if not self.contact_id:
            return None
        from app.models.contact import Contact
        return await Contact.find_one(
            {"_id": self.contact_id, "tenant_id": self.tenant_id, "deleted_at": None}
        )

    async def get_sales_stage(self):
        """Get current sales stage, scoped to this opportunity's tenant."""
        from app.models.opportunity_picklists import SalesStage
        return await SalesStage.find_one(
            {"_id": self.sales_stage_id, "tenant_id": self.tenant_id}
        )
    
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
