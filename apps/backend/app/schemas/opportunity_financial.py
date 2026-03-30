"""
Pydantic schemas for Opportunity Financial API (Costing & Payment Schedule)
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ───────────────────── Costing Schemas ─────────────────────

class CostingLineItemSchema(BaseModel):
    """Schema for a single costing line item"""
    item_type: str
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    destination_ids: List[str] = Field(default_factory=list)
    destination_names: List[str] = Field(default_factory=list)
    amount: float = Field(default=0.0, ge=0)
    cost_amount: float = Field(default=0.0, ge=0)


class CostingCreateUpdate(BaseModel):
    """Schema for creating or updating a costing sheet"""
    selected_item_types: List[str] = Field(default_factory=list)
    items: List[CostingLineItemSchema] = Field(default_factory=list)


class CostingResponse(BaseModel):
    """Schema for costing sheet response"""
    id: Optional[str] = None
    opportunity_id: str
    tenant_id: str
    selected_item_types: List[str] = Field(default_factory=list)
    items: List[CostingLineItemSchema] = Field(default_factory=list)
    total_amount: float = 0.0
    total_cost: float = 0.0
    profit: float = 0.0
    profit_percent: float = 0.0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ───────────────────── Payment Schedule Schemas ─────────────────────

class PaymentScheduleItemCreate(BaseModel):
    """Schema for creating a payment schedule item"""
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    amount: float = Field(..., ge=0)
    status: str = "Pending"
    payment_method: Optional[str] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None


class PaymentScheduleItemUpdate(BaseModel):
    """Schema for updating a payment schedule item"""
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    amount: Optional[float] = Field(None, ge=0)
    status: Optional[str] = None
    payment_method: Optional[str] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    paid_at: Optional[datetime] = None


class PaymentScheduleItemResponse(BaseModel):
    """Schema for payment schedule item response"""
    id: str
    opportunity_id: str
    tenant_id: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    amount: float = 0.0
    status: str = "Pending"
    payment_method: Optional[str] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
