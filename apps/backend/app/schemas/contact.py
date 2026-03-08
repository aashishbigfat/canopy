"""
Pydantic schemas for Contact API
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, List, Any
from datetime import datetime

class ContactBase(BaseModel):
    """Base schema for Contact"""
    salutation: Optional[str] = None
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    fax: Optional[str] = None
    
    title: Optional[str] = None
    department: Optional[str] = None
    
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
    
    description: Optional[str] = None
    assistant: Optional[str] = None
    assistant_phone: Optional[str] = None
    
    account_id: Optional[str] = None


class ContactCreate(ContactBase):
    """Schema for creating a contact"""
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ContactUpdate(BaseModel):
    """Schema for updating a contact"""
    salutation: Optional[str] = None
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    title: Optional[str] = None
    department: Optional[str] = None
    
    mailing_city: Optional[str] = None
    mailing_country: Optional[str] = None
    
    account_id: Optional[str] = None
    account_name: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None


class ContactResponse(ContactBase):
    """Schema for contact response"""
    id: str
    tenant_id: str
    owner_id: str
    created_by: str
    
    account_name: Optional[str] = None
    
    full_name: str
    view_count: int = 0
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ContactDetailResponse(ContactResponse):
    """Schema for detailed contact view with related records"""
    # Owner information
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    
    # Related records
    related_opportunities: List[Dict[str, Any]] = Field(default_factory=list)
    related_tasks: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Metadata
    account_type_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class ContactListResponse(BaseModel):
    """Schema for list of contacts"""
    contacts: List[ContactResponse]
    total: int
    page: int = 1
    per_page: int = 10
    pages: int
