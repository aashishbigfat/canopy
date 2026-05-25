"""
Lead model - Industry-agnostic CRM Lead

Travel-specific fields (travel_date, no_of_pax, destinations, etc.) have been
migrated to the `industry_data` dict. All industries (including travel) now
store their metadata in `industry_data`, validated by the dispatcher in
schemas/industry_data/__init__.py.
"""
from beanie import Indexed
from pydantic import EmailStr, Field
from typing import Optional, List, Dict, Any, Annotated
from datetime import datetime
from beanie import PydanticObjectId
from app.models.base import BaseDocument

class Lead(BaseDocument):
    """Lead model for potential customers"""
    
    # Personal Information
    salutation: Optional[str] = None
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    
    # Contact Information
    email: Optional[Indexed(EmailStr)] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    
    # Company Information
    company: Optional[str] = None
    title: Optional[str] = None  # Job title
    no_employees: Optional[int] = None
    website: Optional[str] = None
    
    # Address
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    country: Optional[str] = None
    
    # Lead Classification
    lead_status_id: Optional[Indexed(PydanticObjectId)] = None
    industry_id: Annotated[Optional[PydanticObjectId], Indexed()] = None
    source_id: Annotated[Optional[PydanticObjectId], Indexed()] = None
    source_medium_id: Annotated[Optional[PydanticObjectId], Indexed()] = None
    
    # Universal CRM fields
    source_medium: Optional[str] = None
    campaign_name: Optional[str] = None
    ip_address: Optional[str] = None
    segment: Optional[str] = "B2C"  # Default to B2C
    creation_type: str = "manual"  # manual or auto
    
    # Conversion
    is_converted: bool = False
    opportunity_id: Optional[PydanticObjectId] = None  # If converted
    converted_at: Optional[datetime] = None
    
    # Tenant & Ownership
    tenant_id: Indexed(PydanticObjectId)
    owner_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None

    # BD multi-owner triple — auto-resolved from territory + role hierarchy.
    # See bd_assignment_service.resolve_for_address().
    territory_id: Optional[PydanticObjectId] = None
    region_id: Optional[PydanticObjectId] = None
    bd_owner_id: Optional[PydanticObjectId] = None
    reporting_manager_id: Optional[PydanticObjectId] = None
    territory_match_source: Optional[str] = None  # postal_code|postal_code_pattern|state|country|manual
    territory_assigned_at: Optional[datetime] = None
    # Flag driving Phase 9 automation rules (auto-create BD visit when set).
    requires_field_meeting: bool = False
    
    # Custom Fields
    custom_fields: Dict[str, Any] = Field(default_factory=dict)
    
    # Industry-specific data — ALL industries store metadata here.
    # Travel: travel_date, no_of_pax, destinations, destination_ids, etc.
    # Healthcare: patient_type, insurance_provider, etc.
    # Education: program_type, enrollment_period, etc.
    # Manufacturing: product_category, order_quantity, etc.
    industry_data: Dict[str, Any] = Field(default_factory=dict)
    
    # Metadata
    view_count: int = 0
    is_favorite: bool = False
    
    class Settings:
        name = "leads"
        indexes = [
            [("tenant_id", 1), ("deleted_at", 1), ("created_at", -1)],
            [("tenant_id", 1), ("owner_id", 1)],
            [("tenant_id", 1), ("is_converted", 1)],
            [("tenant_id", 1), ("lead_status_id", 1)],
            [("tenant_id", 1), ("bd_owner_id", 1)],
            [("tenant_id", 1), ("territory_id", 1)],
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
        """Get lead owner, scoped to this lead's tenant."""
        from app.models.user import User
        return await User.find_one(
            {"_id": self.owner_id, "tenant_id": self.tenant_id, "deleted_at": None}
        )

    async def get_opportunity(self):
        """Get converted opportunity, scoped to this lead's tenant."""
        if not self.opportunity_id:
            return None
        from app.models.opportunity import Opportunity
        return await Opportunity.find_one(
            {"_id": self.opportunity_id, "tenant_id": self.tenant_id, "deleted_at": None}
        )
    
    async def convert_to_opportunity(self, opportunity_id: PydanticObjectId):
        # """Mark lead as converted"""
        from datetime import datetime
        self.is_converted = True
        self.opportunity_id = opportunity_id
        self.converted_at = datetime.utcnow()
        await self.save()
    
    async def increment_view_count(self):
        # """Increment view count"""
        self.view_count += 1
        await self.save()
