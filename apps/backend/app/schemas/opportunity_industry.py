"""
Generic (non-travel) Opportunity schemas.

These schemas are used for healthcare, education, and manufacturing tenants.
They share the same universal CRM fields as the travel OpportunityCreate/Update
but do NOT require travel_date or other travel-specific fields.

The travel schemas in schemas/opportunity.py remain FROZEN and untouched.
"""
from pydantic import BaseModel, Field, BeforeValidator
from typing import Optional, Dict, List, Any, Annotated
from datetime import datetime


def parse_date(v):
    if v == "" or v is None:
        return None
    if isinstance(v, str):
        if "T" not in v and " " not in v:
            try:
                from datetime import date
                d = date.fromisoformat(v)
                return datetime(d.year, d.month, d.day)
            except:
                pass
    return v


class GenericOpportunityCreate(BaseModel):
    """Schema for creating an opportunity in non-travel industries.
    
    Identical to the travel OpportunityCreate EXCEPT:
    - travel_date is NOT required (completely omitted — non-travel doesn't need it)
    - no_of_pax, no_of_nights, no_of_adults, etc. are omitted
    - destination_ids, origin_ids, experience_id, inclusions are omitted
    - industry_data dict is added for industry-specific metadata
    """
    name: str = Field(..., min_length=1, max_length=255)
    amount: Optional[float] = Field(None, ge=0.0)
    description: Optional[str] = Field(None, max_length=1000)
    close_date: Optional[datetime] = None
    
    # Sales information
    sales_stage_id: Annotated[str, BeforeValidator(str)]
    probability: Optional[int] = Field(0, ge=0, le=100)
    
    # Relationships
    account_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    contact_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    
    # Source tracking
    source_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    source_medium_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    source_url: Optional[str] = Field(None, max_length=500)
    
    # Additional fields
    segment: Optional[str] = "B2C"
    key_deal: bool = False
    
    # Industry-specific data (validated per-industry via validate_industry_data)
    industry_data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)
    team_member_ids: Optional[List[str]] = Field(default_factory=list)


class GenericOpportunityUpdate(BaseModel):
    """Schema for updating an opportunity in non-travel industries."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    amount: Optional[float] = Field(None, ge=0.0)
    description: Optional[str] = Field(None, max_length=1000)
    sales_stage_id: Optional[str] = Field(None, min_length=1)
    probability: Optional[int] = Field(None, ge=0, le=100)
    
    close_date: Annotated[Optional[datetime], BeforeValidator(parse_date)] = None
    
    account_id: Optional[str] = None
    contact_id: Optional[str] = None
    source_id: Optional[str] = None
    source_medium_id: Optional[str] = None
    source_url: Optional[str] = None
    key_deal: Optional[bool] = None
    
    # Industry-specific data
    industry_data: Optional[Dict[str, Any]] = None
    custom_fields: Optional[Dict[str, Any]] = None
