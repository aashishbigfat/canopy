"""
Billing models for tenant subscriptions and plans.
"""
from datetime import datetime
from typing import Optional, List, Any, Dict
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field


class SubscriptionPlan(Document):
    """SaaS subscription plan definition."""
    
    # Basic Info
    name: Indexed(str, unique=True)
    code: Indexed(str, unique=True)
    description: Optional[str] = None
    
    # Pricing
    price_monthly: float = Field(default=0.0)
    price_yearly: float = Field(default=0.0)
    currency: str = Field(default="USD")
    
    # Features & Limits
    features: List[str] = Field(default_factory=list)
    limits: Dict[str, int] = Field(default_factory=dict)
    # Example limits: {"users": 5, "storage_gb": 10, "emails_per_day": 100}
    
    # Status
    is_active: bool = Field(default=True)
    is_public: bool = Field(default=True)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "subscription_plans"


class TenantSubscription(Document):
    """Active subscription for a tenant."""
    
    # References
    tenant_id: Indexed(str, unique=True)
    plan_id: Indexed(str)
    plan_code: str
    
    # Status
    status: str = Field(default="active")  # active, canceled, past_due, trial
    billing_cycle: str = Field(default="monthly")  # monthly, yearly
    
    # Dates
    start_date: datetime
    end_date: Optional[datetime] = None  # None for perpetual/free
    trial_ends_at: Optional[datetime] = None
    canceled_at: Optional[datetime] = None
    
    # Usage
    current_users: int = Field(default=0)
    storage_used_mb: float = Field(default=0.0)
    
    # Payment Info (Stripe/Provider Ref)
    provider_subscription_id: Optional[str] = None
    provider_customer_id: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "tenant_subscriptions"
        # indexes = [
        # [("status", 1)],
            # [("end_date", 1)],
        # ]


class BillingInvoice(Document):
    """Invoice for tenant subscription billing."""
    
    # References
    tenant_id: Indexed(PydanticObjectId)
    subscription_id: str
    
    # Invoice Details
    invoice_number: Indexed(str, unique=True)
    amount: float
    currency: str
    status: str = Field(default="paid")  # paid, open, void, uncollectible
    
    # Dates
    invoice_date: datetime
    due_date: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    
    # Line Items
    items: List[Dict[str, Any]] = Field(default_factory=list)
    
    # PDF
    invoice_pdf_url: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "billing_invoices"
        # indexes = [
        # [("tenant_id", 1), ("created_at", -1)],
        # ]
