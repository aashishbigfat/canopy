"""
Consolidated picklist models - all picklists stored in single collection
to avoid MongoDB Atlas 500 collection limit.
Uses 'picklist_type' discriminator field.
"""
from beanie import Indexed, Document
from pydantic import Field
from typing import Optional, Literal
from beanie import PydanticObjectId
from datetime import datetime

class BasePicklist(Document):
    """Base picklist document - all picklists stored in 'picklists' collection"""
    name: Indexed(str)
    description: Optional[str] = None
    tenant_id: Optional[Indexed(PydanticObjectId)] = None
    sorting: int = 0
    is_active: bool = True
    is_default: bool = False
    
    # Discriminator field
    picklist_type: str
    
    # Type-specific fields (stored only when relevant)
    color: Optional[str] = None
    probability: Optional[int] = None
    is_won: Optional[bool] = None
    is_lost: Optional[bool] = None
    country: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "picklists"
        is_root = True
        indexes = [
            "picklist_type",
            "tenant_id",
            "sorting",
            "is_active",
            [("picklist_type", 1), ("tenant_id", 1), ("sorting", 1)],
        ]


# Account Picklists (all map to single collection via picklist_type)
class AccountType(BasePicklist):
    """Account type picklist"""
    picklist_type: Literal["account_type"] = "account_type"
    
    class Settings:
        name = "picklists"

class Industry(BasePicklist):
    """Industry picklist"""
    picklist_type: Literal["industry"] = "industry"
    
    class Settings:
        name = "picklists"

class Rating(BasePicklist):
    """Account rating/category picklist"""
    picklist_type: Literal["rating"] = "rating"
    tenant_id: Optional[PydanticObjectId] = None  # Global picklist
    
    class Settings:
        name = "picklists"

class AccountSource(BasePicklist):
    """Account source picklist"""
    picklist_type: Literal["account_source"] = "account_source"
    
    class Settings:
        name = "picklists"

class SupplierServicePicklist(BasePicklist):
    """Supplier Service Types picklist"""
    picklist_type: Literal["supplier_service"] = "supplier_service"
    
    class Settings:
        name = "picklists"


# Lead Picklists
class LeadStatus(BasePicklist):
    """Lead status picklist"""
    picklist_type: Literal["lead_status"] = "lead_status"
    
    class Settings:
        name = "picklists"

class Source(BasePicklist):
    """Lead source picklist"""
    picklist_type: Literal["source"] = "source"
    
    class Settings:
        name = "picklists"

class SourceMedium(BasePicklist):
    """Lead source medium picklist"""
    picklist_type: Literal["source_medium"] = "source_medium"
    
    class Settings:
        name = "picklists"


# Opportunity Picklists  
class SalesStage(BasePicklist):
    """Sales stage/pipeline stage"""
    picklist_type: Literal["sales_stage"] = "sales_stage"
    probability: int = 0
    is_won: bool = False
    is_lost: bool = False
    
    class Settings:
        name = "picklists"

class OpportunityType(BasePicklist):
    """Opportunity type classification"""
    picklist_type: Literal["opportunity_type"] = "opportunity_type"
    
    class Settings:
        name = "picklists"

class Experience(BasePicklist):
    """Travel experience type"""
    picklist_type: Literal["experience"] = "experience"
    
    class Settings:
        name = "picklists"

class OpportunityTag(BasePicklist):
    """Tags for opportunities"""
    picklist_type: Literal["opportunity_tag"] = "opportunity_tag"
    
    class Settings:
        name = "picklists"
