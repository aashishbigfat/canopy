"""BD Visit API endpoints."""
from datetime import datetime
from typing import Optional
import logging

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile

from app.api.deps import check_permission, get_current_user
from app.models.user import User
from app.models.bd_visit import BDVisit
from app.schemas.bd_visit import (
    BDVisitCreate, BDVisitUpdate, BDVisitResponse, BDVisitListResponse,
    BDVisitApprove, BDVisitReject, BDVisitCheckIn, BDVisitCheckOut,
)
from app.services.bd_visit_service import bd_visit_service
from app.services.file_service import FileService
from app.services.visibility_scope import get_visible_owner_ids, is_record_visible

router = APIRouter()
logger = logging.getLogger(__name__)


# ──────────────────── helpers ────────────────────

async def _serialize(visit: BDVisit) -> BDVisitResponse:
    """Convert a BDVisit to its response shape, enriching with user/parent names."""
    owner_name = manager_name = parent_name = None
    try:
        if visit.owner_id:
            owner = await User.find_one({"_id": visit.owner_id, "tenant_id": visit.tenant_id})
            owner_name = owner.name if owner else None
        if visit.reporting_manager_id:
            mgr = await User.find_one({"_id": visit.reporting_manager_id, "tenant_id": visit.tenant_id})
            manager_name = mgr.name if mgr else None
    except Exception:
        pass

    return BDVisitResponse(
        id=str(visit.id),
        tenant_id=str(visit.tenant_id),
        bd_visitable_type=visit.bd_visitable_type,
        bd_visitable_id=str(visit.bd_visitable_id),
        activity_type_id=str(visit.activity_type_id) if visit.activity_type_id else None,
        activity_type_name=visit.activity_type_name,
        title=visit.title,
        description=visit.description,
        scheduled_date=visit.scheduled_date,
        scheduled_duration_min=visit.scheduled_duration_min,
        status=visit.status,
        approval_status=visit.approval_status,
        approved_by=str(visit.approved_by) if visit.approved_by else None,
        approved_at=visit.approved_at,
        rejection_reason=visit.rejection_reason,
        check_in_at=visit.check_in_at,
        check_in_lat=visit.check_in_lat,
        check_in_lng=visit.check_in_lng,
        check_in_accuracy_m=visit.check_in_accuracy_m,
        check_out_at=visit.check_out_at,
        check_out_lat=visit.check_out_lat,
        check_out_lng=visit.check_out_lng,
        outcome=visit.outcome,
        outcome_notes=visit.outcome_notes,
        next_action=visit.next_action,
        next_action_at=visit.next_action_at,
        companion_task_id=str(visit.companion_task_id) if visit.companion_task_id else None,
        expense_ids=[str(x) for x in (visit.expense_ids or [])],
        photo_file_ids=[str(x) for x in (visit.photo_file_ids or [])],
        address_snapshot=visit.address_snapshot,
        territory_id=str(visit.territory_id) if visit.territory_id else None,
        region_id=str(visit.region_id) if visit.region_id else None,
        owner_id=str(visit.owner_id),
        owner_name=owner_name,
        reporting_manager_id=str(visit.reporting_manager_id) if visit.reporting_manager_id else None,
        reporting_manager_name=manager_name,
        parent_name=parent_name,
        industry_data=visit.industry_data or {},
        created_at=visit.created_at,
        updated_at=visit.updated_at,
    )


def _oid(value: Optional[str]) -> Optional[ObjectId]:
    if not value:
        return None
    try:
        return ObjectId(value)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ObjectId")


async def _resolve_default_owner(
    tenant_id: ObjectId,
    fallback_user_id: ObjectId,
    visitable_type: str,
    visitable_id: ObjectId,
) -> ObjectId:
    """Pick the parent's bd_owner_id when available; else fall back to caller."""
    try:
        if visitable_type == "Lead":
            from app.models.lead import Lead
            parent = await Lead.find_one({"_id": visitable_id, "tenant_id": tenant_id})
            if parent and parent.bd_owner_id:
                return parent.bd_owner_id
    except Exception:
        pass
    return fallback_user_id


# ──────────────────── endpoints ────────────────────

@router.post("", response_model=BDVisitResponse, status_code=201)
@router.post("/", response_model=BDVisitResponse, status_code=201)
async def create_visit(
    payload: BDVisitCreate,
    current_user: User = Depends(check_permission("create_bd_visit")),
):
    visitable_oid = _oid(payload.bd_visitable_id)
    if not visitable_oid:
        raise HTTPException(status_code=400, detail="bd_visitable_id required")

    owner_oid = _oid(payload.owner_id) or await _resolve_default_owner(
        current_user.tenant_id, current_user.id, payload.bd_visitable_type, visitable_oid
    )

    try:
        visit = await bd_visit_service.create_visit(
            tenant_id=current_user.tenant_id,
            created_by=current_user.id,
            owner_id=owner_oid,
            visitable_type=payload.bd_visitable_type,
            visitable_id=visitable_oid,
            title=payload.title,
            scheduled_date=payload.scheduled_date,
            activity_type_id=_oid(payload.activity_type_id),
            description=payload.description,
            scheduled_duration_min=payload.scheduled_duration_min,
            reporting_manager_id=_oid(payload.reporting_manager_id),
            industry_data=payload.industry_data,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return await _serialize(visit)


@router.get("", response_model=BDVisitListResponse)
@router.get("/", response_model=BDVisitListResponse)
async def list_visits(
    status: Optional[str] = None,
    approval_status: Optional[str] = None,
    owner_id: Optional[str] = None,
    bd_visitable_type: Optional[str] = None,
    bd_visitable_id: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(check_permission("view_bd_visit")),
):
    visible = await get_visible_owner_ids(current_user)
    visits, total = await bd_visit_service.list_visits(
        tenant_id=current_user.tenant_id,
        visible_owner_ids=visible,
        status=status,
        approval_status=approval_status,
        owner_id=_oid(owner_id),
        bd_visitable_type=bd_visitable_type,
        bd_visitable_id=_oid(bd_visitable_id),
        date_from=date_from,
        date_to=date_to,
        page=page,
        per_page=per_page,
    )
    return BDVisitListResponse(
        visits=[await _serialize(v) for v in visits],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/dashboard-kpis")
async def bd_dashboard_kpis(
    current_user: User = Depends(check_permission("view_bd_panel")),
):
    """BD Panel landing KPIs: my visits today, my pending, week graph,
    approvals owed (when manager). Pulled from real collections."""
    from datetime import time, timedelta
    from app.models.expense import Expense
    today = datetime.utcnow().date()
    start_today = datetime.combine(today, time.min)
    end_today = datetime.combine(today, time.max)
    week_start = start_today - timedelta(days=6)

    tenant_id = current_user.tenant_id
    me = current_user.id

    # My visits today
    today_total = await BDVisit.find({
        "tenant_id": tenant_id, "owner_id": me, "deleted_at": None,
        "scheduled_date": {"$gte": start_today, "$lte": end_today},
    }).count()

    today_completed = await BDVisit.find({
        "tenant_id": tenant_id, "owner_id": me, "deleted_at": None,
        "status": "completed",
        "scheduled_date": {"$gte": start_today, "$lte": end_today},
    }).count()

    # My pending expenses (amount sum, status=submitted)
    pending_exp_amount = 0.0
    pending_exp_count = 0
    async for e in Expense.find({
        "tenant_id": tenant_id, "owner_id": me, "status": "submitted", "deleted_at": None,
    }):
        pending_exp_amount += e.amount
        pending_exp_count += 1

    # Approvals owed to me (as manager)
    visits_to_approve = await BDVisit.find({
        "tenant_id": tenant_id, "reporting_manager_id": me,
        "approval_status": "pending", "deleted_at": None,
    }).count()
    expenses_to_approve = await Expense.find({
        "tenant_id": tenant_id, "reporting_manager_id": me,
        "status": "submitted", "deleted_at": None,
    }).count()

    # 7-day visits-per-day bar chart
    pipeline = [
        {"$match": {
            "tenant_id": tenant_id, "owner_id": me, "deleted_at": None,
            "scheduled_date": {"$gte": week_start, "$lte": end_today},
        }},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$scheduled_date"}},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]
    week_rows = await BDVisit.aggregate(pipeline).to_list()
    week_chart = [{"date": r["_id"], "count": r["count"]} for r in week_rows]

    return {
        "today": {"total": today_total, "completed": today_completed},
        "pending_expenses": {"count": pending_exp_count, "amount": round(pending_exp_amount, 2)},
        "approvals_owed": {
            "visits": visits_to_approve,
            "expenses": expenses_to_approve,
            "total": visits_to_approve + expenses_to_approve,
        },
        "week_chart": week_chart,
    }


@router.get("/today", response_model=BDVisitListResponse)
async def my_today_visits(
    current_user: User = Depends(check_permission("view_bd_visit")),
):
    """Convenience endpoint for the BD's mobile/landing screen."""
    from datetime import time
    today = datetime.utcnow().date()
    start = datetime.combine(today, time.min)
    end = datetime.combine(today, time.max)
    visits, total = await bd_visit_service.list_visits(
        tenant_id=current_user.tenant_id,
        owner_id=current_user.id,
        date_from=start,
        date_to=end,
        per_page=100,
    )
    return BDVisitListResponse(
        visits=[await _serialize(v) for v in visits], total=total, page=1, per_page=100,
    )


@router.get("/pending-approvals", response_model=BDVisitListResponse)
async def my_pending_approvals(
    current_user: User = Depends(check_permission("approve_bd_visit")),
):
    """Visits awaiting approval from the current user as the reporting manager."""
    visits = await bd_visit_service.pending_approvals_for_manager(
        tenant_id=current_user.tenant_id, manager_id=current_user.id
    )
    return BDVisitListResponse(
        visits=[await _serialize(v) for v in visits],
        total=len(visits),
        page=1,
        per_page=len(visits) or 1,
    )


@router.get("/by-entity/{visitable_type}/{visitable_id}", response_model=BDVisitListResponse)
async def visits_for_parent(
    visitable_type: str,
    visitable_id: str,
    current_user: User = Depends(check_permission("view_bd_visit")),
):
    vid = _oid(visitable_id)
    visits = await bd_visit_service.visits_by_parent(
        tenant_id=current_user.tenant_id,
        visitable_type=visitable_type,
        visitable_id=vid,
    )
    return BDVisitListResponse(
        visits=[await _serialize(v) for v in visits],
        total=len(visits), page=1, per_page=len(visits) or 1,
    )


@router.get("/{visit_id}", response_model=BDVisitResponse)
async def get_visit(
    visit_id: str,
    current_user: User = Depends(check_permission("view_bd_visit")),
):
    visit = await bd_visit_service.get_visit(visit_id, current_user.tenant_id)
    if not visit:
        raise HTTPException(status_code=404, detail="BD visit not found")
    visible = await get_visible_owner_ids(current_user)
    if not is_record_visible(visit.owner_id, visible):
        # Managers via reporting_manager_id should also see it
        if visit.reporting_manager_id != current_user.id:
            raise HTTPException(status_code=404, detail="BD visit not found")
    return await _serialize(visit)


@router.put("/{visit_id}", response_model=BDVisitResponse)
async def update_visit(
    visit_id: str,
    payload: BDVisitUpdate,
    current_user: User = Depends(check_permission("edit_bd_visit")),
):
    visit = await bd_visit_service.update_visit(
        visit_id=visit_id,
        updates=payload.model_dump(exclude_unset=True),
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
    )
    if not visit:
        raise HTTPException(status_code=404, detail="BD visit not found")
    return await _serialize(visit)


@router.delete("/{visit_id}")
async def delete_visit(
    visit_id: str,
    current_user: User = Depends(check_permission("delete_bd_visit")),
):
    deleted = await bd_visit_service.delete_visit(visit_id, current_user.tenant_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="BD visit not found")
    return {"error": False, "message": "BD visit deleted"}


@router.post("/{visit_id}/approve", response_model=BDVisitResponse)
async def approve_visit(
    visit_id: str,
    payload: BDVisitApprove,
    current_user: User = Depends(check_permission("approve_bd_visit")),
):
    try:
        visit = await bd_visit_service.approve_visit(visit_id, current_user, notes=payload.notes)
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    if not visit:
        raise HTTPException(status_code=404, detail="BD visit not found")
    return await _serialize(visit)


@router.post("/{visit_id}/reject", response_model=BDVisitResponse)
async def reject_visit(
    visit_id: str,
    payload: BDVisitReject,
    current_user: User = Depends(check_permission("approve_bd_visit")),
):
    try:
        visit = await bd_visit_service.reject_visit(visit_id, current_user, reason=payload.reason)
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    if not visit:
        raise HTTPException(status_code=404, detail="BD visit not found")
    return await _serialize(visit)


@router.post("/{visit_id}/check-in", response_model=BDVisitResponse)
async def check_in_visit(
    visit_id: str,
    payload: BDVisitCheckIn,
    current_user: User = Depends(check_permission("check_in_bd_visit")),
):
    try:
        visit = await bd_visit_service.check_in(
            visit_id, current_user,
            lat=payload.lat, lng=payload.lng, accuracy_m=payload.accuracy_m,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not visit:
        raise HTTPException(status_code=404, detail="BD visit not found")
    return await _serialize(visit)


@router.post("/{visit_id}/check-out", response_model=BDVisitResponse)
async def check_out_visit(
    visit_id: str,
    payload: BDVisitCheckOut,
    current_user: User = Depends(check_permission("check_in_bd_visit")),
):
    try:
        visit = await bd_visit_service.check_out(
            visit_id, current_user,
            outcome=payload.outcome,
            outcome_notes=payload.outcome_notes,
            next_action=payload.next_action,
            next_action_at=payload.next_action_at,
            lat=payload.lat, lng=payload.lng,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not visit:
        raise HTTPException(status_code=404, detail="BD visit not found")
    return await _serialize(visit)


# ──────────────────── photos (Phase 5) ────────────────────

@router.post("/{visit_id}/photos")
async def upload_visit_photo(
    visit_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(check_permission("edit_bd_visit")),
):
    """Upload a single photo to a BD visit. Returns the saved file record."""
    visit = await bd_visit_service.get_visit(visit_id, current_user.tenant_id)
    if not visit:
        raise HTTPException(status_code=404, detail="BD visit not found")
    if visit.owner_id != current_user.id and visit.reporting_manager_id != current_user.id:
        # Admin permission also satisfies above check via the gate; this prevents
        # arbitrary BDs from uploading photos to others' visits.
        raise HTTPException(status_code=403, detail="Only the visit's BD or manager can upload photos")

    # Read into memory; file_service handles magic-byte validation + S3.
    import io
    content = await file.read()
    file_size = len(content)
    fs = FileService()
    try:
        file_record = await fs.upload_file(
            file_obj=io.BytesIO(content),
            filename=file.filename or "photo.jpg",
            content_type=file.content_type or "application/octet-stream",
            file_size=file_size,
            user_id=current_user.id,
            tenant_id=current_user.tenant_id,
            fileable_type="BDVisit",
            fileable_id=str(visit.id),
            category="bd_visit_photo",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Append to visit and persist
    visit.photo_file_ids = list(visit.photo_file_ids or []) + [file_record.id]
    await visit.save()

    # Generate a presigned URL the client can render immediately.
    presigned = None
    try:
        presigned = await fs.get_presigned_url(str(file_record.id), current_user.tenant_id)
    except Exception:
        pass

    return {
        "file_id": str(file_record.id),
        "filename": file_record.original_filename,
        "mime_type": file_record.mime_type,
        "size": file_record.file_size,
        "presigned_url": presigned,
    }


@router.get("/{visit_id}/photos")
async def list_visit_photos(
    visit_id: str,
    current_user: User = Depends(check_permission("view_bd_visit")),
):
    """Return photo metadata + presigned URLs for the visit gallery."""
    visit = await bd_visit_service.get_visit(visit_id, current_user.tenant_id)
    if not visit:
        raise HTTPException(status_code=404, detail="BD visit not found")
    if not visit.photo_file_ids:
        return []
    from app.models.file import File as FileModel
    files = await FileModel.find(
        {
            "_id": {"$in": list(visit.photo_file_ids)},
            "tenant_id": current_user.tenant_id,
            "deleted_at": None,
        }
    ).to_list()
    fs = FileService()
    out = []
    for f in files:
        try:
            url = await fs.get_presigned_url(str(f.id), current_user.tenant_id)
        except Exception:
            url = None
        out.append({
            "file_id": str(f.id),
            "filename": f.original_filename,
            "mime_type": f.mime_type,
            "size": f.file_size,
            "presigned_url": url,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        })
    return out


@router.delete("/{visit_id}/photos/{file_id}")
async def delete_visit_photo(
    visit_id: str,
    file_id: str,
    current_user: User = Depends(check_permission("edit_bd_visit")),
):
    """Remove a photo from the visit (soft-deletes the file record too)."""
    visit = await bd_visit_service.get_visit(visit_id, current_user.tenant_id)
    if not visit:
        raise HTTPException(status_code=404, detail="BD visit not found")
    try:
        file_oid = ObjectId(file_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid file_id")
    if file_oid not in (visit.photo_file_ids or []):
        raise HTTPException(status_code=404, detail="Photo not attached to this visit")
    visit.photo_file_ids = [fid for fid in visit.photo_file_ids if fid != file_oid]
    await visit.save()
    fs = FileService()
    try:
        await fs.delete_file(file_id, current_user.tenant_id, current_user.id)
    except Exception:
        pass
    return {"error": False, "message": "Photo removed"}
