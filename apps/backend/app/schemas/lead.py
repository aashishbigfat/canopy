"""
Pydantic schemas for Lead API
"""
from pydantic import BaseModel, EmailStr, Field, BeforeValidator
from typing import Optional, Dict, List, Any, Union, Annotated
from datetime import datetime, date

class LeadBase(BaseModel):
    """Base schema for Lead"""
    salutation: Optional[str] = None
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    
    company: Optional[str] = None
    title: Optional[str] = None
    no_employees: Optional[int] = None
    website: Optional[str] = None
    
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    country: Optional[str] = None
    
    lead_status_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    industry_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    source_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    source_medium_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    experience_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    
    # New Fields
    source_medium: Optional[str] = None
    campaign_name: Optional[str] = None
    travel_date: Optional[str] = None
    no_of_nights: Optional[int] = Field(None, ge=1)
    no_of_pax: Optional[int] = Field(None, ge=1)
    ip_address: Optional[str] = None
    segment: Optional[str] = "B2C"
    is_fixed: Optional[bool] = False
    destinations: Optional[List[str]] = Field(default_factory=list)
    creation_type: Optional[str] = "manual"


class LeadCreate(LeadBase):
    """Schema for creating a lead"""
    destination_ids: Optional[List[str]] = Field(default_factory=list)
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)


class LeadUpdate(BaseModel):
    """Schema for updating a lead"""
    salutation: Optional[str] = None
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    no_employees: Optional[int] = None
    website: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    country: Optional[str] = None
    lead_status_id: Optional[str] = None
    industry_id: Optional[str] = None
    source_id: Optional[str] = None
    source_medium_id: Optional[str] = None
    experience_id: Optional[str] = None
    
    # New Fields
    source_medium: Optional[str] = None
    campaign_name: Optional[str] = None
    travel_date: Optional[str] = None
    no_of_nights: Optional[int] = Field(None, ge=1)
    no_of_pax: Optional[int] = Field(None, ge=1)
    ip_address: Optional[str] = None
    is_fixed: Optional[bool] = None
    destinations: Optional[List[str]] = None
    
    destination_ids: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None


class LeadResponse(BaseModel):
    """Schema for lead response - no ge constraints so old/legacy data doesn't fail serialization"""
    id: Annotated[str, BeforeValidator(str)]
    tenant_id: Annotated[str, BeforeValidator(str)]
    owner_id: Annotated[str, BeforeValidator(str)]
    created_by: Annotated[str, BeforeValidator(str)]

    salutation: Optional[str] = None
    first_name: str
    middle_name: Optional[str] = None
    last_name: str

    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None

    company: Optional[str] = None
    title: Optional[str] = None
    no_employees: Optional[int] = None
    website: Optional[str] = None

    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    country: Optional[str] = None

    lead_status_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    industry_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    source_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    source_medium_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    experience_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None

    # New Fields - no ge=1 constraint here so legacy negative values don't crash the response
    source_medium: Optional[str] = None
    campaign_name: Optional[str] = None
    travel_date: Optional[str] = None
    no_of_nights: Optional[int] = None
    no_of_pax: Optional[int] = None
    ip_address: Optional[str] = None
    segment: Optional[str] = "B2C"
    is_fixed: Optional[bool] = False
    destinations: Optional[List[str]] = Field(default_factory=list)
    creation_type: Optional[str] = "manual"

    full_name: str
    is_converted: bool = False
    opportunity_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    view_count: int = 0
    destination_ids: Optional[List[str]] = Field(default_factory=list, description="List of destination IDs")

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LeadConvert(BaseModel):
    """Schema for converting lead to account/contact/opportunity"""
    account_id: Optional[str] = None
    account_name: Optional[str] = None
    account_type: Optional[str] = "Account"  # "Account" or "Person Account"
    contact_id: Optional[str] = None
    contact_create: bool = True
    create_opportunity: bool = True
    opportunity_name: Optional[str] = None
    opportunity_amount: Optional[float] = None
    opportunity_close_date: Optional[Union[datetime, date]] = None
    
    # New Opportunity Fields
    travel_date: Optional[Union[datetime, date]] = None
    destination_ids: Optional[List[str]] = Field(default_factory=list)
    experience_id: Optional[str] = None
    no_of_adults: Optional[int] = None
    no_of_childs: Optional[int] = None
    no_of_infants: Optional[int] = None
    no_of_pax: Optional[int] = None
    sales_stage_id: Optional[str] = None
    no_of_nights: Optional[int] = None
    description: Optional[str] = None
    opportunity_owner_id: Optional[str] = None


class LeadListResponse(BaseModel):
    """Schema for list of leads with metadata"""
    leads: List[LeadResponse]
    pagination: Dict[str, Any]
    lead_statuses: List[Dict[str, Any]] = Field(default_factory=list)
    sources: List[Dict[str, Any]] = Field(default_factory=list)
    users: List[Dict[str, Any]] = Field(default_factory=list)
    industries: List[Dict[str, Any]] = Field(default_factory=list)
    ratings: List[Dict[str, Any]] = Field(default_factory=list)
