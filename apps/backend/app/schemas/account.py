"""
Pydantic schemas for Account API requests and responses
"""
from pydantic import BaseModel, EmailStr, Field, HttpUrl, validator, BeforeValidator, model_validator
from typing import Optional, Dict, List, Any, Annotated
from datetime import datetime
from app.core.validators import PHONE_REGEX, PHONE_REGEX_MESSAGE, ZIP_REGEX, ZIP_REGEX_MESSAGE, strict_phone_validator
import re

NUMERIC_ZIP_REGEX = r"^\d{3,10}$"
NUMERIC_ZIP_REGEX_MESSAGE = "Invalid Zip/Postal code format. Must be numeric."

def safe_phone_validator(v: Any) -> Optional[str]:
    if not v:
        return None
    if not re.match(PHONE_REGEX, str(v)):
        return None
    return str(v)

def safe_zip_validator(v: Any) -> Optional[str]:
    if not v:
        return None
    if not re.match(NUMERIC_ZIP_REGEX, str(v)):
        return None
    return str(v)


# Accepts domains with or without a scheme (e.g. "www.google.com",
# "google.com", "https://example.com"). Normalizes to include https:// so we
# never trip Pydantic's strict HttpUrl rules (which surface a pydantic.dev
# error link to end users). Returns None for empty values.
_WEBSITE_REGEX = re.compile(
    r"^https?://[^\s/$.?#][^\s]*\.[^\s]{2,}$", re.IGNORECASE
)


def normalize_website(v: Any) -> Optional[str]:
    if not v:
        return None
    s = str(v).strip()
    if not s:
        return None
    if not re.match(r"^https?://", s, re.IGNORECASE):
        s = f"https://{s}"
    if not _WEBSITE_REGEX.match(s):
        raise ValueError("Please enter a valid website, e.g. example.com")
    return s

class AccountBase(BaseModel):
    """Base schema for Account"""
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr = Field(...)
    phone: Annotated[str, BeforeValidator(strict_phone_validator)] = Field(..., pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)
    mobile: Annotated[Optional[str], BeforeValidator(strict_phone_validator)] = Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)
    website: Annotated[Optional[str], BeforeValidator(normalize_website)] = None
    description: Optional[str] = None
    is_person_account: bool = False
    segment: Optional[str] = None  # B2C, B2B, CORPORATE
    
    # Person Account specific fields
    salutation: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    
    # Billing Address
    billing_street: Optional[str] = None
    billing_city: Optional[str] = None
    billing_state: str = Field(...)
    billing_zip: Annotated[Optional[str], BeforeValidator(safe_zip_validator)] = Field(None, pattern=NUMERIC_ZIP_REGEX, description=NUMERIC_ZIP_REGEX_MESSAGE)
    billing_country: str = Field(...)
    
    # Shipping Address
    shipping_street: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_state: Optional[str] = None
    shipping_zip: Annotated[Optional[str], BeforeValidator(safe_zip_validator)] = Field(None, pattern=NUMERIC_ZIP_REGEX, description=NUMERIC_ZIP_REGEX_MESSAGE)
    shipping_country: Optional[str] = None
    
    # Classification
    acc_type_id: Optional[str] = None
    acc_parent_id: Optional[str] = None
    industry_id: Optional[str] = None
    category_id: Optional[str] = None
    industry_data: Optional[Dict[str, Any]] = Field(default_factory=dict)


class AccountCreate(AccountBase):
    """Schema for creating an account"""
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)

    @model_validator(mode='after')
    def validate_classification(self) -> 'AccountCreate':
        if self.is_person_account:
            if not self.last_name:
                raise ValueError("Last name is required for person accounts")
        else:
            if not self.acc_type_id:
                raise ValueError("acc_type_id is required for company accounts")
            if not self.industry_id:
                raise ValueError("industry_id is required for company accounts")
        return self


class AccountUpdate(BaseModel):
    """Schema for updating an account"""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Annotated[Optional[EmailStr], BeforeValidator(lambda v: v if v else None)] = None
    phone: Annotated[Optional[str], BeforeValidator(strict_phone_validator)] = Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)
    mobile: Annotated[Optional[str], BeforeValidator(strict_phone_validator)] = Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)
    website: Annotated[Optional[str], BeforeValidator(normalize_website)] = None
    description: Optional[str] = None
    
    # Person Account specific fields
    salutation: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    
    # Billing Address
    billing_street: Optional[str] = None
    billing_city: Optional[str] = None
    billing_state: Optional[str] = None
    billing_zip: Annotated[Optional[str], BeforeValidator(safe_zip_validator)] = Field(None, pattern=NUMERIC_ZIP_REGEX, description=NUMERIC_ZIP_REGEX_MESSAGE)
    billing_country: Optional[str] = None
    
    # Shipping Address
    shipping_street: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_state: Optional[str] = None
    shipping_zip: Annotated[Optional[str], BeforeValidator(safe_zip_validator)] = Field(None, pattern=NUMERIC_ZIP_REGEX, description=NUMERIC_ZIP_REGEX_MESSAGE)
    shipping_country: Optional[str] = None
    
    # Classification
    acc_type_id: Optional[str] = None
    acc_parent_id: Optional[str] = None
    industry_id: Optional[str] = None
    category_id: Optional[str] = None

    custom_fields: Optional[Dict[str, Any]] = None
    segment: Optional[str] = None  # B2C, B2B, CORPORATE
    industry_data: Optional[Dict[str, Any]] = None

    @model_validator(mode="after")
    def validate_required_inline_fields(self) -> "AccountUpdate":
        if "email" in self.model_fields_set and not self.email:
            raise ValueError("Email is required.")
        if "phone" in self.model_fields_set and not self.phone:
            raise ValueError("Phone is required.")
        if "name" in self.model_fields_set and not self.name:
            raise ValueError("Account name is required.")
        return self


class AccountResponse(AccountBase):
    """Schema for account response"""
    # Relax input-only constraints for output: legacy/partial records must still
    # serialize even if they predate current required-field / format rules.
    name: str = Field("", max_length=255)  # drop create-time min_length=2 for reads
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    billing_state: Optional[str] = None
    billing_country: Optional[str] = None

    id: str
    tenant_id: str
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None
    created_by: str
    created_by_name: Optional[str] = None
    last_modified_by_id: Optional[str] = None
    last_modified_by_name: Optional[str] = None
    account_type_name: Optional[str] = None
    category_name: Optional[str] = None

    # Legacy display ID. Set by data import, never by the create/update API.
    account_number: Optional[int] = None

    view_count: int = 0
    is_favorite: bool = False

    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    # Custom field values (Phase 1 §C)
    custom_fields: Optional[Dict[str, Any]] = None

    from pydantic import field_serializer
    @field_serializer('industry_data', mode='plain')
    def serialize_industry_data(self, value):
        if not value:
            return value
        import bson
        from datetime import datetime as _dt, date as _date
        def convert_non_serializable(val):
            if isinstance(val, dict):
                return {k: convert_non_serializable(v) for k, v in val.items()}
            elif isinstance(val, list):
                return [convert_non_serializable(item) for item in val]
            elif isinstance(val, bson.ObjectId):
                return str(val)
            elif isinstance(val, _dt):
                return val.isoformat()
            elif isinstance(val, _date):
                return val.isoformat()
            return val
        return convert_non_serializable(value)

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


class AccountMerge(BaseModel):
    """Schema for merging a duplicate account into a primary account."""
    primary_id: str   # account to keep
    duplicate_id: str  # account to merge & soft-delete


class AccountSearch(BaseModel):
    """Schema for account search"""
    query: Optional[str] = None
    acc_type_id: Optional[str] = None
    industry_id: Optional[str] = None
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
    category_name: Optional[str] = None
