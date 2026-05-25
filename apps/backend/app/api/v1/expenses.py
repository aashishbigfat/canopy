"""Expense API endpoints (BD field claims)."""
from datetime import datetime
from typing import Optional
import io
import logging

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile

from app.api.deps import check_permission
from app.models.bd_visit import BDVisit
from app.models.expense import Expense
from app.models.user import User
from app.schemas.expense import (
    ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseListResponse,
    ExpenseApprove, ExpenseReject, ExpenseReimburse, ExpenseSummary,
)
from app.services.expense_service import expense_service
from app.services.file_service import FileService
from app.services.visibility_scope import get_visible_owner_ids

router = APIRouter()
logger = logging.getLogger(__name__)


def _oid(v: Optional[str]) -> Optional[ObjectId]:
    if not v:
        return None
    try:
        return ObjectId(v)
    except Exception:
        raise HTTPException(400, "Invalid ObjectId")


async def _serialize(exp: Expense) -> ExpenseResponse:
    owner_name = manager_name = visit_title = None
    try:
        owner = await User.find_one({"_id": exp.owner_id, "tenant_id": exp.tenant_id})
        owner_name = owner.name if owner else None
        if exp.reporting_manager_id:
            mgr = await User.find_one({"_id": exp.reporting_manager_id, "tenant_id": exp.tenant_id})
            manager_name = mgr.name if mgr else None
        if exp.bd_visit_id:
            v = await BDVisit.find_one({"_id": exp.bd_visit_id, "tenant_id": exp.tenant_id})
            visit_title = v.title if v else None
    except Exception:
        pass

    return ExpenseResponse(
        id=str(exp.id),
        tenant_id=str(exp.tenant_id),
        category_id=str(exp.category_id) if exp.category_id else None,
        category_name=exp.category_name,
        title=exp.title,
        description=exp.description,
        amount=exp.amount,
        currency=exp.currency,
        incurred_at=exp.incurred_at,
        bd_visit_id=str(exp.bd_visit_id) if exp.bd_visit_id else None,
        bd_visit_title=visit_title,
        bd_visitable_type=exp.bd_visitable_type,
        bd_visitable_id=str(exp.bd_visitable_id) if exp.bd_visitable_id else None,
        receipt_file_ids=[str(x) for x in (exp.receipt_file_ids or [])],
        status=exp.status,
        submitted_at=exp.submitted_at,
        approved_by=str(exp.approved_by) if exp.approved_by else None,
        approved_at=exp.approved_at,
        approval_notes=exp.approval_notes,
        rejection_reason=exp.rejection_reason,
        reimbursed_at=exp.reimbursed_at,
        reimbursed_by=str(exp.reimbursed_by) if exp.reimbursed_by else None,
        reimbursement_reference=exp.reimbursement_reference,
        reporting_manager_id=str(exp.reporting_manager_id) if exp.reporting_manager_id else None,
        reporting_manager_name=manager_name,
        owner_id=str(exp.owner_id),
        owner_name=owner_name,
        industry_data=exp.industry_data or {},
        created_at=exp.created_at,
        updated_at=exp.updated_at,
    )


@router.post("", response_model=ExpenseResponse, status_code=201)
@router.post("/", response_model=ExpenseResponse, status_code=201)
async def create_expense(
    payload: ExpenseCreate,
    current_user: User = Depends(check_permission("create_expense")),
):
    try:
        exp = await expense_service.create_expense(
            tenant_id=current_user.tenant_id,
            owner_id=current_user.id,
            created_by=current_user.id,
            title=payload.title,
            amount=payload.amount,
            incurred_at=payload.incurred_at,
            currency=payload.currency,
            category_id=_oid(payload.category_id),
            description=payload.description,
            bd_visit_id=_oid(payload.bd_visit_id),
            bd_visitable_type=payload.bd_visitable_type,
            bd_visitable_id=_oid(payload.bd_visitable_id),
            industry_data=payload.industry_data,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    return await _serialize(exp)


@router.get("", response_model=ExpenseListResponse)
@router.get("/", response_model=ExpenseListResponse)
async def list_expenses(
    status: Optional[str] = None,
    owner_id: Optional[str] = None,
    category_id: Optional[str] = None,
    bd_visit_id: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(check_permission("view_expense")),
):
    visible = await get_visible_owner_ids(current_user)
    expenses, total = await expense_service.list_expenses(
        tenant_id=current_user.tenant_id,
        visible_owner_ids=visible,
        owner_id=_oid(owner_id),
        status=status,
        category_id=_oid(category_id),
        bd_visit_id=_oid(bd_visit_id),
        date_from=date_from, date_to=date_to,
        page=page, per_page=per_page,
    )
    return ExpenseListResponse(
        expenses=[await _serialize(e) for e in expenses],
        total=total, page=page, per_page=per_page,
    )


@router.get("/pending-approvals", response_model=ExpenseListResponse)
async def pending_approvals(
    current_user: User = Depends(check_permission("approve_expense")),
):
    rows = await expense_service.pending_approvals_for_manager(
        tenant_id=current_user.tenant_id, manager_id=current_user.id,
    )
    return ExpenseListResponse(
        expenses=[await _serialize(e) for e in rows],
        total=len(rows), page=1, per_page=len(rows) or 1,
    )


@router.get("/summary", response_model=ExpenseSummary)
async def my_summary(
    current_user: User = Depends(check_permission("view_expense")),
):
    s = await expense_service.summary_for_user(current_user.tenant_id, current_user.id)
    return ExpenseSummary(**s)


@router.get("/by-visit/{visit_id}", response_model=ExpenseListResponse)
async def by_visit(
    visit_id: str,
    current_user: User = Depends(check_permission("view_expense")),
):
    rows, total = await expense_service.list_expenses(
        tenant_id=current_user.tenant_id, bd_visit_id=_oid(visit_id), per_page=200,
    )
    return ExpenseListResponse(
        expenses=[await _serialize(e) for e in rows],
        total=total, page=1, per_page=200,
    )


@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: str,
    current_user: User = Depends(check_permission("view_expense")),
):
    exp = await expense_service.get_expense(expense_id, current_user.tenant_id)
    if not exp:
        raise HTTPException(404, "Expense not found")
    visible = await get_visible_owner_ids(current_user)
    if visible is not None and exp.owner_id not in visible and exp.reporting_manager_id != current_user.id:
        raise HTTPException(404, "Expense not found")
    return await _serialize(exp)


@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: str,
    payload: ExpenseUpdate,
    current_user: User = Depends(check_permission("edit_expense")),
):
    try:
        exp = await expense_service.update_expense(
            expense_id, payload.model_dump(exclude_unset=True),
            current_user.id, current_user.tenant_id,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    if not exp:
        raise HTTPException(404, "Expense not found")
    return await _serialize(exp)


@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: str,
    current_user: User = Depends(check_permission("delete_expense")),
):
    try:
        ok = await expense_service.delete_expense(expense_id, current_user.tenant_id, current_user.id)
    except ValueError as e:
        raise HTTPException(400, str(e))
    if not ok:
        raise HTTPException(404, "Expense not found")
    return {"error": False, "message": "Expense deleted"}


@router.post("/{expense_id}/submit", response_model=ExpenseResponse)
async def submit_expense(
    expense_id: str,
    current_user: User = Depends(check_permission("edit_expense")),
):
    try:
        exp = await expense_service.submit_expense(expense_id, current_user)
    except ValueError as e:
        raise HTTPException(400, str(e))
    if not exp:
        raise HTTPException(404, "Expense not found")
    return await _serialize(exp)


@router.post("/{expense_id}/approve", response_model=ExpenseResponse)
async def approve_expense(
    expense_id: str,
    payload: ExpenseApprove,
    current_user: User = Depends(check_permission("approve_expense")),
):
    try:
        exp = await expense_service.approve_expense(expense_id, current_user, notes=payload.notes)
    except ValueError as e:
        raise HTTPException(403 if "authoriz" in str(e).lower() else 400, str(e))
    if not exp:
        raise HTTPException(404, "Expense not found")
    return await _serialize(exp)


@router.post("/{expense_id}/reject", response_model=ExpenseResponse)
async def reject_expense(
    expense_id: str,
    payload: ExpenseReject,
    current_user: User = Depends(check_permission("approve_expense")),
):
    try:
        exp = await expense_service.reject_expense(expense_id, current_user, reason=payload.reason)
    except ValueError as e:
        raise HTTPException(403 if "authoriz" in str(e).lower() else 400, str(e))
    if not exp:
        raise HTTPException(404, "Expense not found")
    return await _serialize(exp)


@router.post("/{expense_id}/reimburse", response_model=ExpenseResponse)
async def reimburse_expense(
    expense_id: str,
    payload: ExpenseReimburse,
    current_user: User = Depends(check_permission("reimburse_expense")),
):
    try:
        exp = await expense_service.mark_reimbursed(
            expense_id, current_user, reference=payload.reference,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    if not exp:
        raise HTTPException(404, "Expense not found")
    return await _serialize(exp)


# ─────────── receipt uploads (reuses FileService) ───────────

@router.post("/{expense_id}/receipts")
async def upload_receipt(
    expense_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(check_permission("edit_expense")),
):
    exp = await expense_service.get_expense(expense_id, current_user.tenant_id)
    if not exp:
        raise HTTPException(404, "Expense not found")
    if exp.owner_id != current_user.id:
        raise HTTPException(403, "Only the owner can attach receipts")
    content = await file.read()
    fs = FileService()
    try:
        file_record = await fs.upload_file(
            file_obj=io.BytesIO(content),
            filename=file.filename or "receipt.jpg",
            content_type=file.content_type or "application/octet-stream",
            file_size=len(content),
            user_id=current_user.id,
            tenant_id=current_user.tenant_id,
            fileable_type="Expense",
            fileable_id=str(exp.id),
            category="expense_receipt",
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    exp.receipt_file_ids = list(exp.receipt_file_ids or []) + [file_record.id]
    await exp.save()
    presigned = None
    try:
        presigned = await fs.get_presigned_url(str(file_record.id), current_user.tenant_id)
    except Exception:
        pass
    return {
        "file_id": str(file_record.id),
        "filename": file_record.original_filename,
        "presigned_url": presigned,
    }


@router.get("/{expense_id}/receipts")
async def list_receipts(
    expense_id: str,
    current_user: User = Depends(check_permission("view_expense")),
):
    exp = await expense_service.get_expense(expense_id, current_user.tenant_id)
    if not exp:
        raise HTTPException(404, "Expense not found")
    if not exp.receipt_file_ids:
        return []
    from app.models.file import File as FileModel
    files = await FileModel.find({
        "_id": {"$in": list(exp.receipt_file_ids)},
        "tenant_id": current_user.tenant_id,
        "deleted_at": None,
    }).to_list()
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
            "presigned_url": url,
        })
    return out
