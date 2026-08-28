"""
Contact views and columns models
"""
from beanie import Indexed, Document
from pydantic import Field
from typing import Optional, Dict, Any
from beanie import PydanticObjectId
from datetime import datetime

class ContactView(Document):
    """Saved views/filters for contacts"""
    name: str
    filters: Dict[str, Any] = Field(default_factory=dict)
    public_view: bool = False
    created_by: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "contact_views"
        # indexes = [
        # "tenant_id",
        # "created_by",
        # [("tenant_id", 1), ("created_by", 1)]
        # ]


class ContactColumn(Document):
    """Column configuration for contact list view"""
    name: str
    alias_name: str
    editable_flag: bool = False
    tenant_id: Optional[Indexed(PydanticObjectId)] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "contact_columns"
        # indexes = ["tenant_id"]


class AdditionalFieldContact(Document):
    """Definition of additional/custom fields for contacts"""
    name: str
    field_type: str
    is_mandatory: bool = False
    is_active: bool = True
    sorting: int = 0
    options: list = Field(default_factory=list)
    tenant_id: Indexed(PydanticObjectId)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "additional_field_contacts"
        # indexes = ["tenant_id", "is_active"]
