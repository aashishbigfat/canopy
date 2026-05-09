"""
Pydantic schemas for Dashboard API.
"""
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


# ==================== Widget Schemas ====================

class WidgetPosition(BaseModel):
    """Widget position in dashboard grid."""
    x: int = 0
    y: int = 0
    w: int = 1  # Width in grid units
    h: int = 1  # Height in grid units


class WidgetBase(BaseModel):
    """Base schema for DashboardWidget."""
    name: str
    widget_type: str
    entity_type: Optional[str] = None
    metric: Optional[str] = None
    field: Optional[str] = None
    filters: Dict[str, Any] = Field(default_factory=dict)
    group_by: Optional[str] = None
    time_range: str = "this_month"
    chart_type: Optional[str] = None
    chart_options: Dict[str, Any] = Field(default_factory=dict)
    size: str = "medium"
    color: Optional[str] = None
    icon: Optional[str] = None
    refresh_interval: int = 0


class WidgetCreate(WidgetBase):
    """Schema for creating a widget."""
    pass


class WidgetUpdate(BaseModel):
    """Schema for updating a widget."""
    name: Optional[str] = None
    widget_type: Optional[str] = None
    entity_type: Optional[str] = None
    metric: Optional[str] = None
    field: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None
    group_by: Optional[str] = None
    time_range: Optional[str] = None
    chart_type: Optional[str] = None
    chart_options: Optional[Dict[str, Any]] = None
    size: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    refresh_interval: Optional[int] = None


class WidgetResponse(WidgetBase):
    """Schema for widget response."""
    id: str
    is_system: bool = False
    created_by: Optional[str] = None
    owner_id: Optional[str] = None
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class WidgetDataResponse(BaseModel):
    """Schema for widget data response."""
    widget_id: str
    widget_type: str
    title: str
    value: Optional[Any] = None
    data: Optional[List[Dict[str, Any]]] = None
    chart_data: Optional[Dict[str, Any]] = None
    change_percent: Optional[float] = None
    trend: Optional[str] = None  # up, down, stable


# ==================== Dashboard Schemas ====================

class DashboardWidgetEntry(BaseModel):
    """Schema for widget entry in dashboard."""
    widget_id: str
    position: WidgetPosition


class DashboardBase(BaseModel):
    """Base schema for Dashboard."""
    name: str
    description: Optional[str] = None
    layout: str = "grid"
    columns: int = 3


class DashboardCreate(DashboardBase):
    """Schema for creating a dashboard."""
    widgets: List[DashboardWidgetEntry] = Field(default_factory=list)
    is_public: bool = False


class DashboardUpdate(BaseModel):
    """Schema for updating a dashboard."""
    name: Optional[str] = None
    description: Optional[str] = None
    layout: Optional[str] = None
    columns: Optional[int] = None
    widgets: Optional[List[DashboardWidgetEntry]] = None
    is_public: Optional[bool] = None
    shared_with: Optional[List[str]] = None


class DashboardResponse(DashboardBase):
    """Schema for dashboard response."""
    id: str
    widgets: List[Dict[str, Any]] = Field(default_factory=list)
    is_default: bool = False
    is_public: bool = False
    shared_with: List[str] = Field(default_factory=list)
    created_by: Optional[str] = None
    owner_id: Optional[str] = None
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class DashboardListResponse(BaseModel):
    """Schema for paginated dashboard list."""
    dashboards: List[DashboardResponse]
    total: int


# ==================== User Preference Schemas ====================

class DashboardPreferenceUpdate(BaseModel):
    """Schema for updating dashboard preferences."""
    default_dashboard_id: Optional[str] = None
    hidden_widgets: Optional[List[str]] = None
    preferred_layout: Optional[str] = None
    preferred_columns: Optional[int] = None
    dark_mode: Optional[bool] = None
    compact_view: Optional[bool] = None


class DashboardPreferenceResponse(BaseModel):
    """Schema for dashboard preference response."""
    user_id: str
    default_dashboard_id: Optional[str] = None
    hidden_widgets: List[str] = Field(default_factory=list)
    preferred_layout: str = "grid"
    preferred_columns: int = 3
    dark_mode: bool = False
    compact_view: bool = False
    tenant_id: str
    
    class Config:
        from_attributes = True


# ==================== Analytics Schemas ====================

class AnalyticsSummary(BaseModel):
    """Schema for analytics summary — industry-agnostic."""
    accounts_total: int = 0
    contacts_total: int = 0
    leads_total: int = 0
    opportunities_total: int = 0
    leads_this_month: int = 0
    opportunities_this_month: int = 0
    won_this_month: int = 0
    revenue_this_month: float = 0.0
    conversion_rate: float = 0.0
    
    # Real-time dashboard fields
    total_opportunities: int = 0
    today_opportunities: int = 0
    open_opportunities: int = 0
    b2c_open_opportunities: int = 0
    b2b_open_opportunities: int = 0
    b2b_direct_open_opportunities: int = 0
    today_checkout: int = 0
    tomorrow_departures: int = 0
    today_revenue: float = 0.0
    
    # Industry context — tells the frontend which industry this tenant belongs to
    industry: Optional[str] = "travel"


class PipelineStage(BaseModel):
    """Schema for pipeline stage data."""
    stage: str
    count: int
    value: float


class PipelineAnalytics(BaseModel):
    """Schema for pipeline analytics."""
    stages: List[PipelineStage]
    total_count: int = 0
    total_value: float = 0.0


class KeyDeal(BaseModel):
    """Schema for a key deal (important opportunity) — industry-agnostic."""
    id: str
    name: str
    stage: Optional[str] = None
    owner_name: Optional[str] = None
    amount: Optional[float] = None
    # Industry-specific metadata — frontend reads this based on the tenant's industry
    industry_data: Optional[Dict[str, Any]] = Field(default_factory=dict)


class TaskSummary(BaseModel):
    """Schema for task summary counts."""
    missed_count: int = 0
    payment_reminder_count: int = 0
    completed_today: int = 0
    upcoming_count: int = 0
