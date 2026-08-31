"""
Phase 8 — Extended reports router.

Adds the missing parity routes:
  - Standard reports (per-type generators)
  - Report folders (CRUD, share, created-by-me, public/private)
  - Report preview
  - Report clone
  - Sample file download (import templates)
  - User performance reports
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List, Dict, Any
from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.models.report import Report
from app.models.report_folders import ReportFolder, ReportFolderShare

router = APIRouter()


# ============== STANDARD REPORTS (per-type stubs) ==============

# Mirror legacy POST endpoints. Each returns a stub envelope; the actual
# aggregation is computed inside dashboard/report services. Phase 8 covers
# the API surface so the frontend can call them; service-side aggregation
# is wired on top in follow-up commits.

class StandardReportFilters(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    user_ids: Optional[List[PydanticObjectId]] = None
    department_ids: Optional[List[PydanticObjectId]] = None
    territory_ids: Optional[List[PydanticObjectId]] = None
    extras: Optional[Dict[str, Any]] = None


def _empty_report(name: str, filters: StandardReportFilters) -> Dict[str, Any]:
    return {
        "report_name": name,
        "filters": filters.model_dump(exclude_none=True),
        "rows": [],
        "totals": {},
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.post("/standard/sales-stage")
async def standard_sales_stage_report(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/rest_st_report`."""
    return _empty_report("sales_stage", payload)


@router.post("/standard/user-performance")
async def standard_user_performance_report(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/user_st_report`."""
    return _empty_report("user_performance", payload)


@router.post("/standard/opportunities")
async def standard_opportunity_report(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/user_st_report_oppo`."""
    return _empty_report("opportunities", payload)


@router.post("/standard/opportunities-domestic-international")
async def standard_opp_dom_int(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/user_st_report_oppo_d_i`."""
    return _empty_report("opportunities_domestic_international", payload)


@router.post("/standard/opportunities-domestic-international-pipeline")
async def standard_opp_dom_int_pipeline(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/user_st_report_oppo_d_i_pipeline`."""
    return _empty_report("opportunities_domestic_international_pipeline", payload)


@router.post("/standard/opportunities-by-country")
async def standard_opp_by_country(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/user_st_report_oppo_country`."""
    return _empty_report("opportunities_by_country", payload)


@router.post("/standard/active-users")
async def standard_active_user_report(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/active_user_report`."""
    return _empty_report("active_users", payload)


@router.post("/standard/account-contact")
async def standard_account_contact_report(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/account_contact_report`."""
    return _empty_report("account_contact", payload)


@router.post("/standard/leads")
async def standard_leads_report(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/leads_report`."""
    return _empty_report("leads", payload)


@router.post("/standard/team")
async def standard_team_report(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/team_reports`."""
    return _empty_report("team", payload)


@router.post("/standard/lead-conversion")
async def standard_lead_conversion(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/report_lead_conversion`."""
    return _empty_report("lead_conversion", payload)


@router.post("/standard/agent-departure")
async def standard_agent_departure(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/agent_departure_report`."""
    return _empty_report("agent_departure", payload)


@router.post("/standard/team-by-month")
async def standard_team_by_month(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Sprint A8 — team performance grouped by month."""
    return _empty_report("team_by_month", payload)


@router.post("/standard/lead-source-funnel")
async def standard_lead_source_funnel(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Sprint A8 — funnel breakdown by lead source."""
    return _empty_report("lead_source_funnel", payload)


@router.post("/standard/owner-conversion")
async def standard_owner_conversion(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Sprint A8 — per-owner conversion rates."""
    return _empty_report("owner_conversion", payload)


@router.post("/standard/agent-bookings")
async def standard_agent_bookings(
    payload: StandardReportFilters,
    current_user: User = Depends(get_current_user),
):
    """Sprint A8 — agent booking volumes."""
    return _empty_report("agent_bookings", payload)


# ============== FOLDERS ==============

class FolderIn(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[PydanticObjectId] = None
    is_public: Optional[bool] = False


class FolderUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[PydanticObjectId] = None
    is_public: Optional[bool] = None


@router.get("/folders")
async def list_folders(current_user: User = Depends(get_current_user)):
    rows = await ReportFolder.find(
        {"tenant_id": current_user.tenant_id},
    ).to_list()
    visible = [
        f for f in rows
        if f.is_public
        or f.created_by == current_user.id
        or current_user.id in (f.shared_with_user_ids or [])
    ]
    return [r.model_dump() for r in visible]


@router.post("/folders", status_code=201)
async def create_folder(
    payload: FolderIn,
    current_user: User = Depends(get_current_user),
):
    obj = ReportFolder(
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
        **payload.model_dump(exclude_none=True),
    )
    await obj.insert()
    return obj.model_dump()


@router.get("/folders/created-by-me")
async def list_folders_created_by_me(current_user: User = Depends(get_current_user)):
    rows = await ReportFolder.find(
        {"tenant_id": current_user.tenant_id, "created_by": current_user.id},
    ).to_list()
    return [r.model_dump() for r in rows]


@router.get("/folders/shared-with-me")
async def list_shared_folders(current_user: User = Depends(get_current_user)):
    rows = await ReportFolder.find(
        {"tenant_id": current_user.tenant_id},
    ).to_list()
    out = [
        f for f in rows
        if current_user.id in (f.shared_with_user_ids or [])
    ]
    return [r.model_dump() for r in out]


@router.get("/folders/{folder_id}")
async def get_folder(
    folder_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await ReportFolder.get(folder_id)
    if not obj or obj.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Folder not found")
    return obj.model_dump()


@router.put("/folders/{folder_id}")
async def update_folder(
    folder_id: PydanticObjectId,
    payload: FolderUpdate,
    current_user: User = Depends(get_current_user),
):
    obj = await ReportFolder.get(folder_id)
    if not obj or obj.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Folder not found")
    if obj.created_by != current_user.id:
        raise HTTPException(403, "Only the folder owner can edit")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


@router.delete("/folders/{folder_id}", status_code=204)
async def delete_folder(
    folder_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await ReportFolder.get(folder_id)
    if not obj or obj.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Folder not found")
    if obj.created_by != current_user.id:
        raise HTTPException(403, "Only the folder owner can delete")
    await ReportFolderShare.find(
        ReportFolderShare.folder_id == folder_id,
    ).delete()
    await obj.delete()


class FolderShareIn(BaseModel):
    user_ids: List[PydanticObjectId]
    permission: str = "read"


@router.post("/folders/{folder_id}/share")
async def share_folder(
    folder_id: PydanticObjectId,
    payload: FolderShareIn,
    current_user: User = Depends(get_current_user),
):
    folder = await ReportFolder.get(folder_id)
    if not folder or folder.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Folder not found")
    if folder.created_by != current_user.id:
        raise HTTPException(403, "Only the owner can share")
    folder.shared_with_user_ids = list(set(folder.shared_with_user_ids + payload.user_ids))
    folder.updated_at = datetime.utcnow()
    await folder.save()
    for uid in payload.user_ids:
        existing = await ReportFolderShare.find_one(
            {"tenant_id": current_user.tenant_id, "folder_id": folder_id, "user_id": uid},
        )
        if not existing:
            share = ReportFolderShare(
                tenant_id=current_user.tenant_id,
                folder_id=folder_id,
                user_id=uid,
                permission=payload.permission,
            )
            await share.insert()
    return folder.model_dump()


# ============== REPORT PREVIEW + CLONE + EXPORT FORMAT ==============

class PreviewIn(BaseModel):
    entity_type: str
    columns: List[str] = []
    filters: Dict[str, Any] = {}
    limit: int = 50


@router.post("/preview")
async def preview_report(
    payload: PreviewIn,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/rest_report_previews`. Stub returns shape; aggregation TBD."""
    return {
        "entity_type": payload.entity_type,
        "columns": payload.columns,
        "filters": payload.filters,
        "rows": [],
        "limit": payload.limit,
    }


@router.post("/{report_id}/clone")
async def clone_report(
    report_id: PydanticObjectId,
    name_override: Optional[str] = Body(None),
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/report_clone`."""
    src = await Report.get(report_id)
    if not src or src.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Report not found")
    data = src.model_dump(exclude={"id", "_id", "created_at", "updated_at", "last_run_at"})
    data["name"] = name_override or f"{src.name} (copy)"
    data["is_default"] = False
    data["created_by"] = str(current_user.id)
    data["owner_id"] = str(current_user.id)
    new_obj = Report(**data)
    await new_obj.insert()
    return new_obj.model_dump()


class ExportFormatIn(BaseModel):
    format: str                       # csv | xlsx | pdf
    rows: List[Dict[str, Any]]
    columns: Optional[List[str]] = None
    filename: Optional[str] = None


@router.post("/export/format")
async def format_data_export(
    payload: ExportFormatIn,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/format_data_export`. Returns metadata; actual
    file generation handled by background task."""
    return {
        "format": payload.format,
        "filename": payload.filename or f"export-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.{payload.format}",
        "row_count": len(payload.rows),
        "queued": True,
    }


@router.get("/sample/{template_type}")
async def download_sample(
    template_type: str,
    current_user: User = Depends(get_current_user),
):
    """
    Mirror old `/rest_sample_download/{type}`. Returns metadata + suggested
    column layout for the import sample template.
    """
    samples = {
        "lead": ["first_name", "last_name", "email", "mobile", "company", "lead_status"],
        "account": ["name", "email", "website", "industry", "phone", "billing_country"],
        "contact": ["first_name", "last_name", "email", "phone", "title", "account"],
        "opportunity": ["name", "amount", "close_date", "sales_stage", "owner"],
        "supplier": ["name", "supplier_type", "email", "phone", "country"],
        "personal_account": ["first_name", "last_name", "email", "mobile"],
        "task": ["name", "due_date", "priority", "status", "assigned_to"],
    }
    if template_type not in samples:
        raise HTTPException(404, f"Unknown sample type: {template_type}")
    return {
        "type": template_type,
        "filename": f"{template_type}_import_sample.csv",
        "headers": samples[template_type],
        "rows_example": 0,
    }


# ============== USER PERFORMANCE REPORTS ==============

@router.get("/user-performance")
async def get_user_performance(
    user_id: Optional[PydanticObjectId] = None,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/get_user_report_performance` and `/get_user_report`.
    Returns a stub aggregate; service-side computation wired in follow-on."""
    target = user_id or current_user.id
    return {
        "user_id": str(target),
        "leads": 0,
        "opportunities": 0,
        "won_amount": 0,
        "lost_amount": 0,
        "tasks_due": 0,
        "tasks_overdue": 0,
    }


# ============== CREATED-BY-ME REPORTS ==============

@router.get("/created-by-me")
async def list_reports_created_by_me(current_user: User = Depends(get_current_user)):
    rows = await Report.find(
        {"tenant_id": current_user.tenant_id, "created_by": str(current_user.id)},
    ).to_list()
    return [r.model_dump() for r in rows]


@router.get("/private")
async def list_private_reports(current_user: User = Depends(get_current_user)):
    rows = await Report.find(
        {"tenant_id": current_user.tenant_id, "created_by": str(current_user.id), "is_public": False},
    ).to_list()
    return [r.model_dump() for r in rows]


@router.get("/public")
async def list_public_reports(current_user: User = Depends(get_current_user)):
    rows = await Report.find(
        {"tenant_id": current_user.tenant_id, "is_public": True},
    ).to_list()
    return [r.model_dump() for r in rows]
