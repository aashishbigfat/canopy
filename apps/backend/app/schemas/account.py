"""
Pydantic schemas for Account API requests and responses
"""
from pydantic import BaseModel, EmailStr, Field, HttpUrl, validator, BeforeValidator
from typing import Optional, Dict, List, Any, Annotated
from datetime import datetime
from app.core.validators import PHONE_REGEX, PHONE_REGEX_MESSAGE, ZIP_REGEX, ZIP_REGEX_MESSAGE
import re

def safe_phone_validator(v: Any) -> Optional[str]:
    if not v:
        return None
    if not re.match(PHONE_REGEX, str(v)):
        return None
    return str(v)

def safe_zip_validator(v: Any) -> Optional[str]:
    if not v:
        return None
    if not re.match(ZIP_REGEX, str(v)):
        return None
    return str(v)

class AccountBase(BaseModel):
    """Base schema for Account"""
    name: str = Field(..., min_length=2, max_length=255)
    email: Annotated[Optional[EmailStr], BeforeValidator(lambda v: v if v else None)] = None
    phone: Annotated[Optional[str], BeforeValidator(safe_phone_validator)] = Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)
    mobile: Annotated[Optional[str], BeforeValidator(safe_phone_validator)] = Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)
    website: Annotated[Optional[HttpUrl], BeforeValidator(lambda v: v if v else None)] = None
    description: Optional[str] = None
    is_person_account: bool = False
    
    # Person Account specific fields
    salutation: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    
    # Billing Address
    billing_street: Optional[str] = None
    billing_city: Optional[str] = None
    billing_state: Optional[str] = None
    billing_zip: Annotated[Optional[str], BeforeValidator(safe_zip_validator)] = Field(None, pattern=ZIP_REGEX, description=ZIP_REGEX_MESSAGE)
    billing_country: Optional[str] = None
    
    # Shipping Address
    shipping_street: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_state: Optional[str] = None
    shipping_zip: Annotated[Optional[str], BeforeValidator(safe_zip_validator)] = Field(None, pattern=ZIP_REGEX, description=ZIP_REGEX_MESSAGE)
    shipping_country: Optional[str] = None
    
    # Classification
    acc_type_id: Optional[str] = None
    acc_parent_id: Optional[str] = None
    industry_id: Optional[str] = None
    rating_id: Optional[str] = None
    account_source_id: Optional[str] = None
    owner_id: Optional[str] = None


class AccountCreate(AccountBase):
    """Schema for creating an account"""
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)


class AccountUpdate(BaseModel):
    """Schema for updating an account"""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Annotated[Optional[EmailStr], BeforeValidator(lambda v: v if v else None)] = None
    phone: Annotated[Optional[str], BeforeValidator(safe_phone_validator)] = Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)
    mobile: Annotated[Optional[str], BeforeValidator(safe_phone_validator)] = Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)
    website: Annotated[Optional[HttpUrl], BeforeValidator(lambda v: v if v else None)] = None
    description: Optional[str] = None
    
    # Person Account specific fields
    salutation: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    
    # Billing Address
    billing_street: Optional[str] = None
    billing_city: Optional[str] = None
    billing_state: Optional[str] = None
    billing_zip: Annotated[Optional[str], BeforeValidator(safe_zip_validator)] = Field(None, pattern=ZIP_REGEX, description=ZIP_REGEX_MESSAGE)
    billing_country: Optional[str] = None
    
    # Shipping Address
    shipping_street: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_state: Optional[str] = None
    shipping_zip: Annotated[Optional[str], BeforeValidator(safe_zip_validator)] = Field(None, pattern=ZIP_REGEX, description=ZIP_REGEX_MESSAGE)
    shipping_country: Optional[str] = None
    
    # Classification
    acc_type_id: Optional[str] = None
    acc_parent_id: Optional[str] = None
    industry_id: Optional[str] = None
    rating_id: Optional[str] = None
    account_source_id: Optional[str] = None
    owner_id: Optional[str] = None
    
    custom_fields: Optional[Dict[str, Any]] = None


class AccountResponse(AccountBase):
    """Schema for account response"""
    id: str
    tenant_id: str
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None
    created_by: str
    created_by_name: Optional[str] = None
    last_modified_by_id: Optional[str] = None
    last_modified_by_name: Optional[str] = None
    
    view_count: int = 0
    is_favorite: bool = False
    
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class AccountListResponse(BaseModel):
    """Schema for list of accounts"""
    accounts: List[AccountResponse]
    total: int
    page: int = 1
    per_page: int = 10
    pages: int


class AccountOwnerChange(BaseModel):
    """Schema for changing account owner"""
    new_owner_id: str
    reason: Optional[str] = None


class AccountSearch(BaseModel):
    """Schema for account search"""
    query: Optional[str] = None
    acc_type_id: Optional[str] = None
    industry_id: Optional[str] = None
    rating_id: Optional[str] = None
    owner_id: Optional[str] = None
    billing_country: Optional[str] = None
    billing_state: Optional[str] = None


class AccountDetailResponse(AccountResponse):
    """Schema for detailed account view with related records"""
    # Owner information
    owner_email: Optional[str] = None
    
    # Related records
    related_contacts: List[Dict[str, Any]] = Field(default_factory=list)
    related_opportunities: List[Dict[str, Any]] = Field(default_factory=list)
    related_tasks: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Metadata
    parent_account_name: Optional[str] = None
    account_type_name: Optional[str] = None
    industry_name: Optional[str] = None
    rating_name: Optional[str] = None
