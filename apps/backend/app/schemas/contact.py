"""
Pydantic schemas for Contact API
"""
from pydantic import BaseModel, EmailStr, Field, BeforeValidator, model_validator
from typing import Optional, Dict, List, Any, Annotated
from datetime import datetime

class ContactOwnerChange(BaseModel):
    """Schema for changing contact owner"""
    new_owner_id: str = Field(..., description="ID of the new owner user")
from app.core.validators import PHONE_REGEX, PHONE_REGEX_MESSAGE, ZIP_REGEX, ZIP_REGEX_MESSAGE, strict_phone_validator
import re

def safe_phone_validator(v: Any) -> Optional[str]:
    if not v:
        return None
    # When returning from DB, old data might fail the new strict regex
    if not re.match(PHONE_REGEX, str(v)):
        return None
    return str(v)

def safe_zip_validator(v: Any) -> Optional[str]:
    if not v:
        return None
    if not re.match(ZIP_REGEX, str(v)):
        return None
    return str(v)

class ContactBase(BaseModel):
    """Base schema for Contact"""
    salutation: Optional[str] = None
    first_name: str = Field(..., min_length=2, max_length=100)
    middle_name: Optional[str] = None
    last_name: str = Field(..., min_length=2, max_length=100)
    date_of_birth: Optional[datetime] = None

    email: Annotated[Optional[EmailStr], BeforeValidator(lambda v: v if v else None)] = None
    phone: Annotated[Optional[str], BeforeValidator(safe_phone_validator)] = Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)
    mobile: Annotated[Optional[str], BeforeValidator(safe_phone_validator)] = Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)
    fax: Optional[str] = None
    
    title: Optional[str] = None
    department: Optional[str] = None
    
    mailing_street: Optional[str] = None
    mailing_city: Optional[str] = None
    mailing_state: Optional[str] = None
    mailing_zip: Annotated[Optional[str], BeforeValidator(safe_zip_validator)] = Field(None, pattern=ZIP_REGEX, description=ZIP_REGEX_MESSAGE)
    mailing_country: Optional[str] = None
    
    other_street: Optional[str] = None
    other_city: Optional[str] = None
    other_state: Optional[str] = None
    other_zip: Annotated[Optional[str], BeforeValidator(safe_zip_validator)] = Field(None, pattern=ZIP_REGEX, description=ZIP_REGEX_MESSAGE)
    other_country: Optional[str] = None
    
    description: Optional[str] = None
    assistant: Optional[str] = None
    assistant_phone: Annotated[Optional[str], BeforeValidator(safe_phone_validator)] = Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)
    
    account_id: Optional[str] = None
    industry_data: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ContactCreate(ContactBase):
    """Schema for creating a contact"""
    first_name: Optional[str] = Field(None, max_length=100)
    email: EmailStr = Field(...)
    mobile: Annotated[str, BeforeValidator(strict_phone_validator)] = Field(..., pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)
    phone: Annotated[Optional[str], BeforeValidator(strict_phone_validator)] = Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)
    account_id: str = Field(...)
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ContactUpdate(BaseModel):
    """Schema for updating a contact"""
    salutation: Optional[str] = None
    first_name: Optional[str] = Field(None, max_length=100)
    middle_name: Optional[str] = None
    last_name: Optional[str] = Field(None, min_length=2, max_length=100)
    date_of_birth: Optional[datetime] = None

    email: Annotated[Optional[EmailStr], BeforeValidator(lambda v: v if v else None)] = None
    phone: Annotated[Optional[str], BeforeValidator(strict_phone_validator)] = Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)
    mobile: Annotated[Optional[str], BeforeValidator(strict_phone_validator)] = Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)
    title: Optional[str] = None
    department: Optional[str] = None

    # Full address parity with ContactBase — update_contact uses
    # model_dump(exclude_unset=True), so any field missing here would be
    # silently dropped on edit.
    mailing_street: Optional[str] = None
    mailing_city: Optional[str] = None
    mailing_state: Optional[str] = None
    mailing_zip: Annotated[Optional[str], BeforeValidator(safe_zip_validator)] = Field(None, pattern=ZIP_REGEX, description=ZIP_REGEX_MESSAGE)
    mailing_country: Optional[str] = None

    other_street: Optional[str] = None
    other_city: Optional[str] = None
    other_state: Optional[str] = None
    other_zip: Annotated[Optional[str], BeforeValidator(safe_zip_validator)] = Field(None, pattern=ZIP_REGEX, description=ZIP_REGEX_MESSAGE)
    other_country: Optional[str] = None

    description: Optional[str] = None

    account_id: Optional[str] = None
    # account_name is NOT included — it is a read-only computed field from the
    # service layer and does not exist on the Contact document.
    custom_fields: Optional[Dict[str, Any]] = None
    industry_data: Optional[Dict[str, Any]] = None

    @model_validator(mode="after")
    def validate_required_inline_fields(self) -> "ContactUpdate":
        if "email" in self.model_fields_set and not self.email:
            raise ValueError("Email is required.")
        if "mobile" in self.model_fields_set and not self.mobile:
            raise ValueError("Mobile is required.")
        if "last_name" in self.model_fields_set and not self.last_name:
            raise ValueError("Last name is required.")
        if "account_id" in self.model_fields_set and not self.account_id:
            raise ValueError("Account is required.")
        return self


class ContactResponse(ContactBase):
    """Schema for contact response"""
    # Relax input-only constraints for output: a legacy/imported contact with a
    # malformed email or empty/short name must still serialize rather than 500
    # the read endpoint. (phone/mobile/zip are already sanitized via safe_* validators.)
    email: Optional[str] = None
    # Drop the create-time min_length=2 on names so legacy rows with "" don't 500 reads.
    first_name: str = Field("", max_length=100)
    last_name: str = Field("", max_length=100)

    id: str
    tenant_id: str
    owner_id: str
    owner_name: Optional[str] = None
    created_by: str
    created_by_name: Optional[str] = None
    last_modified_by_id: Optional[str] = None
    last_modified_by_name: Optional[str] = None

    account_name: Optional[str] = None

    full_name: str
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
