"""
Invoice models for billing and payments
"""
from beanie import Indexed
from pydantic import Field
from typing import Optional, List
from beanie import PydanticObjectId
from datetime import datetime
from app.models.base import BaseDocument


class InvoiceItem(BaseDocument):
    """Individual item in an invoice"""
    
    invoice_id: Indexed(PydanticObjectId)
    
    # Item details
    name: str
    description: Optional[str] = None
    product_id: Optional[PydanticObjectId] = None
    
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
        name = "invoice_items"
        # indexes = ["invoice_id", "tenant_id", "product_id"]


class Payment(BaseDocument):
    """Payment record for an invoice"""
    
    invoice_id: Indexed(PydanticObjectId)
    
    # Payment details
    amount: float
    payment_date: datetime = Field(default_factory=datetime.utcnow)
    payment_method: str  # Cash, Card, Bank Transfer, Check, etc.
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    recorded_by: PydanticObjectId
    
    class Settings:
        name = "payments"
        # indexes = ["invoice_id", "tenant_id", "payment_date"]


class Invoice(BaseDocument):
    """Invoice model for billing"""
    
    # Invoice identification
    invoice_number: Indexed(str)
    name: str
    
    # Links
    quote_id: Optional[Indexed(PydanticObjectId)] = None
    opportunity_id: Optional[Indexed(PydanticObjectId)] = None
    contact_id: Optional[Indexed(PydanticObjectId)] = None
    account_id: Optional[Indexed(PydanticObjectId)] = None
    
    # Status workflow
    status: str = "Draft"  # Draft, Sent, Paid, Partially Paid, Overdue, Cancelled
    
    # Dates
    invoice_date: datetime = Field(default_factory=datetime.utcnow)
    due_date: Optional[datetime] = None
    
    # Pricing summary
    subtotal: float = 0.0
    discount_percent: float = 0.0
    discount_amount: float = 0.0
    tax_percent: float = 0.0
    tax_amount: float = 0.0
    total: float = 0.0
    amount_paid: float = 0.0
    balance_due: float = 0.0
    currency: str = "USD"
    
    # Terms
    terms_and_conditions: Optional[str] = None
    notes: Optional[str] = None
    
    # Tenant & Ownership
    tenant_id: Indexed(PydanticObjectId)
    owner_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None
    
    class Settings:
        name = "invoices"
        # indexes = [
        # "tenant_id", "invoice_number", "quote_id", "opportunity_id",
        # "contact_id", "account_id", "owner_id", "status",
        # [("tenant_id", 1), ("invoice_number", 1)],
            # [("tenant_id", 1), ("status", 1)],
        # ]
