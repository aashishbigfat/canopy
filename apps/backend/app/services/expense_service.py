"""
Expense Service — BD field claims with manager approval.

Mirrors the OpportunityClaim status enum so the approval queue UI can reuse
the same patterns for both.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
import logging

from bson import ObjectId

from app.mixins.activity_mixin import ActivityMixin
from app.models.bd_visit import BDVisit
from app.models.consolidated_picklists import ExpenseCategory
from app.models.expense import Expense
from app.models.user import User
from app.services import approval_service
from app.services.bd_assignment_service import bd_assignment_service
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class ExpenseService(ActivityMixin):
    def __init__(self):
        super().__init__()
        self.notification_service = NotificationService()

    # ──────────────────── helpers ────────────────────

    async def _resolve_category(
        self, category_id: Optional[ObjectId], tenant_id: ObjectId
    ) -> Optional[ExpenseCategory]:
        if not category_id:
            return None
        return await ExpenseCategory.find_one(
            {
                "_id": category_id,
                "$or": [{"tenant_id": tenant_id}, {"tenant_id": None}],
                "is_active": True,
            }
        )

    # ──────────────────── CRUD ────────────────────

    async def create_expense(
        self,
        *,
        tenant_id: ObjectId,
        owner_id: ObjectId,
        created_by: ObjectId,
        title: str,
        amount: float,
        incurred_at: datetime,
        currency: str = "INR",
        category_id: Optional[ObjectId] = None,
        description: Optional[str] = None,
        bd_visit_id: Optional[ObjectId] = None,
        bd_visitable_type: Optional[str] = None,
        bd_visitable_id: Optional[ObjectId] = None,
        industry_data: Optional[Dict[str, Any]] = None,
    ) -> Expense:
        category = await self._resolve_category(category_id, tenant_id)

        # If linked to a visit, copy its visitable + reporting_manager_id.
        bd_visitable_type_eff = bd_visitable_type
        bd_visitable_id_eff = bd_visitable_id
        reporting_manager_id: Optional[ObjectId] = None
        if bd_visit_id:
            visit = await BDVisit.find_one({"_id": bd_visit_id, "tenant_id": tenant_id})
            if not visit:
                raise ValueError("Linked BD visit not found in tenant")
            bd_visitable_type_eff = visit.bd_visitable_type
            bd_visitable_id_eff = visit.bd_visitable_id
            reporting_manager_id = visit.reporting_manager_id

        if not reporting_manager_id:
            reporting_manager_id = await bd_assignment_service.resolve_manager_for_user(tenant_id, owner_id)

        expense = Expense(
            category_id=category_id,
            category_name=category.name if category else None,
            title=title,
            description=description,
            amount=float(amount),
            currency=currency,
            incurred_at=incurred_at,
            bd_visit_id=bd_visit_id,
            bd_visitable_type=bd_visitable_type_eff,
            bd_visitable_id=bd_visitable_id_eff,
            status="draft",
            reporting_manager_id=reporting_manager_id,
            owner_id=owner_id,
            created_by=created_by,
            tenant_id=tenant_id,
            industry_data=industry_data or {},
        )
        await expense.insert()
        await self.log_entity_created(
            entity=expense, entity_type="expense",
            additional_data={"amount": amount, "category": category.name if category else None},
        )
        return expense

    async def get_expense(self, expense_id: str, tenant_id: ObjectId) -> Optional[Expense]:
        try:
            oid = ObjectId(expense_id)
        except Exception:
            return None
        return await Expense.find_one({"_id": oid, "tenant_id": tenant_id, "deleted_at": None})

    async def update_expense(
        self, expense_id: str, updates: Dict[str, Any], user_id: ObjectId, tenant_id: ObjectId
    ) -> Optional[Expense]:
        exp = await self.get_expense(expense_id, tenant_id)
        if not exp:
            return None
        if exp.status != "draft":
            raise ValueError("Only draft expenses can be edited")
        if exp.owner_id != user_id:
            raise ValueError("Only the owner can edit a draft expense")
        old: Dict[str, Any] = {}
        applied: Dict[str, Any] = {}
        for k, v in updates.items():
            if hasattr(exp, k):
                old[k] = getattr(exp, k)
                setattr(exp, k, v)
                applied[k] = v
        exp.last_modified_by_id = user_id
        await exp.save()
        if applied:
            await self.log_entity_updated(
                entity=exp, entity_type="expense",
                old_values={k: str(v) for k, v in old.items()},
                updated_fields={k: str(v) for k, v in applied.items()},
            )
        return exp

    async def delete_expense(self, expense_id: str, tenant_id: ObjectId, user_id: ObjectId) -> bool:
        exp = await self.get_expense(expense_id, tenant_id)
        if not exp:
            return False
        if exp.status != "draft":
            raise ValueError("Only draft expenses can be deleted")
        if exp.owner_id != user_id:
            raise ValueError("Only the owner can delete a draft expense")
        await exp.soft_delete()
        await self.log_entity_deleted(entity=exp, entity_type="expense")
        return True

    # ──────────────────── workflow ────────────────────

    async def submit_expense(self, expense_id: str, user: User) -> Optional[Expense]:
        exp = await self.get_expense(expense_id, user.tenant_id)
        if not exp:
            return None
        if exp.owner_id != user.id:
            raise ValueError("Only the owner can submit this expense")
        if exp.status != "draft":
            raise ValueError(f"Cannot submit an expense in status '{exp.status}'")

        category = await self._resolve_category(exp.category_id, user.tenant_id)
        # Validate max_amount cap
        if category and category.max_amount is not None and exp.amount > category.max_amount:
            raise ValueError(
                f"Amount {exp.amount} exceeds category cap of {category.max_amount}"
            )

        # Auto-approve under threshold
        auto = category and category.auto_approve_under is not None and exp.amount <= category.auto_approve_under
        if auto:
            exp.status = "approved"
            exp.submitted_at = datetime.utcnow()
            exp.approved_at = datetime.utcnow()
            exp.approval_notes = "Auto-approved under threshold"
            await exp.save()
            await self.log_custom_activity(
                action="expense_auto_approved", entity_type="expense", entity=exp,
                description=f"Auto-approved (under {category.auto_approve_under})", changes={},
            )
            return exp

        exp.status = "submitted"
        exp.submitted_at = datetime.utcnow()
        await exp.save()

        if exp.reporting_manager_id:
            await self.notification_service.notify_user(
                user_id=exp.reporting_manager_id, tenant_id=user.tenant_id,
                title="Expense awaiting approval",
                message=f"{exp.title} — {exp.currency} {exp.amount}",
                type="task", entity_type="expense", entity_id=exp.id,
                action_url="/bd/approvals",
            )
        await self.log_custom_activity(
            action="expense_submitted", entity_type="expense", entity=exp,
            description=f"Submitted {exp.currency} {exp.amount}", changes={},
        )
        # If linked to a visit, mirror onto visit.expense_ids
        if exp.bd_visit_id:
            try:
                visit = await BDVisit.find_one({"_id": exp.bd_visit_id, "tenant_id": user.tenant_id})
                if visit and exp.id not in (visit.expense_ids or []):
                    visit.expense_ids = list(visit.expense_ids or []) + [exp.id]
                    await visit.save()
            except Exception:
                logger.warning("Failed to back-link expense to visit", exc_info=True)

        # Phase 9: automation rule dispatch
        try:
            from app.services import automation_service
            await automation_service.dispatch("expense.submitted", exp, user.tenant_id)
        except Exception:
            logger.warning("Automation dispatch failed (expense.submitted)", exc_info=True)

        return exp

    async def approve_expense(
        self, expense_id: str, approver: User, notes: Optional[str] = None
    ) -> Optional[Expense]:
        exp = await self.get_expense(expense_id, approver.tenant_id)
        if not exp:
            return None
        if exp.status != "submitted":
            raise ValueError(f"Cannot approve an expense in status '{exp.status}'")
        await approval_service.assert_can_approve(approver, exp, extra_perm="approve_expense")
        exp.status = "approved"
        exp.approved_by = approver.id
        exp.approved_at = datetime.utcnow()
        if notes:
            exp.approval_notes = notes
        await exp.save()
        await self.notification_service.notify_user(
            user_id=exp.owner_id, tenant_id=exp.tenant_id,
            title="Expense approved",
            message=f"{exp.title} ({exp.currency} {exp.amount})",
            type="success", entity_type="expense", entity_id=exp.id,
            action_url=f"/bd/expenses/{exp.id}",
        )
        await self.log_custom_activity(
            action="expense_approved", entity_type="expense", entity=exp,
            description=f"Approved by {approver.name or approver.email}", changes={},
        )
        return exp

    async def reject_expense(
        self, expense_id: str, approver: User, reason: str
    ) -> Optional[Expense]:
        exp = await self.get_expense(expense_id, approver.tenant_id)
        if not exp:
            return None
        if exp.status != "submitted":
            raise ValueError(f"Cannot reject an expense in status '{exp.status}'")
        await approval_service.assert_can_approve(approver, exp, extra_perm="approve_expense")
        exp.status = "rejected"
        exp.rejection_reason = reason
        exp.approved_by = approver.id
        exp.approved_at = datetime.utcnow()
        await exp.save()
        await self.notification_service.notify_user(
            user_id=exp.owner_id, tenant_id=exp.tenant_id,
            title="Expense rejected",
            message=f"{exp.title}: {reason}",
            type="warning", entity_type="expense", entity_id=exp.id,
            action_url=f"/bd/expenses/{exp.id}",
        )
        await self.log_custom_activity(
            action="expense_rejected", entity_type="expense", entity=exp,
            description=f"Rejected: {reason}", changes={"rejection_reason": reason},
        )
        return exp

    async def mark_reimbursed(
        self, expense_id: str, user: User, reference: Optional[str] = None
    ) -> Optional[Expense]:
        exp = await self.get_expense(expense_id, user.tenant_id)
        if not exp:
            return None
        if exp.status != "approved":
            raise ValueError(f"Cannot reimburse an expense in status '{exp.status}'")
        if not await user.has_permission("reimburse_expense"):
            raise ValueError("Permission denied: reimburse_expense required")
        exp.status = "reimbursed"
        exp.reimbursed_at = datetime.utcnow()
        exp.reimbursed_by = user.id
        exp.reimbursement_reference = reference
        await exp.save()
        await self.notification_service.notify_user(
            user_id=exp.owner_id, tenant_id=exp.tenant_id,
            title="Expense reimbursed",
            message=f"{exp.title} ({exp.currency} {exp.amount}) — ref {reference or 'n/a'}",
            type="success", entity_type="expense", entity_id=exp.id,
            action_url=f"/bd/expenses/{exp.id}",
        )
        await self.log_custom_activity(
            action="expense_reimbursed", entity_type="expense", entity=exp,
            description=f"Reimbursed; ref {reference}", changes={},
        )
        return exp

    # ──────────────────── queries ────────────────────

    async def list_expenses(
        self,
        tenant_id: ObjectId,
        *,
        visible_owner_ids: Optional[List[ObjectId]] = None,
        owner_id: Optional[ObjectId] = None,
        status: Optional[str] = None,
        category_id: Optional[ObjectId] = None,
        bd_visit_id: Optional[ObjectId] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        page: int = 1,
        per_page: int = 20,
    ) -> Tuple[List[Expense], int]:
        q: Dict[str, Any] = {"tenant_id": tenant_id, "deleted_at": None}
        if owner_id:
            q["owner_id"] = owner_id
        elif visible_owner_ids is not None:
            q["owner_id"] = {"$in": visible_owner_ids}
        if status:
            q["status"] = status
        if category_id:
            q["category_id"] = category_id
        if bd_visit_id:
            q["bd_visit_id"] = bd_visit_id
        if date_from or date_to:
            r: Dict[str, Any] = {}
            if date_from: r["$gte"] = date_from
            if date_to: r["$lte"] = date_to
            q["incurred_at"] = r

        total = await Expense.find(q).count()
        results = (
            await Expense.find(q)
            .sort("-incurred_at")
            .skip((page - 1) * per_page)
            .limit(per_page)
            .to_list()
        )
        return results, total

    async def pending_approvals_for_manager(
        self, tenant_id: ObjectId, manager_id: ObjectId
    ) -> List[Expense]:
        return await Expense.find(
            {
                "tenant_id": tenant_id,
                "reporting_manager_id": manager_id,
                "status": "submitted",
                "deleted_at": None,
            }
        ).sort("+submitted_at").to_list()

    async def summary_for_user(
        self, tenant_id: ObjectId, owner_id: ObjectId
    ) -> Dict[str, Any]:
        cursor = Expense.find(
            {"tenant_id": tenant_id, "owner_id": owner_id, "deleted_at": None}
        )
        total = 0.0
        by_status: Dict[str, float] = {}
        by_category: Dict[str, float] = {}
        async for exp in cursor:
            total += exp.amount
            by_status[exp.status] = by_status.get(exp.status, 0.0) + exp.amount
            cat = exp.category_name or "Uncategorised"
            by_category[cat] = by_category.get(cat, 0.0) + exp.amount
        pending = await Expense.find(
            {
                "tenant_id": tenant_id,
                "reporting_manager_id": owner_id,
                "status": "submitted",
                "deleted_at": None,
            }
        ).count()
        return {
            "total_amount": round(total, 2),
            "by_status": {k: round(v, 2) for k, v in by_status.items()},
            "by_category": {k: round(v, 2) for k, v in by_category.items()},
            "count_pending_approval": pending,
        }


expense_service = ExpenseService()
