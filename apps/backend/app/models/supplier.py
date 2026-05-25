"""
Supplier model for multi-industry CRM — service providers, vendors, etc.
"""
from beanie import Indexed
from pydantic import EmailStr, Field
from typing import Optional, List
from beanie import PydanticObjectId
from app.models.base import BaseDocument

class Supplier(BaseDocument):
    """Supplier model for multi-industry service providers"""
    
    # Basic Information
    name: Indexed(str)
    company_name: Optional[str] = None
    supplier_type: str  # Hotel, Airline, Tour Operator, Transport, etc.
    
    # Contact Information
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    website: Optional[str] = None
    
    # Address
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    country: Optional[str] = None
    
    # Service Areas (Multi-select support)
    services: List[str] = Field(default_factory=list)
    countries: List[str] = Field(default_factory=list)
    states: List[str] = Field(default_factory=list)
    service_cities: List[str] = Field(default_factory=list)
    destinations: List[str] = Field(default_factory=list)
    
    # Business Details
    tax_id: Optional[str] = None
    registration_number: Optional[str] = None
    
    # Contact Person
    contact_person_name: Optional[str] = None
    contact_person_email: Optional[EmailStr] = None
    contact_person_phone: Optional[str] = None
    
    # Payment Terms
    payment_terms: Optional[str] = None
    credit_limit: Optional[float] = None
    
    # Status
    is_active: bool = True
    is_preferred: bool = False
    
    # Rating
    rating: Optional[int] = None  # 1-5
    
    # Tenant & Ownership
    tenant_id: Indexed(PydanticObjectId)
    owner_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None
    
    # Metadata
    notes: Optional[str] = None
    
    class Settings:
        name = "suppliers"
        # indexes = [
        # "tenant_id",
        # "owner_id",
        # "supplier_type",
        # [("tenant_id", 1), ("name", 1)],
            # [("tenant_id", 1), ("supplier_type", 1)],
        # ]


class OpportunitySupplier(BaseDocument):
    """Pivot table for Opportunity-Supplier many-to-many relationship"""
    
    opportunity_id: Indexed(PydanticObjectId)
    supplier_id: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)
    
    # Supplier-specific details for this opportunity
    cost: Optional[float] = None
    notes: Optional[str] = None
    email_subject: Optional[str] = None
    email_body: Optional[str] = None
    
    class Settings:
        name = "opp_suppliers"
        # indexes = [
        # [("opportunity_id", 1), ("supplier_id", 1)],
            # "tenant_id"
        # ]
