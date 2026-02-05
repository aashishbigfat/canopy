"""
Pydantic schemas for Account API requests and responses
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, List, Any
from datetime import datetime

class AccountBase(BaseModel):
    """Base schema for Account"""
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    
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
    
    # Classification
    acc_type_id: Optional[str] = None
    acc_parent_id: Optional[str] = None
    industry_id: Optional[str] = None
    rating_id: Optional[str] = None
    account_source_id: Optional[str] = None


class AccountCreate(AccountBase):
    """Schema for creating an account"""
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)


class AccountUpdate(BaseModel):
    """Schema for updating an account"""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    
    billing_street: Optional[str] = None
    billing_city: Optional[str] = None
    billing_state: Optional[str] = None
    billing_zip: Optional[str] = None
    billing_country: Optional[str] = None
    
    shipping_street: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_state: Optional[str] = None
    shipping_zip: Optional[str] = None
    shipping_country: Optional[str] = None
    
    acc_type_id: Optional[str] = None
    acc_parent_id: Optional[str] = None
    industry_id: Optional[str] = None
    rating_id: Optional[str] = None
    account_source_id: Optional[str] = None
    
    custom_fields: Optional[Dict[str, Any]] = None


class AccountResponse(AccountBase):
    """Schema for account response"""
    id: str
    tenant_id: str
    owner_id: str
    created_by: str
    last_modified_by_id: Optional[str] = None
    
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
    owner_name: Optional[str] = None
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
    
    class Config:
        from_attributes = True
