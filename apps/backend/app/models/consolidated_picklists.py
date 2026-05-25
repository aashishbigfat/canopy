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
    
    # Industry scoping — None means "applies to ALL industries" (horizontal CRM default).
    # Set to a specific industry slug (e.g. "travel") to scope a picklist value
    # to tenants of that industry only.
    industry: Optional[str] = None
    
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
            "industry",
            [("picklist_type", 1), ("tenant_id", 1), ("sorting", 1)],
            [("picklist_type", 1), ("industry", 1), ("is_active", 1)],
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


# Shared Picklists (used across multiple entities)
class Salutation(BasePicklist):
    """Salutation prefix picklist (Mr., Mrs., Dr., etc.)"""
    picklist_type: Literal["salutation"] = "salutation"
    
    class Settings:
        name = "picklists"


# Task Picklists
class TaskStatus(BasePicklist):
    """Task status picklist"""
    picklist_type: Literal["task_status"] = "task_status"
    
    class Settings:
        name = "picklists"

class TaskPriority(BasePicklist):
    """Task priority picklist"""
    picklist_type: Literal["task_priority"] = "task_priority"
    
    class Settings:
        name = "picklists"


# Travel-specific Picklists
class Inclusion(BasePicklist):
    """Package inclusions (Breakfast, Airport Transfer, etc.)"""
    picklist_type: Literal["inclusion"] = "inclusion"
    
    class Settings:
        name = "picklists"

class ItineraryInclusion(BasePicklist):
    """Itinerary-level inclusions (Hotel Stay, Meals, Guide, etc.)"""
    picklist_type: Literal["itinerary_inclusion"] = "itinerary_inclusion"
    
    class Settings:
        name = "picklists"

class SupplierType(BasePicklist):
    """Supplier classification types (Hotel, Airline, DMC, etc.)"""
    picklist_type: Literal["supplier_type"] = "supplier_type"
    
    class Settings:
        name = "picklists"

class DestinationPicklist(BasePicklist):
    """Destination name picklist for quick selection"""
    picklist_type: Literal["destination"] = "destination"

    class Settings:
        name = "picklists"


# ============================================================================
# BD Panel Picklists (universal across industries; industry slug optional)
# ============================================================================
class BDActivityType(BasePicklist):
    """Type of BD field activity (Demo, Site Survey, Cold Visit, etc.).

    Drives the BD Visit flow: items with requires_approval=True must be
    approved by the reporting manager before the BD checks in.
    """
    picklist_type: Literal["bd_activity_type"] = "bd_activity_type"
    requires_field_meeting: bool = True
    requires_check_in: bool = True
    requires_approval: bool = True
    expected_duration_min: int = 30

    class Settings:
        name = "picklists"


class ExpenseCategory(BasePicklist):
    """Expense category for BD claims (Meals, Travel, Lodging, etc.).

    max_amount: optional cap per submission (enforced server-side).
    auto_approve_under: if set and amount <= this, expense skips manager queue.
    """
    picklist_type: Literal["expense_category"] = "expense_category"
    requires_receipt: bool = True
    max_amount: Optional[float] = None
    auto_approve_under: Optional[float] = None

    class Settings:
        name = "picklists"
