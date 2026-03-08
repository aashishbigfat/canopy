"""
Lead model matching Laravel Lead
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
    
    # New Fields
    source_medium: Optional[str] = None
    campaign_name: Optional[str] = None
    travel_date: Optional[str] = None
    no_of_nights: Optional[int] = None
    no_of_adults: Optional[int] = None
    no_of_pax: Optional[int] = None
    no_of_childs: Optional[int] = None
    no_of_infants: Optional[int] = None
    ip_address: Optional[str] = None
    segment: Optional[str] = "B2C"  # Default to B2C
    is_fixed: bool = False
    destinations: List[str] = Field(default_factory=list)
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
    
    # Destinations (for travel CRM)
    destination_ids: List[PydanticObjectId] = Field(default_factory=list)
    experience_id: Optional[PydanticObjectId] = None
    
    # Custom Fields
    custom_fields: Dict[str, Any] = Field(default_factory=dict)
    
    # Metadata
    view_count: int = 0
    is_favorite: bool = False
    
    class Settings:
        name = "leads"
        # indexes = [
        # "tenant_id",
        # "owner_id",
        # "email",
        # "lead_status_id",
        # "is_converted",
        # [("tenant_id", 1), ("first_name", 1), ("last_name", 1)],
            # [("tenant_id", 1), ("owner_id", 1)],
            # [("tenant_id", 1), ("is_converted", 1)],
        # ]
    
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
        # """Get lead owner"""
        from app.models.user import User
        return await User.get(self.owner_id)
    
    async def get_opportunity(self):
        # """Get converted opportunity"""
        if self.opportunity_id:
            from app.models.opportunity import Opportunity
            return await Opportunity.get(self.opportunity_id)
        return None
    
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
