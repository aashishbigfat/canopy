"""
Pydantic schemas for Incentives API.
"""
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


# ==================== Incentive Program Schemas ====================

class IncentiveBase(BaseModel):
    """Base schema for Incentive."""
    name: str
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    is_active: bool = True
    eligible_roles: List[str] = Field(default_factory=list)
    eligible_users: List[str] = Field(default_factory=list)
    metric: str = "revenue"
    tier_type: str = "flat"
    tiers: List[Dict[str, Any]] = Field(default_factory=list)
    payout_frequency: str = "monthly"
    currency: str = "USD"


class IncentiveCreate(IncentiveBase):
    """Schema for creating an incentive."""
    pass


class IncentiveUpdate(BaseModel):
    """Schema for updating an incentive."""
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    eligible_roles: Optional[List[str]] = None
    eligible_users: Optional[List[str]] = None
    metric: Optional[str] = None
    tier_type: Optional[str] = None
    tiers: Optional[List[Dict[str, Any]]] = None
    payout_frequency: Optional[str] = None
    currency: Optional[str] = None


class IncentiveResponse(IncentiveBase):
    """Schema for incentive response."""
    id: str
    created_by: Optional[str] = None
    owner_id: Optional[str] = None
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class IncentiveListResponse(BaseModel):
    """Schema for paginated incentive list."""
    incentives: List[IncentiveResponse]
    total: int
    page: int
    per_page: int


# ==================== Target Schemas ====================

class TargetBase(BaseModel):
    """Base schema for IncentiveTarget."""
    user_id: str
    period: str = "monthly"
    start_date: datetime
    end_date: datetime
    target_amount: float = 0.0
    target_count: int = 0
    incentive_id: Optional[str] = None
    is_active: bool = True


class TargetCreate(TargetBase):
    """Schema for creating a target."""
    pass


class TargetUpdate(BaseModel):
    """Schema for updating a target."""
    user_id: Optional[str] = None
    period: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    target_amount: Optional[float] = None
    target_count: Optional[int] = None
    incentive_id: Optional[str] = None
    is_active: Optional[bool] = None


class TargetResponse(TargetBase):
    """Schema for target response."""
    id: str
    user_name: Optional[str] = None
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ==================== Achievement Schemas ====================

class AchievementResponse(BaseModel):
    """Schema for achievement response."""
    id: str
    user_id: str
    user_name: Optional[str] = None
    period_start: datetime
    period_end: datetime
    achieved_amount: float
    achieved_count: int
    commission_earned: float
    status: str
    target_amount: Optional[float] = None
    target_progress_percent: Optional[float] = None
    
    class Config:
        from_attributes = True


class AchievementSummary(BaseModel):
    """Schema for user achievement summary."""
    user_id: str
    total_commission: float
    periods: List[AchievementResponse]
