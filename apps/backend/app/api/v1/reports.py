"""
API endpoints for Reports and Analytics.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_user, check_permission
from app.models.user import User
from app.services.report_service import report_service
from app.schemas.report import (
    ReportCreate, ReportUpdate, ReportResponse, ReportListResponse,
    ReportScheduleCreate, ReportScheduleUpdate, ReportScheduleResponse,
    ReportExecutionResponse, ReportRunRequest, ReportRunResponse
)

router = APIRouter()


# ==================== Report Schedules ====================

@router.post("/schedules", response_model=ReportScheduleResponse)
async def create_schedule(
    data: ReportScheduleCreate,
    current_user: User = Depends(check_permission("create_report"))
):
    """Create a report schedule."""
    try:
        schedule = await report_service.create_schedule(
            data=data,
            user_id=str(current_user.id),
            tenant_id=current_user.tenant_id
        )
        return ReportScheduleResponse(
            id=str(schedule.id),
            **schedule.model_dump(exclude={"id"})
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/schedules", response_model=list[ReportScheduleResponse])
async def list_schedules(
    report_id: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(check_permission("view_report"))
):
    """List report schedules."""
    schedules = await report_service.list_schedules(
        tenant_id=current_user.tenant_id,
        report_id=report_id,
        is_active=is_active
    )
    return [
        ReportScheduleResponse(id=str(s.id), **s.model_dump(exclude={"id"}))
        for s in schedules
    ]


@router.get("/schedules/{schedule_id}", response_model=ReportScheduleResponse)
async def get_schedule(
    schedule_id: str,
    current_user: User = Depends(check_permission("view_report"))
):
    """Get a schedule by ID."""
    schedule = await report_service.get_schedule(schedule_id, current_user.tenant_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return ReportScheduleResponse(
        id=str(schedule.id),
        **schedule.model_dump(exclude={"id"})
    )


@router.put("/schedules/{schedule_id}", response_model=ReportScheduleResponse)
async def update_schedule(
    schedule_id: str,
    data: ReportScheduleUpdate,
    current_user: User = Depends(check_permission("edit_report"))
):
    """Update a report schedule."""
    schedule = await report_service.update_schedule(
        schedule_id=schedule_id,
        data=data,
        tenant_id=current_user.tenant_id
    )
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return ReportScheduleResponse(
        id=str(schedule.id),
        **schedule.model_dump(exclude={"id"})
    )


@router.delete("/schedules/{schedule_id}")
async def delete_schedule(
    schedule_id: str,
    current_user: User = Depends(check_permission("delete_report"))
):
    """Delete a report schedule."""
    deleted = await report_service.delete_schedule(schedule_id, current_user.tenant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"message": "Schedule deleted successfully"}


# ==================== Report CRUD ====================

@router.post("", response_model=ReportResponse)
async def create_report(
    data: ReportCreate,
    current_user: User = Depends(check_permission("create_report"))
):
    """Create a new report."""
    report = await report_service.create_report(
        data=data,
        user_id=str(current_user.id),
        tenant_id=current_user.tenant_id
    )
    return ReportResponse(
        id=str(report.id),
        **report.model_dump(exclude={"id"})
    )


@router.get("", response_model=ReportListResponse)
async def list_reports(
    report_type: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    is_public: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(check_permission("view_report"))
):
    """List reports with filtering and pagination."""
    reports, total = await report_service.list_reports(
        tenant_id=current_user.tenant_id,
        user_id=str(current_user.id),
        report_type=report_type,
        entity_type=entity_type,
        is_public=is_public,
        search=search,
        page=page,
        per_page=per_page
    )
    
    return ReportListResponse(
        reports=[
            ReportResponse(id=str(r.id), **r.model_dump(exclude={"id"}))
            for r in reports
        ],
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/favorites", response_model=list[ReportResponse])
async def get_favorite_reports(
    current_user: User = Depends(check_permission("view_report"))
):
    """Get favorite reports for current user."""
    reports = await report_service.get_favorite_reports(
        user_id=str(current_user.id),
        tenant_id=current_user.tenant_id
    )
    return [
        ReportResponse(id=str(r.id), **r.model_dump(exclude={"id"}))
        for r in reports
    ]


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: str,
    current_user: User = Depends(check_permission("view_report"))
):
    """Get a report by ID."""
    report = await report_service.get_report(report_id, current_user.tenant_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return ReportResponse(
        id=str(report.id),
        **report.model_dump(exclude={"id"})
    )


@router.put("/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: str,
    data: ReportUpdate,
    current_user: User = Depends(check_permission("edit_report"))
):
    """Update a report."""
    report = await report_service.update_report(
        report_id=report_id,
        data=data,
        tenant_id=current_user.tenant_id
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return ReportResponse(
        id=str(report.id),
        **report.model_dump(exclude={"id"})
    )


@router.delete("/{report_id}")
async def delete_report(
    report_id: str,
    current_user: User = Depends(check_permission("delete_report"))
):
    """Delete a report."""
    deleted = await report_service.delete_report(report_id, current_user.tenant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"message": "Report deleted successfully"}


@router.post("/{report_id}/favorite", response_model=ReportResponse)
async def toggle_favorite(
    report_id: str,
    current_user: User = Depends(check_permission("view_report"))
):
    """Toggle favorite status of a report."""
    report = await report_service.toggle_favorite(report_id, current_user.tenant_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return ReportResponse(
        id=str(report.id),
        **report.model_dump(exclude={"id"})
    )


@router.post("/{report_id}/duplicate", response_model=ReportResponse)
async def duplicate_report(
    report_id: str,
    name: Optional[str] = Query(None),
    current_user: User = Depends(check_permission("create_report"))
):
    """Duplicate an existing report."""
    report = await report_service.duplicate_report(
        report_id=report_id,
        user_id=str(current_user.id),
        tenant_id=current_user.tenant_id,
        new_name=name
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return ReportResponse(
        id=str(report.id),
        **report.model_dump(exclude={"id"})
    )


# ==================== Report Execution ====================

@router.post("/{report_id}/run", response_model=ReportRunResponse)
async def run_report(
    report_id: str,
    request: Optional[ReportRunRequest] = None,
    current_user: User = Depends(check_permission("view_report"))
):
    """Execute a report and get results."""
    try:
        result = await report_service.run_report(
            report_id=report_id,
            user_id=str(current_user.id),
            tenant_id=current_user.tenant_id,
            request=request
        )
        return ReportRunResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report execution failed: {str(e)}")


@router.get("/{report_id}/executions", response_model=list[ReportExecutionResponse])
async def get_execution_history(
    report_id: str,
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(check_permission("view_report"))
):
    """Get execution history for a report."""
    executions = await report_service.get_execution_history(
        report_id=report_id,
        tenant_id=current_user.tenant_id,
        limit=limit
    )
    return [
        ReportExecutionResponse(id=str(e.id), **e.model_dump(exclude={"id"}))
        for e in executions
    ]


# ==================== Dashboard ====================

@router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_user: User = Depends(check_permission("view_report"))
):
    """Get dashboard statistics."""
    return await report_service.get_dashboard_stats(
        tenant_id=current_user.tenant_id,
        user_id=str(current_user.id)
    )
