"""
BD Visit Service — lifecycle and visibility for field-ops visits.

Responsibilities:
- Create / read / update / delete with tenant scoping
- Auto-create a companion Task so the visit shows in /tasks
- Approval workflow routed through approval_service
- Notify manager on submit, notify BD on approve/reject/check-out
- List queries respect visibility_scope so managers see their team
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
import logging

from bson import ObjectId

from app.mixins.activity_mixin import ActivityMixin
from app.models.bd_visit import BDVisit
from app.models.consolidated_picklists import BDActivityType
from app.models.task import Task
from app.models.user import User
from app.services import approval_service
from app.services.notification_service import NotificationService
from app.services.task_service import TaskService

logger = logging.getLogger(__name__)


class BDVisitService(ActivityMixin):
    def __init__(self):
        super().__init__()
        self.task_service = TaskService()
        self.notification_service = NotificationService()

    # ──────────────────── helpers ────────────────────

    async def _resolve_activity_type(
        self, activity_type_id: Optional[ObjectId], tenant_id: ObjectId
    ) -> Tuple[Optional[BDActivityType], bool]:
        """Return (activity_type doc, requires_approval). Falls back to True."""
        if not activity_type_id:
            return None, True
        # Platform defaults have tenant_id=None; tenant overrides have tenant_id=this tenant.
        # Either is fine — IDs come from the picklist UI which already scopes.
        doc = await BDActivityType.find_one(
            {
                "_id": activity_type_id,
                "$or": [{"tenant_id": tenant_id}, {"tenant_id": None}],
                "is_active": True,
            }
        )
        if not doc:
            return None, True
        return doc, bool(doc.requires_approval)

    async def _resolve_parent_context(
        self, visitable_type: str, visitable_id: ObjectId, tenant_id: ObjectId
    ) -> Dict[str, Any]:
        """Pull territory/manager/address snapshot from the parent record so the
        visit is self-contained even if the parent changes later."""
        ctx: Dict[str, Any] = {
            "territory_id": None,
            "region_id": None,
            "reporting_manager_id": None,
            "address_snapshot": None,
            "parent_name": None,
        }
        try:
            if visitable_type == "Lead":
                from app.models.lead import Lead
                parent = await Lead.find_one({"_id": visitable_id, "tenant_id": tenant_id})
                if parent:
                    ctx["territory_id"] = parent.territory_id
                    ctx["region_id"] = parent.region_id
                    ctx["reporting_manager_id"] = parent.reporting_manager_id
                    ctx["address_snapshot"] = {
                        "street": parent.street, "city": parent.city,
                        "state": parent.state, "zip": parent.zip, "country": parent.country,
                    }
                    ctx["parent_name"] = parent.full_name
            elif visitable_type == "Opportunity":
                from app.models.opportunity import Opportunity
                parent = await Opportunity.find_one({"_id": visitable_id, "tenant_id": tenant_id})
                if parent:
                    ctx["parent_name"] = parent.name
            elif visitable_type == "Account":
                from app.models.account import Account
                parent = await Account.find_one({"_id": visitable_id, "tenant_id": tenant_id})
                if parent:
                    ctx["address_snapshot"] = {
                        "street": parent.billing_street, "city": parent.billing_city,
                        "state": parent.billing_state, "zip": parent.billing_zip,
                        "country": parent.billing_country,
                    }
                    ctx["parent_name"] = parent.name
            elif visitable_type == "Contact":
                from app.models.contact import Contact
                parent = await Contact.find_one({"_id": visitable_id, "tenant_id": tenant_id})
                if parent:
                    ctx["address_snapshot"] = {
                        "street": parent.mailing_street, "city": parent.mailing_city,
                        "state": parent.mailing_state, "zip": parent.mailing_zip,
                        "country": parent.mailing_country,
                    }
                    ctx["parent_name"] = f"{parent.first_name} {parent.last_name}".strip()
        except Exception:
            logger.warning("Parent context lookup failed for %s/%s", visitable_type, visitable_id, exc_info=True)
        return ctx

    async def _create_companion_task(
        self, visit: BDVisit, owner_id: ObjectId, tenant_id: ObjectId
    ) -> Optional[ObjectId]:
        """Create a Task pointing back at the visit so it appears in /tasks."""
        try:
            task = Task(
                name=f"BD Visit: {visit.title}",
                description=visit.description,
                due_date=visit.scheduled_date,
                status="Not Started",
                priority="Normal",
                taskable_type="BDVisit",
                taskable_id=visit.id,
                assigned_user_id=owner_id,
                owner_id=owner_id,
                tenant_id=tenant_id,
                created_by=visit.created_by,
            )
            await task.insert()
            return task.id
        except Exception:
            logger.exception("Failed to create companion task for visit %s", visit.id)
            return None

    async def _complete_companion_task(self, task_id: Optional[ObjectId], user_id: ObjectId) -> None:
        if not task_id:
            return
        try:
            task = await Task.get(task_id)
            if task and task.status != "Completed":
                await task.mark_completed(user_id)
        except Exception:
            logger.exception("Failed to complete companion task %s", task_id)

    # ──────────────────── CRUD ────────────────────

    async def create_visit(
        self,
        *,
        tenant_id: ObjectId,
        created_by: ObjectId,
        owner_id: ObjectId,
        visitable_type: str,
        visitable_id: ObjectId,
        title: str,
        scheduled_date: datetime,
        activity_type_id: Optional[ObjectId] = None,
        description: Optional[str] = None,
        scheduled_duration_min: int = 30,
        reporting_manager_id: Optional[ObjectId] = None,
        industry_data: Optional[Dict[str, Any]] = None,
    ) -> BDVisit:
        # Validate visitable_type at API level; here we trust it.
        ctx = await self._resolve_parent_context(visitable_type, visitable_id, tenant_id)

        activity_doc, requires_approval = await self._resolve_activity_type(activity_type_id, tenant_id)

        # Reporting manager precedence: explicit > parent context > resolve from BD's hierarchy.
        mgr_id = reporting_manager_id or ctx["reporting_manager_id"]
        if not mgr_id:
            from app.services.bd_assignment_service import bd_assignment_service
            mgr_id = await bd_assignment_service.resolve_manager_for_user(tenant_id, owner_id)

        visit = BDVisit(
            bd_visitable_type=visitable_type,
            bd_visitable_id=visitable_id,
            activity_type_id=activity_type_id,
            activity_type_name=activity_doc.name if activity_doc else None,
            title=title,
            description=description,
            scheduled_date=scheduled_date,
            scheduled_duration_min=scheduled_duration_min,
            status="planned",
            approval_status="pending" if requires_approval else "not_required",
            address_snapshot=ctx["address_snapshot"],
            territory_id=ctx["territory_id"],
            region_id=ctx["region_id"],
            owner_id=owner_id,
            reporting_manager_id=mgr_id,
            created_by=created_by,
            tenant_id=tenant_id,
            industry_data=industry_data or {},
        )
        await visit.insert()

        # Companion task in /tasks
        visit.companion_task_id = await self._create_companion_task(visit, owner_id, tenant_id)
        if visit.companion_task_id:
            await visit.save()

        # Notify the manager (if approval needed) — else notify BD
        if requires_approval and mgr_id:
            await self.notification_service.notify_user(
                user_id=mgr_id,
                tenant_id=tenant_id,
                title="BD Visit awaiting approval",
                message=f"{visit.title} scheduled {visit.scheduled_date.strftime('%Y-%m-%d %H:%M')}",
                type="task",
                entity_type="bd_visit",
                entity_id=visit.id,
                action_url=f"/bd/approvals",
            )
        else:
            await self.notification_service.notify_user(
                user_id=owner_id,
                tenant_id=tenant_id,
                title="New BD Visit assigned",
                message=visit.title,
                type="task",
                entity_type="bd_visit",
                entity_id=visit.id,
                action_url=f"/bd/visits/{visit.id}",
            )

        await self.log_entity_created(
            entity=visit, entity_type="bd_visit",
            additional_data={
                "visitable_type": visitable_type,
                "visitable_id": str(visitable_id),
                "requires_approval": requires_approval,
            },
        )
        return visit

    async def get_visit(self, visit_id: str, tenant_id: ObjectId) -> Optional[BDVisit]:
        try:
            oid = ObjectId(visit_id)
        except Exception:
            return None
        return await BDVisit.find_one({"_id": oid, "tenant_id": tenant_id, "deleted_at": None})

    async def update_visit(
        self, visit_id: str, updates: Dict[str, Any], user_id: ObjectId, tenant_id: ObjectId
    ) -> Optional[BDVisit]:
        visit = await self.get_visit(visit_id, tenant_id)
        if not visit:
            return None
        # Block fields that have their own workflow methods
        BLOCKED = {"status", "approval_status", "check_in_at", "check_in_lat", "check_in_lng",
                   "check_out_at", "check_out_lat", "check_out_lng", "approved_by", "approved_at",
                   "rejection_reason"}
        old_values: Dict[str, Any] = {}
        applied: Dict[str, Any] = {}
        for k, v in updates.items():
            if k in BLOCKED or k.startswith("_"):
                continue
            if hasattr(visit, k):
                old_values[k] = getattr(visit, k)
                setattr(visit, k, v)
                applied[k] = v
        visit.last_modified_by_id = user_id
        await visit.save()
        if applied:
            await self.log_entity_updated(
                entity=visit, entity_type="bd_visit",
                old_values={k: str(v) for k, v in old_values.items()},
                updated_fields={k: str(v) for k, v in applied.items()},
            )
        return visit

    async def delete_visit(self, visit_id: str, tenant_id: ObjectId, user_id: ObjectId) -> bool:
        visit = await self.get_visit(visit_id, tenant_id)
        if not visit:
            return False
        await visit.soft_delete()
        # Also soft-complete the companion task so it disappears from /tasks
        await self._complete_companion_task(visit.companion_task_id, user_id)
        await self.log_entity_deleted(entity=visit, entity_type="bd_visit")
        return True

    # ──────────────────── workflow ────────────────────

    async def approve_visit(
        self, visit_id: str, approver: User, notes: Optional[str] = None
    ) -> Optional[BDVisit]:
        visit = await self.get_visit(visit_id, approver.tenant_id)
        if not visit:
            return None
        await approval_service.assert_can_approve(approver, visit, extra_perm="approve_bd_visit")
        visit.approval_status = "approved"
        visit.status = "approved"
        visit.approved_by = approver.id
        visit.approved_at = datetime.utcnow()
        if notes:
            visit.outcome_notes = (visit.outcome_notes or "") + f"\n[approval notes] {notes}"
        await visit.save()
        await self.notification_service.notify_user(
            user_id=visit.owner_id, tenant_id=visit.tenant_id,
            title="Visit approved", message=visit.title,
            type="success", entity_type="bd_visit", entity_id=visit.id,
            action_url=f"/bd/visits/{visit.id}",
        )
        await self.log_custom_activity(
            action="bd_visit_approved", entity_type="bd_visit", entity=visit,
            description=f"Visit approved by {approver.name or approver.email}", changes={},
        )
        return visit

    async def reject_visit(
        self, visit_id: str, approver: User, reason: str
    ) -> Optional[BDVisit]:
        visit = await self.get_visit(visit_id, approver.tenant_id)
        if not visit:
            return None
        await approval_service.assert_can_approve(approver, visit, extra_perm="approve_bd_visit")
        visit.approval_status = "rejected"
        visit.status = "cancelled"
        visit.rejection_reason = reason
        visit.approved_by = approver.id
        visit.approved_at = datetime.utcnow()
        await visit.save()
        # Cancel companion task
        await self._complete_companion_task(visit.companion_task_id, approver.id)
        await self.notification_service.notify_user(
            user_id=visit.owner_id, tenant_id=visit.tenant_id,
            title="Visit rejected", message=f"{visit.title}: {reason}",
            type="warning", entity_type="bd_visit", entity_id=visit.id,
            action_url=f"/bd/visits/{visit.id}",
        )
        await self.log_custom_activity(
            action="bd_visit_rejected", entity_type="bd_visit", entity=visit,
            description=f"Rejected: {reason}", changes={"rejection_reason": reason},
        )
        return visit

    async def check_in(
        self,
        visit_id: str,
        user: User,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        accuracy_m: Optional[float] = None,
    ) -> Optional[BDVisit]:
        visit = await self.get_visit(visit_id, user.tenant_id)
        if not visit:
            return None
        if visit.owner_id != user.id and not await user.has_permission("check_in_bd_visit"):
            raise ValueError("Only the visit's BD owner can check in")
        if visit.approval_status not in ("approved", "not_required"):
            raise ValueError("Visit is not approved")
        visit.check_in_at = datetime.utcnow()
        visit.check_in_lat = lat
        visit.check_in_lng = lng
        visit.check_in_accuracy_m = accuracy_m
        visit.status = "in_progress"
        await visit.save()
        await self.log_custom_activity(
            action="bd_visit_checked_in", entity_type="bd_visit", entity=visit,
            description="Checked in", changes={
                "lat": str(lat) if lat is not None else None,
                "lng": str(lng) if lng is not None else None,
            },
        )
        return visit

    async def check_out(
        self,
        visit_id: str,
        user: User,
        *,
        outcome: Optional[str] = None,
        outcome_notes: Optional[str] = None,
        next_action: Optional[str] = None,
        next_action_at: Optional[datetime] = None,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
    ) -> Optional[BDVisit]:
        visit = await self.get_visit(visit_id, user.tenant_id)
        if not visit:
            return None
        if visit.owner_id != user.id and not await user.has_permission("check_in_bd_visit"):
            raise ValueError("Only the visit's BD owner can check out")
        visit.check_out_at = datetime.utcnow()
        visit.check_out_lat = lat
        visit.check_out_lng = lng
        visit.outcome = outcome
        if outcome_notes:
            visit.outcome_notes = outcome_notes
        visit.next_action = next_action
        visit.next_action_at = next_action_at
        visit.status = "completed"
        await visit.save()
        await self._complete_companion_task(visit.companion_task_id, user.id)

        # Phase 8: collapse GPS pings into a polyline summary in the background.
        try:
            import asyncio
            from app.tasks.compute_visit_route import compute_visit_route
            asyncio.create_task(compute_visit_route(visit.tenant_id, visit.id))
        except Exception:
            logger.warning("Failed to schedule visit-route computation", exc_info=True)

        # Phase 9: automation rule dispatch
        try:
            from app.services import automation_service
            await automation_service.dispatch("bd_visit.completed", visit, visit.tenant_id)
        except Exception:
            logger.warning("Automation dispatch failed (bd_visit.completed)", exc_info=True)

        if visit.reporting_manager_id:
            await self.notification_service.notify_user(
                user_id=visit.reporting_manager_id, tenant_id=visit.tenant_id,
                title="Visit completed",
                message=f"{visit.title} — outcome: {outcome or 'n/a'}",
                type="task", entity_type="bd_visit", entity_id=visit.id,
                action_url=f"/bd/visits/{visit.id}",
            )
        await self.log_custom_activity(
            action="bd_visit_completed", entity_type="bd_visit", entity=visit,
            description=f"Completed with outcome: {outcome}",
            changes={"outcome": outcome, "next_action": next_action},
        )
        return visit

    # ──────────────────── queries ────────────────────

    async def list_visits(
        self,
        tenant_id: ObjectId,
        *,
        visible_owner_ids: Optional[List[ObjectId]] = None,
        status: Optional[str] = None,
        approval_status: Optional[str] = None,
        owner_id: Optional[ObjectId] = None,
        bd_visitable_type: Optional[str] = None,
        bd_visitable_id: Optional[ObjectId] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        page: int = 1,
        per_page: int = 20,
    ) -> Tuple[List[BDVisit], int]:
        query: Dict[str, Any] = {"tenant_id": tenant_id, "deleted_at": None}
        if visible_owner_ids is not None:
            query["owner_id"] = {"$in": visible_owner_ids}
        if owner_id:
            query["owner_id"] = owner_id
        if status:
            query["status"] = status
        if approval_status:
            query["approval_status"] = approval_status
        if bd_visitable_type:
            query["bd_visitable_type"] = bd_visitable_type
        if bd_visitable_id:
            query["bd_visitable_id"] = bd_visitable_id
        if date_from or date_to:
            range_q: Dict[str, Any] = {}
            if date_from:
                range_q["$gte"] = date_from
            if date_to:
                range_q["$lte"] = date_to
            query["scheduled_date"] = range_q

        total = await BDVisit.find(query).count()
        results = (
            await BDVisit.find(query)
            .sort("-scheduled_date")
            .skip((page - 1) * per_page)
            .limit(per_page)
            .to_list()
        )
        return results, total

    async def pending_approvals_for_manager(
        self, tenant_id: ObjectId, manager_id: ObjectId
    ) -> List[BDVisit]:
        return await BDVisit.find(
            {
                "tenant_id": tenant_id,
                "reporting_manager_id": manager_id,
                "approval_status": "pending",
                "deleted_at": None,
            }
        ).sort("+scheduled_date").to_list()

    async def visits_by_parent(
        self, tenant_id: ObjectId, visitable_type: str, visitable_id: ObjectId
    ) -> List[BDVisit]:
        return await BDVisit.find(
            {
                "tenant_id": tenant_id,
                "bd_visitable_type": visitable_type,
                "bd_visitable_id": visitable_id,
                "deleted_at": None,
            }
        ).sort("-scheduled_date").to_list()


bd_visit_service = BDVisitService()
