"""
Automation Service — lightweight rule engine.

Triggers fire via `dispatch(event, entity, tenant_id)`. The engine loads the
tenant's active rules for that trigger, evaluates conditions, and executes the
matching actions in priority order. All failures are isolated — one bad rule
must not block the caller.

Design notes:
- Conditions are expressed as JSON dicts to keep the admin UI simple. Dot-paths
  are supported so callers can refer to nested industry_data fields.
- Action handlers are pure async functions registered in the ACTIONS dict.
- Triggers are a closed list (TRIGGERS) so admins can't define arbitrary names.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Awaitable, Callable, Dict, List, Optional
import logging

from bson import ObjectId

from app.models.automation_rule import AutomationRule
from app.models.tenant import Tenant

logger = logging.getLogger(__name__)


# Closed set of triggers we currently support.
TRIGGERS = {
    "lead.created",
    "lead.updated",
    "opportunity.created",
    "opportunity.stage_changed",
    "bd_visit.created",
    "bd_visit.completed",
    "expense.submitted",
}


# ──────────────────── condition evaluation ────────────────────

def _get_path(obj: Any, path: str) -> Any:
    parts = path.split(".")
    cur: Any = obj
    for p in parts:
        if cur is None:
            return None
        if isinstance(cur, dict):
            cur = cur.get(p)
        else:
            cur = getattr(cur, p, None)
    return cur


def _eval_condition(entity: Any, cond: Dict[str, Any]) -> bool:
    path = cond.get("path")
    op = (cond.get("op") or "eq").lower()
    expected = cond.get("value")
    if not path:
        return False
    actual = _get_path(entity, path)
    try:
        if op == "eq":
            return actual == expected
        if op == "neq":
            return actual != expected
        if op == "in":
            return actual in (expected or [])
        if op == "contains":
            if actual is None:
                return False
            return expected in actual
        if op == "gt":
            return actual is not None and actual > expected
        if op == "lt":
            return actual is not None and actual < expected
        if op == "gte":
            return actual is not None and actual >= expected
        if op == "lte":
            return actual is not None and actual <= expected
        if op == "exists":
            present = actual is not None
            return present if bool(expected) else not present
    except Exception:
        logger.warning("Condition eval failed: %s", cond, exc_info=True)
        return False
    return False


def _conditions_pass(entity: Any, rule: AutomationRule) -> bool:
    if not rule.conditions:
        return True
    if (rule.conditions_logic or "AND").upper() == "OR":
        return any(_eval_condition(entity, c) for c in rule.conditions)
    return all(_eval_condition(entity, c) for c in rule.conditions)


# ──────────────────── action handlers ────────────────────

ActionHandler = Callable[[Dict[str, Any], Any, ObjectId], Awaitable[None]]


async def _action_set_field(params: Dict[str, Any], entity: Any, tenant_id: ObjectId) -> None:
    field = params.get("field")
    value = params.get("value")
    if not field or not hasattr(entity, field):
        return
    setattr(entity, field, value)
    save = getattr(entity, "save", None)
    if save is not None:
        await save()


async def _action_send_notification(params: Dict[str, Any], entity: Any, tenant_id: ObjectId) -> None:
    from app.services.notification_service import NotificationService
    svc = NotificationService()
    to = params.get("to")  # "owner_id" | "reporting_manager" | "<user_id>"
    user_id: Optional[ObjectId] = None
    if to == "owner_id":
        user_id = getattr(entity, "owner_id", None)
    elif to == "reporting_manager":
        user_id = getattr(entity, "reporting_manager_id", None)
    elif to == "bd_owner":
        user_id = getattr(entity, "bd_owner_id", None)
    else:
        try:
            user_id = ObjectId(to) if to else None
        except Exception:
            user_id = None
    if not user_id:
        return
    await svc.notify_user(
        user_id=user_id,
        tenant_id=tenant_id,
        title=params.get("title", "Automation alert"),
        message=params.get("message", ""),
        type=params.get("type", "info"),
        entity_type=params.get("entity_type"),
        entity_id=getattr(entity, "id", None),
        action_url=params.get("action_url"),
    )


async def _action_create_bd_visit(params: Dict[str, Any], entity: Any, tenant_id: ObjectId) -> None:
    """Create a BD visit for the entity (typically a Lead)."""
    from app.models.consolidated_picklists import BDActivityType
    from app.services.bd_visit_service import bd_visit_service

    # Determine the visitable type from the entity's class name.
    visitable_type = entity.__class__.__name__
    if visitable_type not in {"Lead", "Opportunity", "Account", "Contact"}:
        logger.info("create_bd_visit skipped — unsupported entity type %s", visitable_type)
        return

    activity_type_id = None
    name = params.get("activity_type_name")
    if name:
        at = await BDActivityType.find_one(
            {"name": name, "$or": [{"tenant_id": tenant_id}, {"tenant_id": None}], "is_active": True}
        )
        if at:
            activity_type_id = at.id

    days_offset = int(params.get("days_offset", 1))
    scheduled = datetime.utcnow() + timedelta(days=days_offset)

    # Pick BD owner from entity (Lead.bd_owner_id) or fall back to entity.owner_id
    owner_id = getattr(entity, "bd_owner_id", None) or getattr(entity, "owner_id", None)
    if not owner_id:
        logger.info("create_bd_visit skipped — no owner could be resolved")
        return

    title = params.get("title")
    if not title:
        ent_name = getattr(entity, "full_name", None) or getattr(entity, "name", "Visit")
        title = f"{name or 'BD Visit'}: {ent_name}"

    try:
        await bd_visit_service.create_visit(
            tenant_id=tenant_id,
            created_by=owner_id,
            owner_id=owner_id,
            visitable_type=visitable_type,
            visitable_id=entity.id,
            title=title,
            scheduled_date=scheduled,
            activity_type_id=activity_type_id,
            description=params.get("description"),
            scheduled_duration_min=int(params.get("duration_min", 30)),
        )
    except Exception:
        logger.exception("Automation action create_bd_visit failed")


async def _action_assign_owner(params: Dict[str, Any], entity: Any, tenant_id: ObjectId) -> None:
    """Set owner_id on the entity to a fixed user_id."""
    user_id = params.get("user_id")
    if not user_id or not hasattr(entity, "owner_id"):
        return
    try:
        entity.owner_id = ObjectId(user_id)
    except Exception:
        return
    save = getattr(entity, "save", None)
    if save is not None:
        await save()


ACTIONS: Dict[str, ActionHandler] = {
    "set_field": _action_set_field,
    "send_notification": _action_send_notification,
    "create_bd_visit": _action_create_bd_visit,
    "assign_owner": _action_assign_owner,
}


# ──────────────────── dispatch ────────────────────

async def dispatch(event: str, entity: Any, tenant_id: ObjectId) -> int:
    """Run rules for `event` against `entity`. Returns the number of actions fired."""
    if event not in TRIGGERS:
        return 0
    try:
        rules = await AutomationRule.find(
            {
                "tenant_id": tenant_id,
                "trigger_event": event,
                "is_active": True,
                "deleted_at": None,
            }
        ).sort("+priority").to_list()
    except Exception:
        logger.exception("Failed to load automation rules")
        return 0

    if not rules:
        return 0

    # Industry scope check — None matches all.
    tenant = None
    try:
        tenant = await Tenant.get(tenant_id)
    except Exception:
        pass
    tenant_industry = tenant.industry if tenant else None

    fired = 0
    for rule in rules:
        if rule.industry and rule.industry != tenant_industry:
            continue
        try:
            if not _conditions_pass(entity, rule):
                continue
            handler = ACTIONS.get(rule.action_type)
            if not handler:
                logger.warning("Unknown action_type %s in rule %s", rule.action_type, rule.id)
                continue
            await handler(rule.action_params or {}, entity, tenant_id)
            fired += 1
            rule.fire_count = (rule.fire_count or 0) + 1
            rule.last_fired_at = datetime.utcnow()
            await rule.save()
        except Exception:
            logger.exception("Automation rule %s failed; continuing", rule.id)
    return fired
