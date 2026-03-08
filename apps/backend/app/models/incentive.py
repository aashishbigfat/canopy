"""
Incentive models for sales targets, commissions, and performance tracking.
"""
from datetime import datetime
from typing import Optional, List, Any, Dict
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field


class Incentive(Document):
    """Incentive program model."""
    
    # Basic Info
    name: Indexed(str)
    description: Optional[str] = None
    
    # Configuration
    start_date: datetime
    end_date: datetime
    is_active: bool = Field(default=True)
    
    # Eligibility
    eligible_roles: List[str] = Field(default_factory=list)  # Role IDs
    eligible_users: List[str] = Field(default_factory=list)  # User IDs
    
    # Rules
    metric: str = Field(default="revenue")  # revenue, deals_won, profit
    tier_type: str = Field(default="flat")  # flat, tiered
    tiers: List[Dict[str, Any]] = Field(default_factory=list)
    # Tiers example: [{"min": 0, "max": 10000, "rate": 5}, {"min": 10001, "max": 50000, "rate": 7}]
    
    # Payout
    payout_frequency: str = Field(default="monthly")  # monthly, quarterly, annual
    currency: str = Field(default="USD")
    
    # Ownership
    created_by: Optional[str] = None
    owner_id: Optional[str] = None
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "incentives"
        # indexes = [
        # [("tenant_id", 1), ("name", 1)],
            # [("tenant_id", 1), ("is_active", 1)],
        # ]


class IncentiveTarget(Document):
    """Sales target for a user or team."""
    
    # Reference
    incentive_id: Optional[str] = None  # Optional link to specific incentive program
    user_id: Indexed(PydanticObjectId)
    
    # Target Period
    period: str = Field(default="monthly")  # monthly, quarterly, annual
    start_date: datetime
    end_date: datetime
    
    # Goals
    target_amount: float = Field(default=0.0)  # Revenue target
    target_count: int = Field(default=0)  # Deal count target
    
    # Status
    is_active: bool = Field(default=True)
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "incentive_targets"
        # indexes = [
        # [("tenant_id", 1), ("user_id", 1)],
            # [("tenant_id", 1), ("start_date", 1)],
        # ]


class IncentiveAchievement(Document):
    """Tracked achievement against targets/incentives."""
    
    # References
    user_id: Indexed(PydanticObjectId)
    incentive_id: Optional[str] = None
    target_id: Optional[str] = None
    
    # Performance
    period_start: datetime
    period_end: datetime
    
    # Metrics
    achieved_amount: float = Field(default=0.0)
    achieved_count: int = Field(default=0)
    
    # Calculation
    commission_earned: float = Field(default=0.0)
    status: str = Field(default="pending")  # pending, approved, paid
    paid_at: Optional[datetime] = None
    
    # Related Deals
    deal_ids: List[str] = Field(default_factory=list)
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "incentive_achievements"
        # indexes = [
        # [("tenant_id", 1), ("user_id", 1)],
            # [("tenant_id", 1), ("status", 1)],
        # ]
