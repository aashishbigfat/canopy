"""
Lead-related picklist models
"""
from beanie import Indexed, Document
from pydantic import Field
from typing import Optional
from beanie import PydanticObjectId
from datetime import datetime

class LeadStatus(Document):
    """Lead status picklist"""
    name: Indexed(str)
    description: Optional[str] = None
    color: Optional[str] = None  # For UI display
    sorting: int = 0
    is_active: bool = True
    is_default: bool = False
    
    class Settings:
        name = "lead_statuses"
        # indexes = ["sorting", "is_active"]


class Source(Document):
    """Lead source picklist"""
    name: Indexed(str)
    description: Optional[str] = None
    tenant_id: Indexed(PydanticObjectId)
    sorting: int = 0
    is_active: bool = True
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "sources"
        # indexes = ["tenant_id", "sorting"]


class SourceMedium(Document):
    """Lead source medium picklist"""
    name: Indexed(str)
    description: Optional[str] = None
    tenant_id: Indexed(PydanticObjectId)
    sorting: int = 0
    is_active: bool = True
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "source_mediums"
        # indexes = ["tenant_id", "sorting"]


class Destination(Document):
    """Travel destination (for travel CRM)"""
    name: Indexed(str)
    country: str
    description: Optional[str] = None
    tenant_id: Indexed(PydanticObjectId)
    is_active: bool = True
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "destinations"
        # indexes = ["tenant_id", "country"]
