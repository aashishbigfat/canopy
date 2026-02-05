"""
Pydantic schemas for Lead API
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, List, Any, Union
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
    
    lead_status_id: Optional[str] = None
    rating_id: Optional[str] = None
    industry_id: Optional[str] = None
    source_id: Optional[str] = None
    source_medium_id: Optional[str] = None


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
    rating_id: Optional[str] = None
    industry_id: Optional[str] = None
    source_id: Optional[str] = None
    source_medium_id: Optional[str] = None
    destination_ids: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None


class LeadResponse(LeadBase):
    """Schema for lead response"""
    id: str
    tenant_id: str
    owner_id: str
    created_by: str
    
    full_name: str
    is_converted: bool = False
    opportunity_id: Optional[str] = None
    view_count: int = 0
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class LeadConvert(BaseModel):
    """Schema for converting lead to opportunity"""
    account_name: Optional[str] = None
    contact_create: bool = True
    opportunity_name: str
    opportunity_amount: Optional[float] = None
    opportunity_close_date: Optional[Union[datetime, date]] = None


class LeadListResponse(BaseModel):
    """Schema for list of leads"""
    leads: List[LeadResponse]
    total: int
    page: int = 1
    per_page: int = 10
    pages: int
