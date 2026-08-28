"""
Quote models for proposals and quotations — Industry-agnostic

Travel-specific fields (travel_date, return_date, num_adults, etc.) have been
migrated to the `industry_data` dict. All industries now store their metadata
in `industry_data`, validated by the dispatcher in schemas/industry_data/__init__.py.
"""
from beanie import Indexed
from pydantic import Field
from typing import Optional, List, Dict, Any
from beanie import PydanticObjectId
from datetime import datetime, date
from app.models.base import BaseDocument


class QuoteItem(BaseDocument):
    """Individual item in a quote"""
    
    quote_id: Indexed(PydanticObjectId)
    
    # Item details
    name: str
    description: Optional[str] = None
    product_id: Optional[PydanticObjectId] = None  # Link to Product
    
    # Quantity & Pricing
    quantity: int = 1
    unit_price: float = 0.0
    discount_percent: float = 0.0
    discount_amount: float = 0.0
    tax_percent: float = 0.0
    tax_amount: float = 0.0
    total: float = 0.0
    
    # Additional
    notes: Optional[str] = None
    sort_order: int = 0
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    
    class Settings:
        name = "quote_items"
        # indexes = [
        # "quote_id",
        # "tenant_id",
        # "product_id",
        # ]


class Quote(BaseDocument):
    """Quote/Proposal model"""
    
    # Quote identification
    quote_number: Indexed(str)  # Auto-generated quote number
    name: str
    
    # Links
    opportunity_id: Optional[Indexed(PydanticObjectId)] = None
    contact_id: Optional[Indexed(PydanticObjectId)] = None
    account_id: Optional[Indexed(PydanticObjectId)] = None
    
    # Status workflow
    status: str = "Draft"  # Draft, Sent, Accepted, Rejected, Expired
    
    # Dates
    quote_date: datetime = Field(default_factory=datetime.utcnow)
    valid_until: Optional[datetime] = None
    
    # Pricing summary
    subtotal: float = 0.0
    discount_percent: float = 0.0
    discount_amount: float = 0.0
    tax_percent: float = 0.0
    tax_amount: float = 0.0
    total: float = 0.0
    currency: str = "USD"
    
    # Terms
    terms_and_conditions: Optional[str] = None
    notes: Optional[str] = None
    
    # Industry-specific data — ALL industries store metadata here.
    # Travel: travel_date, return_date, num_adults, num_children, num_infants, destinations
    # Healthcare: treatment_plan_id, estimated_sessions, etc.
    # Education: program_id, semester, etc.
    # Manufacturing: delivery_schedule, specs, etc.
    industry_data: Dict[str, Any] = Field(default_factory=dict)
    
    # Tenant & Ownership
    tenant_id: Indexed(PydanticObjectId)
    owner_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None
    
    class Settings:
        name = "quotes"
        # indexes = [
        # "tenant_id",
        # "quote_number",
        # "opportunity_id",
        # "contact_id",
        # "account_id",
        # "owner_id",
        # "status",
        # [("tenant_id", 1), ("quote_number", 1)],
            # [("tenant_id", 1), ("status", 1)],
            # [("tenant_id", 1), ("owner_id", 1)],
        # ]
