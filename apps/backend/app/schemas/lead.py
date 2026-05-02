"""
Pydantic schemas for Lead API — Industry-agnostic

Travel-specific fields (travel_date, no_of_pax, destinations, etc.) are no
longer on these schemas.  They live inside `industry_data` and are validated
per-industry by schemas/industry_data/__init__.py.
"""
from pydantic import BaseModel, EmailStr, Field, BeforeValidator
from typing import Optional, Dict, List, Any, Union, Annotated
from datetime import datetime, date
from app.core.validators import PHONE_REGEX, PHONE_REGEX_MESSAGE

class LeadOwnerChange(BaseModel):
    """Schema for changing lead owner"""
    new_owner_id: str = Field(..., description="ID of the new owner user")
import re

def safe_phone_validator(v: Any) -> Optional[str]:
    if not v:
        return None
    if not re.match(PHONE_REGEX, str(v)):
        return None
    return str(v)

class LeadBase(BaseModel):
    """Base schema for Lead — universal across all industries"""
    salutation: Optional[str] = None
    first_name: str = Field(..., max_length=100)
    middle_name: Optional[str] = None
    last_name: str = Field(..., min_length=1, max_length=100)
    
    email: Annotated[Optional[EmailStr], BeforeValidator(lambda v: v if v else None)] = None
    phone: Annotated[Optional[str], BeforeValidator(safe_phone_validator)] = Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)
    mobile: Annotated[Optional[str], BeforeValidator(safe_phone_validator)] = Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)
    
    company: Optional[str] = Field(None, max_length=255)
    title: Optional[str] = Field(None, max_length=100)
    no_employees: Optional[int] = Field(None, ge=1)
    website: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    country: Optional[str] = None
    
    lead_status_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    industry_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    source_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    source_medium_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    
    # Universal CRM fields
    source_medium: Optional[str] = None
    campaign_name: Optional[str] = None
    ip_address: Optional[str] = None
    segment: Optional[str] = "B2C"
    creation_type: Optional[str] = "manual"
    
    # Industry-specific data (validated per-industry via validate_industry_data)
    industry_data: Optional[Dict[str, Any]] = Field(default_factory=dict)


class LeadCreate(LeadBase):
    """Schema for creating a lead"""
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)


class LeadUpdate(BaseModel):
    """Schema for updating a lead"""
    salutation: Optional[str] = None
    first_name: Optional[str] = Field(None, max_length=100)
    middle_name: Optional[str] = None
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Annotated[Optional[EmailStr], BeforeValidator(lambda v: v if v else None)] = None
    phone: Annotated[Optional[str], BeforeValidator(safe_phone_validator)] = Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)
    mobile: Annotated[Optional[str], BeforeValidator(safe_phone_validator)] = Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)
    company: Optional[str] = Field(None, max_length=255)
    title: Optional[str] = Field(None, max_length=100)
    no_employees: Optional[int] = Field(None, ge=1)
    website: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    country: Optional[str] = None
    lead_status_id: Optional[str] = None
    industry_id: Optional[str] = None
    source_id: Optional[str] = None
    source_medium_id: Optional[str] = None
    
    # Universal CRM fields
    source_medium: Optional[str] = None
    campaign_name: Optional[str] = None
    ip_address: Optional[str] = None
    
    # Industry-specific data
    industry_data: Optional[Dict[str, Any]] = None
    custom_fields: Optional[Dict[str, Any]] = None


class LeadResponse(BaseModel):
    """Schema for lead response - no ge constraints so old/legacy data doesn't fail serialization"""
    id: Annotated[str, BeforeValidator(str)]
    tenant_id: Annotated[str, BeforeValidator(str)]
    owner_id: Annotated[str, BeforeValidator(str)]
    created_by: Annotated[str, BeforeValidator(str)]
    created_by_name: Optional[str] = None
    last_modified_by_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    last_modified_by_name: Optional[str] = None
    owner_name: Optional[str] = None

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

    # Universal CRM fields
    source_medium: Optional[str] = None
    campaign_name: Optional[str] = None
    ip_address: Optional[str] = None
    segment: Optional[str] = "B2C"
    creation_type: Optional[str] = "manual"

    full_name: str
    is_converted: bool = False
    opportunity_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    view_count: int = 0
    
    # Industry-specific data (all industries including travel)
    industry_data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    
    from pydantic import field_serializer
    @field_serializer('industry_data', mode='plain')
    def serialize_industry_data(self, value):
        if not value:
            return value
        import bson
        def convert_oids(val):
            if isinstance(val, dict):
                return {k: convert_oids(v) for k, v in val.items()}
            elif isinstance(val, list):
                return [convert_oids(item) for item in val]
            elif isinstance(val, bson.ObjectId):
                return str(val)
            return val
        return convert_oids(value)

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LeadConvert(BaseModel):
    """Schema for converting lead to account/contact/opportunity"""
    account_id: Optional[str] = None
    account_name: Optional[str] = None
    account_type: Optional[str] = "Account"  # "Account" or "Person Account"
    person_salutation: Optional[str] = None
    person_first_name: Optional[str] = None
    person_last_name: Optional[str] = None
    contact_id: Optional[str] = None
    contact_create: bool = True
    create_opportunity: bool = True
    opportunity_name: Optional[str] = None
    opportunity_amount: Optional[float] = None
    opportunity_close_date: Optional[Union[datetime, date]] = None
    sales_stage_id: Optional[str] = None
    description: Optional[str] = None
    opportunity_owner_id: Optional[str] = None
    
    # Industry-specific data for the new opportunity (travel_date, pax, etc.)
    industry_data: Optional[Dict[str, Any]] = Field(default_factory=dict)


class LeadListResponse(BaseModel):
    """Schema for list of leads with metadata"""
    leads: List[LeadResponse]
    pagination: Dict[str, Any]
    lead_statuses: List[Dict[str, Any]] = Field(default_factory=list)
    sources: List[Dict[str, Any]] = Field(default_factory=list)
    users: List[Dict[str, Any]] = Field(default_factory=list)
    industries: List[Dict[str, Any]] = Field(default_factory=list)
    experiences: List[Dict[str, Any]] = Field(default_factory=list)
    sales_stages: List[Dict[str, Any]] = Field(default_factory=list)
