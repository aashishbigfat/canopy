"""
Pydantic schemas for Contact API
"""
from pydantic import BaseModel, EmailStr, Field, BeforeValidator
from typing import Optional, Dict, List, Any, Annotated
from datetime import datetime
from app.core.validators import PHONE_REGEX, PHONE_REGEX_MESSAGE, ZIP_REGEX, ZIP_REGEX_MESSAGE

class ContactBase(BaseModel):
    """Base schema for Contact"""
    salutation: Optional[str] = None
    first_name: str = Field(..., min_length=2, max_length=100)
    middle_name: Optional[str] = None
    last_name: str = Field(..., min_length=2, max_length=100)
    
    email: Annotated[Optional[EmailStr], BeforeValidator(lambda v: v if v else None)] = None
    phone: Annotated[Optional[str], BeforeValidator(lambda v: v if v else None), Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)] = None
    mobile: Annotated[Optional[str], BeforeValidator(lambda v: v if v else None), Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)] = None
    fax: Optional[str] = None
    
    title: Optional[str] = None
    department: Optional[str] = None
    
    mailing_street: Optional[str] = None
    mailing_city: Optional[str] = None
    mailing_state: Optional[str] = None
    mailing_zip: Annotated[Optional[str], BeforeValidator(lambda v: v if v else None), Field(None, pattern=ZIP_REGEX, description=ZIP_REGEX_MESSAGE)] = None
    mailing_country: Optional[str] = None
    
    other_street: Optional[str] = None
    other_city: Optional[str] = None
    other_state: Optional[str] = None
    other_zip: Annotated[Optional[str], BeforeValidator(lambda v: v if v else None), Field(None, pattern=ZIP_REGEX, description=ZIP_REGEX_MESSAGE)] = None
    other_country: Optional[str] = None
    
    description: Optional[str] = None
    assistant: Optional[str] = None
    assistant_phone: Annotated[Optional[str], BeforeValidator(lambda v: v if v else None), Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)] = None
    
    account_id: Optional[str] = None


class ContactCreate(ContactBase):
    """Schema for creating a contact"""
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ContactUpdate(BaseModel):
    """Schema for updating a contact"""
    salutation: Optional[str] = None
    first_name: Optional[str] = Field(None, min_length=2, max_length=100)
    middle_name: Optional[str] = None
    last_name: Optional[str] = Field(None, min_length=2, max_length=100)
    
    email: Annotated[Optional[EmailStr], BeforeValidator(lambda v: v if v else None)] = None
    phone: Annotated[Optional[str], BeforeValidator(lambda v: v if v else None), Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)] = None
    mobile: Annotated[Optional[str], BeforeValidator(lambda v: v if v else None), Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)] = None
    title: Optional[str] = None
    department: Optional[str] = None
    
    mailing_city: Optional[str] = None
    mailing_country: Optional[str] = None
    
    account_id: Optional[str] = None
    # account_name is NOT included — it is a read-only computed field from the
    # service layer and does not exist on the Contact document.
    custom_fields: Optional[Dict[str, Any]] = None


class ContactResponse(ContactBase):
    """Schema for contact response"""
    id: str
    tenant_id: str
    owner_id: str
    created_by: str
    last_modified_by_id: Optional[str] = None
    
    account_name: Optional[str] = None
    
    full_name: str
    view_count: int = 0
    is_favorite: bool = False
    
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    
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
