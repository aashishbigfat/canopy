"""
Pydantic schemas for Report API.
"""
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


# ==================== Report Schemas ====================

class ReportBase(BaseModel):
    """Base schema for Report."""
    name: str
    description: Optional[str] = None
    report_type: str = "custom"
    entity_type: str
    columns: List[str] = Field(default_factory=list)
    filters: Dict[str, Any] = Field(default_factory=dict)
    group_by: Optional[str] = None
    order_by: Optional[str] = None
    order_direction: str = "desc"
    limit: Optional[int] = None
    chart_type: Optional[str] = None
    chart_config: Dict[str, Any] = Field(default_factory=dict)
    is_public: bool = False
    is_favorite: bool = False


class ReportCreate(ReportBase):
    """Schema for creating a report."""
    shared_with: List[str] = Field(default_factory=list)


class ReportUpdate(BaseModel):
    """Schema for updating a report."""
    name: Optional[str] = None
    description: Optional[str] = None
    report_type: Optional[str] = None
    columns: Optional[List[str]] = None
    filters: Optional[Dict[str, Any]] = None
    group_by: Optional[str] = None
    order_by: Optional[str] = None
    order_direction: Optional[str] = None
    limit: Optional[int] = None
    chart_type: Optional[str] = None
    chart_config: Optional[Dict[str, Any]] = None
    is_public: Optional[bool] = None
    is_favorite: Optional[bool] = None
    shared_with: Optional[List[str]] = None


class ReportResponse(ReportBase):
    """Schema for report response."""
    id: str
    shared_with: List[str] = Field(default_factory=list)
    is_default: bool = False
    created_by: Optional[str] = None
    owner_id: Optional[str] = None
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    last_run_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ReportListResponse(BaseModel):
    """Schema for paginated report list."""
    reports: List[ReportResponse]
    total: int
    page: int
    per_page: int


# ==================== Report Schedule Schemas ====================

class ReportScheduleBase(BaseModel):
    """Base schema for ReportSchedule."""
    frequency: str = "daily"
    day_of_week: Optional[int] = None
    day_of_month: Optional[int] = None
    time_of_day: str = "09:00"
    timezone: str = "UTC"
    delivery_method: str = "email"
    recipients: List[str] = Field(default_factory=list)
    webhook_url: Optional[str] = None
    export_format: str = "pdf"
    include_charts: bool = True


class ReportScheduleCreate(ReportScheduleBase):
    """Schema for creating a report schedule."""
    report_id: str


class ReportScheduleUpdate(BaseModel):
    """Schema for updating a report schedule."""
    frequency: Optional[str] = None
    day_of_week: Optional[int] = None
    day_of_month: Optional[int] = None
    time_of_day: Optional[str] = None
    timezone: Optional[str] = None
    delivery_method: Optional[str] = None
    recipients: Optional[List[str]] = None
    webhook_url: Optional[str] = None
    export_format: Optional[str] = None
    include_charts: Optional[bool] = None
    is_active: Optional[bool] = None


class ReportScheduleResponse(ReportScheduleBase):
    """Schema for report schedule response."""
    id: str
    report_id: str
    report_name: Optional[str] = None
    is_active: bool = True
    last_sent_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    send_count: int = 0
    created_by: Optional[str] = None
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ==================== Report Execution Schemas ====================

class ReportExecutionResponse(BaseModel):
    """Schema for report execution response."""
    id: str
    report_id: str
    report_name: Optional[str] = None
    schedule_id: Optional[str] = None
    execution_type: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    row_count: Optional[int] = None
    file_path: Optional[str] = None
    file_url: Optional[str] = None
    export_format: Optional[str] = None
    error_message: Optional[str] = None
    executed_by: Optional[str] = None
    tenant_id: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# ==================== Report Run Schemas ====================

class ReportRunRequest(BaseModel):
    """Schema for running a report."""
    export_format: Optional[str] = None  # pdf, csv, excel
    include_charts: bool = True
    filters_override: Optional[Dict[str, Any]] = None


class ReportRunResponse(BaseModel):
    """Schema for report run result."""
    execution_id: str
    status: str
    data: Optional[List[Dict[str, Any]]] = None
    total_rows: int = 0
    chart_data: Optional[Dict[str, Any]] = None
    file_url: Optional[str] = None


# ==================== Dashboard Widget Schemas ====================

class DashboardWidgetData(BaseModel):
    """Schema for dashboard widget data."""
    widget_type: str  # count, chart, table, metric
    title: str
    value: Optional[Any] = None
    data: Optional[List[Dict[str, Any]]] = None
    chart_config: Optional[Dict[str, Any]] = None
    change_percent: Optional[float] = None
    trend: Optional[str] = None  # up, down, stable
