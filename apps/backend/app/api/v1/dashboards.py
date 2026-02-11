"""
API endpoints for Dashboards and Widgets.
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_user, check_permission
from app.models.user import User
from app.services.dashboard_service import dashboard_service
from app.schemas.dashboard import (
    DashboardCreate, DashboardUpdate, DashboardResponse, DashboardListResponse,
    WidgetCreate, WidgetUpdate, WidgetResponse, WidgetDataResponse,
    DashboardPreferenceUpdate, DashboardPreferenceResponse,
    AnalyticsSummary, PipelineAnalytics, KeyDeal, TaskSummary
)

router = APIRouter()


# ==================== Widget CRUD ====================

@router.post("/widgets", response_model=WidgetResponse)
async def create_widget(
    data: WidgetCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new widget."""
    widget = await dashboard_service.create_widget(
        data=data,
        user_id=str(current_user.id),
        tenant_id=str(current_user.tenant_id)
    )
    return WidgetResponse(
        id=str(widget.id),
        **widget.model_dump(exclude={"id"})
    )


@router.get("/widgets", response_model=list[WidgetResponse])
async def list_widgets(
    widget_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """List available widgets."""
    widgets = await dashboard_service.list_widgets(
        tenant_id=str(current_user.tenant_id),
        widget_type=widget_type,
        user_id=str(current_user.id)
    )
    return [
        WidgetResponse(id=str(w.id), **w.model_dump(exclude={"id"}))
        for w in widgets
    ]


@router.get("/widgets/{widget_id}", response_model=WidgetResponse)
async def get_widget(
    widget_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a widget by ID."""
    widget = await dashboard_service.get_widget(widget_id, str(current_user.tenant_id))
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")
    return WidgetResponse(
        id=str(widget.id),
        **widget.model_dump(exclude={"id"})
    )


@router.get("/widgets/{widget_id}/data", response_model=WidgetDataResponse)
async def get_widget_data(
    widget_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get widget data by executing its query."""
    try:
        data = await dashboard_service.get_widget_data(
            widget_id=widget_id,
            tenant_id=str(current_user.tenant_id),
            user_id=str(current_user.id)
        )
        return WidgetDataResponse(**data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/widgets/{widget_id}", response_model=WidgetResponse)
async def update_widget(
    widget_id: str,
    data: WidgetUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a widget."""
    widget = await dashboard_service.update_widget(
        widget_id=widget_id,
        data=data,
        tenant_id=str(current_user.tenant_id)
    )
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")
    return WidgetResponse(
        id=str(widget.id),
        **widget.model_dump(exclude={"id"})
    )


@router.delete("/widgets/{widget_id}")
async def delete_widget(
    widget_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a widget."""
    deleted = await dashboard_service.delete_widget(widget_id, str(current_user.tenant_id))
    if not deleted:
        raise HTTPException(status_code=404, detail="Widget not found")
    return {"message": "Widget deleted successfully"}


# ==================== User Preferences ====================

@router.get("/preferences", response_model=DashboardPreferenceResponse)
async def get_preferences(
    current_user: User = Depends(get_current_user)
):
    """Get dashboard preferences for current user."""
    preference = await dashboard_service.get_or_create_preferences(
        user_id=str(current_user.id),
        tenant_id=str(current_user.tenant_id)
    )
    return DashboardPreferenceResponse(
        **preference.model_dump()
    )


@router.put("/preferences", response_model=DashboardPreferenceResponse)
async def update_preferences(
    data: DashboardPreferenceUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update dashboard preferences for current user."""
    preference = await dashboard_service.update_user_preferences(
        user_id=str(current_user.id),
        data=data,
        tenant_id=str(current_user.tenant_id)
    )
    return DashboardPreferenceResponse(
        **preference.model_dump()
    )


# ==================== Analytics ====================

@router.get("/analytics/summary")
async def get_analytics_summary(
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive analytics summary."""
    return await dashboard_service.get_analytics_summary(
        tenant_id=str(current_user.tenant_id),
        user_id=str(current_user.id)
    )


@router.get("/analytics/pipeline")
async def get_pipeline_analytics(
    current_user: User = Depends(get_current_user)
):
    """Get opportunity pipeline analytics."""
    return await dashboard_service.get_pipeline_analytics(
        tenant_id=str(current_user.tenant_id),
        user_id=str(current_user.id)
    )


# ==================== Dashboard CRUD ====================

@router.post("", response_model=DashboardResponse)
async def create_dashboard(
    data: DashboardCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new dashboard."""
    dashboard = await dashboard_service.create_dashboard(
        data=data,
        user_id=str(current_user.id),
        tenant_id=str(current_user.tenant_id)
    )
    return DashboardResponse(
        id=str(dashboard.id),
        **dashboard.model_dump(exclude={"id"})
    )


@router.get("", response_model=DashboardListResponse)
async def list_dashboards(
    current_user: User = Depends(get_current_user)
):
    """List all dashboards for current user."""
    dashboards = await dashboard_service.list_dashboards(
        tenant_id=str(current_user.tenant_id),
        user_id=str(current_user.id)
    )
    return DashboardListResponse(
        dashboards=[
            DashboardResponse(id=str(d.id), **d.model_dump(exclude={"id"}))
            for d in dashboards
        ],
        total=len(dashboards)
    )


@router.get("/default", response_model=DashboardResponse)
async def get_default_dashboard(
    current_user: User = Depends(get_current_user)
):
    """Get the default dashboard for current user."""
    dashboard = await dashboard_service.get_default_dashboard(
        user_id=str(current_user.id),
        tenant_id=str(current_user.tenant_id)
    )
    if not dashboard:
        raise HTTPException(status_code=404, detail="No default dashboard found")
    return DashboardResponse(
        id=str(dashboard.id),
        **dashboard.model_dump(exclude={"id"})
    )


@router.get("/stats", response_model=AnalyticsSummary)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user)
):
    """Get dashboard analytics statistics"""
    return await dashboard_service.get_analytics_summary(
        tenant_id=str(current_user.tenant_id),
        user_id=str(current_user.id)
    )


@router.get("/recent-sales")
async def get_recent_sales(
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """Get recent sales data"""
    return await dashboard_service.get_recent_sales(
        tenant_id=str(current_user.tenant_id),
        user_id=str(current_user.id),
        limit=limit
    )


@router.get("/revenue-chart")
async def get_revenue_chart(
    period: str = Query("month", pattern="^(week|month|year)$"),
    current_user: User = Depends(get_current_user)
):
    """Get revenue chart data"""
    return await dashboard_service.get_revenue_chart(
        tenant_id=str(current_user.tenant_id),
        user_id=str(current_user.id),
        period=period
    )


@router.get("/opportunities-by-stage")
async def get_opportunities_by_stage(
    current_user: User = Depends(get_current_user)
):
    """Get opportunities grouped by sales stage"""
    return await dashboard_service.get_opportunities_by_stage(
        tenant_id=str(current_user.tenant_id),
        user_id=str(current_user.id)
    )


@router.get("/{dashboard_id}", response_model=DashboardResponse)
async def get_dashboard(
    dashboard_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a dashboard by ID."""
    dashboard = await dashboard_service.get_dashboard(dashboard_id, str(current_user.tenant_id))
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return DashboardResponse(
        id=str(dashboard.id),
        **dashboard.model_dump(exclude={"id"})
    )


@router.put("/{dashboard_id}", response_model=DashboardResponse)
async def update_dashboard(
    dashboard_id: str,
    data: DashboardUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a dashboard."""
    dashboard = await dashboard_service.update_dashboard(
        dashboard_id=dashboard_id,
        data=data,
        tenant_id=str(current_user.tenant_id)
    )
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return DashboardResponse(
        id=str(dashboard.id),
        **dashboard.model_dump(exclude={"id"})
    )


@router.delete("/{dashboard_id}")
async def delete_dashboard(
    dashboard_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a dashboard."""
    deleted = await dashboard_service.delete_dashboard(dashboard_id, str(current_user.tenant_id))
    if not deleted:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return {"message": "Dashboard deleted successfully"}


@router.post("/{dashboard_id}/set-default")
async def set_default_dashboard(
    dashboard_id: str,
    current_user: User = Depends(get_current_user)
):
    """Set a dashboard as the user's default."""
    success = await dashboard_service.set_default_dashboard(
        dashboard_id=dashboard_id,
        user_id=str(current_user.id),
        tenant_id=str(current_user.tenant_id)
    )
    if not success:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return {"message": "Default dashboard set successfully"}


# ==================== Analytics ====================

@router.get("/analytics/summary")
async def get_analytics_summary(
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive analytics summary."""
    return await dashboard_service.get_analytics_summary(
        tenant_id=str(current_user.tenant_id),
        user_id=str(current_user.id)
    )


@router.get("/analytics/pipeline")
async def get_pipeline_analytics(
    current_user: User = Depends(get_current_user)
):
    """Get opportunity pipeline analytics."""
    return await dashboard_service.get_pipeline_analytics(
        tenant_id=str(current_user.tenant_id),
        user_id=str(current_user.id)
    )


@router.get("/analytics/key-deals", response_model=List[KeyDeal])
async def get_key_deals(
    limit: int = 5,
    current_user: User = Depends(get_current_user)
):
    """Get key deals (high value opportunities)."""
    return await dashboard_service.get_key_deals(
        tenant_id=str(current_user.tenant_id),
        user_id=str(current_user.id),
        limit=limit
    )


@router.get("/analytics/tasks-summary", response_model=TaskSummary)
async def get_tasks_summary(
    current_user: User = Depends(get_current_user)
):
    """Get summary of tasks."""
    return await dashboard_service.get_task_summary(
        tenant_id=str(current_user.tenant_id),
        user_id=str(current_user.id)
    )
