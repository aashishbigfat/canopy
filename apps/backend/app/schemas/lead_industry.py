"""
Generic (non-travel) Lead schemas.

These schemas are used for healthcare, education, and manufacturing tenants.
They share the same universal CRM fields as the travel LeadCreate/Update/Convert
but do NOT require travel_date or other travel-specific fields.

The travel schemas in schemas/lead.py remain FROZEN and untouched.
"""
from pydantic import BaseModel, EmailStr, Field, BeforeValidator
from typing import Optional, Dict, List, Any, Union, Annotated
from datetime import datetime, date
from app.core.validators import PHONE_REGEX, PHONE_REGEX_MESSAGE
import re


def safe_phone_validator(v: Any) -> Optional[str]:
    if not v:
        return None
    if not re.match(PHONE_REGEX, str(v)):
        return None
    return str(v)


class GenericLeadCreate(BaseModel):
    """Schema for creating a lead in non-travel industries.
    
    Identical to the travel LeadCreate EXCEPT:
    - travel_date is NOT required (Optional)
    - no_of_pax, no_of_nights, no_of_adults, etc. are omitted
    - destinations, destination_ids, experience_id are omitted
    - industry_data dict is added for industry-specific metadata
    """
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
    
    source_medium: Optional[str] = None
    campaign_name: Optional[str] = None
    ip_address: Optional[str] = None
    segment: Optional[str] = "B2C"
    creation_type: Optional[str] = "manual"
    
    # Industry-specific data (validated per-industry via validate_industry_data)
    industry_data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)


class GenericLeadUpdate(BaseModel):
    """Schema for updating a lead in non-travel industries."""
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
    
    source_medium: Optional[str] = None
    campaign_name: Optional[str] = None
    ip_address: Optional[str] = None
    
    # Industry-specific data
    industry_data: Optional[Dict[str, Any]] = None
    custom_fields: Optional[Dict[str, Any]] = None


class GenericLeadConvert(BaseModel):
    """Schema for converting a lead in non-travel industries.
    
    Does NOT require travel_date, destination_ids, experience_id, or pax fields.
    """
    account_id: Optional[str] = None
    account_name: Optional[str] = None
    account_type: Optional[str] = "Account"
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
    
    # Industry-specific data for the new opportunity
    industry_data: Optional[Dict[str, Any]] = Field(default_factory=dict)
