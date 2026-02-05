"""
Report models for analytics and reporting functionality.
"""
from datetime import datetime
from typing import Optional, List, Any, Dict
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field


class Report(Document):
    """Report model for saved reports and analytics."""
    
    # Basic Info
    name: Indexed(str)
    description: Optional[str] = None
    report_type: str = Field(default="custom")  # custom, sales, leads, opportunities, activities, etc.
    
    # Report Configuration
    entity_type: str  # accounts, contacts, leads, opportunities, etc.
    columns: List[str] = Field(default_factory=list)  # Selected columns
    filters: Dict[str, Any] = Field(default_factory=dict)  # Filter criteria
    group_by: Optional[str] = None  # Group by field
    order_by: Optional[str] = None  # Sort field
    order_direction: str = Field(default="desc")  # asc or desc
    limit: Optional[int] = None  # Row limit
    
    # Chart Configuration
    chart_type: Optional[str] = None  # bar, line, pie, donut, funnel, etc.
    chart_config: Dict[str, Any] = Field(default_factory=dict)
    
    # Access & Visibility
    is_public: bool = Field(default=False)
    is_favorite: bool = Field(default=False)
    is_default: bool = Field(default=False)
    shared_with: List[str] = Field(default_factory=list)  # User IDs
    
    # Ownership
    created_by: Optional[str] = None
    owner_id: Optional[str] = None
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_run_at: Optional[datetime] = None
    
    class Settings:
        name = "reports"
        # indexes = [
        # [("tenant_id", 1), ("name", 1)],
            # [("tenant_id", 1), ("report_type", 1)],
            # [("tenant_id", 1), ("entity_type", 1)],
            # [("tenant_id", 1), ("created_by", 1)],
            # [("tenant_id", 1), ("is_public", 1)],
        # ]


class ReportSchedule(Document):
    """Scheduled report model for automated report delivery."""
    
    # Report Reference
    report_id: Indexed(PydanticObjectId)
    report_name: Optional[str] = None
    
    # Schedule Configuration
    frequency: str = Field(default="daily")  # daily, weekly, monthly
    day_of_week: Optional[int] = None  # 0-6 for weekly
    day_of_month: Optional[int] = None  # 1-31 for monthly
    time_of_day: str = Field(default="09:00")  # HH:MM format
    timezone: str = Field(default="UTC")
    
    # Delivery Configuration
    delivery_method: str = Field(default="email")  # email, webhook
    recipients: List[str] = Field(default_factory=list)  # Email addresses
    webhook_url: Optional[str] = None
    
    # Export Options
    export_format: str = Field(default="pdf")  # pdf, csv, excel
    include_charts: bool = Field(default=True)
    
    # Status
    is_active: bool = Field(default=True)
    last_sent_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    send_count: int = Field(default=0)
    
    # Ownership
    created_by: Optional[str] = None
    owner_id: Optional[str] = None
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "report_schedules"
        # indexes = [
        # [("tenant_id", 1), ("report_id", 1)],
            # [("tenant_id", 1), ("is_active", 1)],
            # [("next_run_at", 1)],
        # ]


class ReportExecution(Document):
    """Report execution history for tracking runs and exports."""
    
    # Report Reference
    report_id: Indexed(PydanticObjectId)
    report_name: Optional[str] = None
    schedule_id: Optional[str] = None
    
    # Execution Details
    execution_type: str = Field(default="manual")  # manual, scheduled
    status: str = Field(default="pending")  # pending, running, completed, failed
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    
    # Results
    row_count: Optional[int] = None
    file_path: Optional[str] = None
    file_url: Optional[str] = None
    export_format: Optional[str] = None
    error_message: Optional[str] = None
    
    # User
    executed_by: Optional[str] = None
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "report_executions"
        # indexes = [
        # [("tenant_id", 1), ("report_id", 1)],
            # [("tenant_id", 1), ("status", 1)],
            # [("tenant_id", 1), ("created_at", -1)],
        # ]
