"""
Dashboard models for customizable dashboards and widgets.
"""
from datetime import datetime
from typing import Optional, List, Any, Dict
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field


class DashboardWidget(Document):
    """Dashboard widget model for individual dashboard components."""
    
    # Basic Info
    name: str
    widget_type: str  # count, chart, table, metric, list, calendar, funnel
    
    # Data Configuration
    entity_type: Optional[str] = None  # accounts, contacts, leads, opportunities
    metric: Optional[str] = None  # count, sum, average
    field: Optional[str] = None  # Field to aggregate
    filters: Dict[str, Any] = Field(default_factory=dict)
    group_by: Optional[str] = None
    time_range: str = Field(default="this_month")  # today, this_week, this_month, this_quarter, this_year, custom
    
    # Chart Configuration
    chart_type: Optional[str] = None  # bar, line, pie, donut, area
    chart_options: Dict[str, Any] = Field(default_factory=dict)
    
    # Display Configuration
    size: str = Field(default="medium")  # small, medium, large, full
    color: Optional[str] = None
    icon: Optional[str] = None
    
    # Refresh
    refresh_interval: int = Field(default=0)  # In seconds, 0 = no auto-refresh
    
    # Status
    is_system: bool = Field(default=False)  # System-defined widgets
    
    # Ownership
    created_by: Optional[str] = None
    owner_id: Optional[str] = None
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "dashboard_widgets"
        # indexes = [
        # [("tenant_id", 1), ("widget_type", 1)],
            # [("tenant_id", 1), ("created_by", 1)],
        # ]


class Dashboard(Document):
    """Dashboard model for user-customizable dashboards."""
    
    # Basic Info
    name: Indexed(str)
    description: Optional[str] = None
    
    # Layout Configuration
    layout: str = Field(default="grid")  # grid, list
    columns: int = Field(default=3)
    
    # Widgets
    widgets: List[Dict[str, Any]] = Field(default_factory=list)
    # Each widget entry: {widget_id: str, position: {x, y, w, h}}
    
    # Access & Visibility
    is_default: bool = Field(default=False)
    is_public: bool = Field(default=False)
    shared_with: List[str] = Field(default_factory=list)  # User IDs
    
    # Ownership
    created_by: Optional[str] = None
    owner_id: Optional[str] = None
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "dashboards"
        # indexes = [
        # [("tenant_id", 1), ("name", 1)],
            # [("tenant_id", 1), ("created_by", 1)],
            # [("tenant_id", 1), ("is_default", 1)],
        # ]


class DashboardUserPreference(Document):
    """User preferences for dashboards."""
    
    user_id: Indexed(PydanticObjectId)
    default_dashboard_id: Optional[str] = None
    
    # Widget visibility preferences
    hidden_widgets: List[str] = Field(default_factory=list)
    
    # Layout preferences
    preferred_layout: str = Field(default="grid")
    preferred_columns: int = Field(default=3)
    
    # Theme
    dark_mode: bool = Field(default=False)
    compact_view: bool = Field(default=False)
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "dashboard_user_preferences"
        # indexes = [
        # [("tenant_id", 1), ("user_id", 1)],
        # ]
