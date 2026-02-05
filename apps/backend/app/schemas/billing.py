"""
Pydantic schemas for Billing API.
"""
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


# ==================== Subscription Plan Schemas ====================

class PlanBase(BaseModel):
    """Base schema for SubscriptionPlan."""
    name: str
    code: str
    description: Optional[str] = None
    price_monthly: float = 0.0
    price_yearly: float = 0.0
    currency: str = "USD"
    features: List[str] = Field(default_factory=list)
    limits: Dict[str, int] = Field(default_factory=dict)
    is_active: bool = True
    is_public: bool = True


class PlanCreate(PlanBase):
    """Schema for creating a plan."""
    pass


class PlanUpdate(BaseModel):
    """Schema for updating a plan."""
    name: Optional[str] = None
    description: Optional[str] = None
    price_monthly: Optional[float] = None
    price_yearly: Optional[float] = None
    features: Optional[List[str]] = None
    limits: Optional[Dict[str, int]] = None
    is_active: Optional[bool] = None
    is_public: Optional[bool] = None


class PlanResponse(PlanBase):
    """Schema for plan response."""
    id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ==================== Subscription Schemas ====================

class SubscriptionBase(BaseModel):
    """Base schema for TenantSubscription."""
    plan_id: str
    billing_cycle: str = "monthly"


class SubscriptionCreate(SubscriptionBase):
    """Schema for creating a subscription."""
    payment_method_id: Optional[str] = None  # Stripe payment method ID


class SubscriptionUpdate(BaseModel):
    """Schema for updating a subscription."""
    plan_id: Optional[str] = None
    billing_cycle: Optional[str] = None


class SubscriptionResponse(BaseModel):
    """Schema for subscription response."""
    id: str
    tenant_id: str
    plan_id: str
    plan_code: str
    status: str
    billing_cycle: str
    start_date: datetime
    end_date: Optional[datetime] = None
    trial_ends_at: Optional[datetime] = None
    canceled_at: Optional[datetime] = None
    current_users: int = 0
    storage_used_mb: float = 0.0
    created_at: datetime
    updated_at: datetime
    
    # Enrichment
    plan_name: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    
    class Config:
        from_attributes = True


# ==================== Invoice Schemas ====================

class InvoiceResponse(BaseModel):
    """Schema for billing invoice response."""
    id: str
    tenant_id: str
    invoice_number: str
    amount: float
    currency: str
    status: str
    invoice_date: datetime
    due_date: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    items: List[Dict[str, Any]] = Field(default_factory=list)
    invoice_pdf_url: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class InvoiceListResponse(BaseModel):
    """Schema for paginated invoice list."""
    invoices: List[InvoiceResponse]
    total: int
    page: int
    per_page: int
