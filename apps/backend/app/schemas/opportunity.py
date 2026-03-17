"""
Pydantic schemas for Opportunity API
"""
from pydantic import BaseModel, Field, BeforeValidator
from typing import Optional, Dict, List, Any, Annotated
from datetime import datetime

class OpportunityBase(BaseModel):
    """Base schema for Opportunity"""
    name: str = Field(..., min_length=1, max_length=255)
    amount: Optional[float] = Field(None, ge=0.0)
    description: Optional[str] = Field(None, max_length=1000)
    
    # Travel-specific fields
    no_of_pax: Optional[int] = Field(None, ge=1)
    no_of_nights: Optional[int] = Field(None, ge=0)
    no_of_adults: Optional[int] = Field(None, ge=1)
    no_of_childs: Optional[int] = Field(None, ge=0)
    no_of_infants: Optional[int] = Field(None, ge=0)
    travel_date: datetime = Field(..., description="Travel date is required")
    close_date: Optional[datetime] = None
    
    # Sales information
    sales_stage_id: Annotated[str, BeforeValidator(str)]
    probability: Optional[int] = Field(0, ge=0, le=100)
    
    # Relationships
    account_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    contact_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    opportunity_type_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    experience_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    
    # Source tracking
    source_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    source_medium_id: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    source_url: Optional[str] = Field(None, max_length=500)
    
    # Additional fields
    country_of_origin: Optional[str] = Field(None, max_length=100)
    segment: Optional[str] = "B2C"
    key_deal: bool = False


class OpportunityCreate(OpportunityBase):
    """Schema for creating an opportunity"""
    destination_ids: Optional[List[str]] = Field(default_factory=list)
    origin_ids: Optional[List[str]] = Field(default_factory=list)
    team_member_ids: Optional[List[str]] = Field(default_factory=list)
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)


def parse_date(v):
    if v == "" or v is None:
        return None
    if isinstance(v, str):
        if "T" not in v and " " not in v:
            try:
                # Try parsing as date and convert to datetime
                from datetime import date
                d = date.fromisoformat(v)
                from datetime import datetime
                return datetime(d.year, d.month, d.day)
            except:
                pass
    return v


class OpportunityUpdate(BaseModel):
    """Schema for updating an opportunity"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    amount: Optional[float] = Field(None, ge=0.0)
    description: Optional[str] = Field(None, max_length=1000)
    sales_stage_id: Optional[str] = Field(None, min_length=1)
    probability: Optional[int] = Field(None, ge=0, le=100)

    close_date: Annotated[Optional[datetime], BeforeValidator(parse_date)] = None
    travel_date: Annotated[Optional[datetime], BeforeValidator(parse_date)] = None
    no_of_pax: Optional[int] = Field(None, ge=1)
    no_of_adults: Optional[int] = Field(None, ge=1)
    no_of_childs: Optional[int] = Field(None, ge=0)
    no_of_infants: Optional[int] = Field(None, ge=0)
    no_of_nights: Optional[int] = Field(None, ge=0)
    experience_id: Optional[str] = None
    account_id: Optional[str] = None
    contact_id: Optional[str] = None
    source_id: Optional[str] = None
    source_medium_id: Optional[str] = None
    source_url: Optional[str] = None
    destination_ids: Optional[List[str]] = None
    origin_ids: Optional[List[str]] = None
    key_deal: Optional[bool] = None
    custom_fields: Optional[Dict[str, Any]] = None


class OpportunityHistoryResponse(BaseModel):
    id: Annotated[str, BeforeValidator(str)]
    opportunity_id: Annotated[str, BeforeValidator(str)]
    tenant_id: Annotated[str, BeforeValidator(str)]
    field_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    changed_by: Annotated[str, BeforeValidator(str)]
    changed_at: datetime
    
    # Extended fields
    user_name: Optional[str] = None
    old_stage_name: Optional[str] = None
    new_stage_name: Optional[str] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        if hasattr(obj, 'id'):
            data = obj.model_dump()
            data['id'] = str(obj.id)
            if hasattr(obj, 'opportunity_id') and obj.opportunity_id:
                data['opportunity_id'] = str(obj.opportunity_id)
            if hasattr(obj, 'tenant_id') and obj.tenant_id:
                data['tenant_id'] = str(obj.tenant_id)
            if hasattr(obj, 'changed_by') and obj.changed_by:
                data['changed_by'] = str(obj.changed_by)
            return cls(**data)
        return cls()


class OpportunityResponse(OpportunityBase):
    """Schema for opportunity response"""
    id: Annotated[str, BeforeValidator(str)]
    tenant_id: Annotated[str, BeforeValidator(str)]
    owner_id: Annotated[str, BeforeValidator(str)]
    created_by: Annotated[str, BeforeValidator(str)]
    created_by_name: Optional[str] = None
    last_modified_by_name: Optional[str] = None
    
    is_locked: bool = False
    locked_by: Annotated[Optional[str], BeforeValidator(lambda v: str(v) if v else None)] = None
    view_count: int = 0
    
    created_at: datetime
    updated_at: datetime
    
    # Additional response fields for related data
    sales_stage_name: Optional[str] = None
    opportunity_type_name: Optional[str] = None
    owner_name: Optional[str] = None
    account_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    experience_name: Optional[str] = None
    destination_names: List[str] = Field(default_factory=list)
    segment: Optional[str] = None
    creation_type: Optional[str] = "Manual" # "Auto" or "Manual"
    is_person_account: bool = False
    
    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        """Convert ObjectId fields to strings for API response"""
        if hasattr(obj, 'id'):
            data = obj.model_dump()
            # Convert ObjectId fields to strings
            data['id'] = str(obj.id)
            if hasattr(obj, 'tenant_id') and obj.tenant_id:
                data['tenant_id'] = str(obj.tenant_id)
            if hasattr(obj, 'owner_id') and obj.owner_id:
                data['owner_id'] = str(obj.owner_id)
            if hasattr(obj, 'created_by') and obj.created_by:
                data['created_by'] = str(obj.created_by)
            if hasattr(obj, 'sales_stage_id') and obj.sales_stage_id:
                data['sales_stage_id'] = str(obj.sales_stage_id)
            if hasattr(obj, 'account_id') and obj.account_id:
                data['account_id'] = str(obj.account_id)
            if hasattr(obj, 'contact_id') and obj.contact_id:
                data['contact_id'] = str(obj.contact_id)
            if hasattr(obj, 'opportunity_type_id') and obj.opportunity_type_id:
                data['opportunity_type_id'] = str(obj.opportunity_type_id)
            if hasattr(obj, 'experience_id') and obj.experience_id:
                data['experience_id'] = str(obj.experience_id)
            if hasattr(obj, 'source_id') and obj.source_id:
                data['source_id'] = str(obj.source_id)
            if hasattr(obj, 'source_medium_id') and obj.source_medium_id:
                data['source_medium_id'] = str(obj.source_medium_id)
            if hasattr(obj, 'locked_by') and obj.locked_by:
                data['locked_by'] = str(obj.locked_by)
            
            # Map names if they exist on the object (populated by service/handler)
            if hasattr(obj, 'sales_stage_name'):
                data['sales_stage_name'] = obj.sales_stage_name
            if hasattr(obj, 'opportunity_type_name'):
                data['opportunity_type_name'] = obj.opportunity_type_name
            if hasattr(obj, 'owner_name'):
                data['owner_name'] = obj.owner_name
            if hasattr(obj, 'account_name'):
                data['account_name'] = obj.account_name
            if hasattr(obj, 'experience_name'):
                data['experience_name'] = obj.experience_name
            if hasattr(obj, 'destination_names'):
                data['destination_names'] = obj.destination_names
            if hasattr(obj, 'segment'):
                data['segment'] = obj.segment
            if hasattr(obj, 'creation_type'):
                data['creation_type'] = obj.creation_type
            if hasattr(obj, 'is_person_account'):
                data['is_person_account'] = obj.is_person_account
            
            # Ensure datetime fields are properly formatted
            if hasattr(obj, 'travel_date') and obj.travel_date:
                if isinstance(obj.travel_date, datetime):
                    data['travel_date'] = obj.travel_date.isoformat()
            if hasattr(obj, 'close_date') and obj.close_date:
                if isinstance(obj.close_date, datetime):
                    data['close_date'] = obj.close_date.isoformat()
                    
            return cls(**data)
        return cls()


class OpportunityListResponse(BaseModel):
    """Schema for list of opportunities"""
    opportunities: List[OpportunityResponse]
    total: int
    page: int = 1
    per_page: int = 10
    pages: int



class OpportunityStageChange(BaseModel):
    """Schema for changing opportunity stage"""
    new_stage_id: str
    reason: Optional[str] = None


class ExperienceResponse(BaseModel):
    """Schema for experience response"""
    id: str
    name: str
    description: Optional[str] = None
    sorting: int = 0

    class Config:
        from_attributes = True
