"""Automation rules API — admin CRUD + test/preview."""
from datetime import datetime
from typing import Any, Dict, List, Optional
import logging

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app.api.deps import check_permission
from app.models.automation_rule import AutomationRule
from app.models.user import User
from app.services import automation_service

router = APIRouter()
logger = logging.getLogger(__name__)


class RuleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = None
    is_active: bool = True
    trigger_event: str
    conditions: List[Dict[str, Any]] = []
    conditions_logic: str = "AND"
    action_type: str
    action_params: Dict[str, Any] = {}
    industry: Optional[str] = None
    priority: int = 100


class RuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    trigger_event: Optional[str] = None
    conditions: Optional[List[Dict[str, Any]]] = None
    conditions_logic: Optional[str] = None
    action_type: Optional[str] = None
    action_params: Optional[Dict[str, Any]] = None
    industry: Optional[str] = None
    priority: Optional[int] = None


class RuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    tenant_id: str
    name: str
    description: Optional[str] = None
    is_active: bool
    trigger_event: str
    conditions: List[Dict[str, Any]] = []
    conditions_logic: str
    action_type: str
    action_params: Dict[str, Any] = {}
    industry: Optional[str] = None
    priority: int
    last_fired_at: Optional[datetime] = None
    fire_count: int = 0
    created_at: datetime
    updated_at: datetime


def _serialize(r: AutomationRule) -> RuleResponse:
    return RuleResponse(
        id=str(r.id),
        tenant_id=str(r.tenant_id),
        name=r.name,
        description=r.description,
        is_active=r.is_active,
        trigger_event=r.trigger_event,
        conditions=r.conditions or [],
        conditions_logic=r.conditions_logic,
        action_type=r.action_type,
        action_params=r.action_params or {},
        industry=r.industry,
        priority=r.priority,
        last_fired_at=r.last_fired_at,
        fire_count=r.fire_count or 0,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


def _validate(payload: RuleCreate | RuleUpdate) -> None:
    if hasattr(payload, "trigger_event") and payload.trigger_event:
        if payload.trigger_event not in automation_service.TRIGGERS:
            raise HTTPException(400, f"Unknown trigger '{payload.trigger_event}'. Valid: {sorted(automation_service.TRIGGERS)}")
    if hasattr(payload, "action_type") and payload.action_type:
        if payload.action_type not in automation_service.ACTIONS:
            raise HTTPException(400, f"Unknown action '{payload.action_type}'. Valid: {sorted(automation_service.ACTIONS.keys())}")


@router.get("/triggers")
async def list_triggers(current_user: User = Depends(check_permission("manage_automation_rules"))):
    return {
        "triggers": sorted(automation_service.TRIGGERS),
        "actions": sorted(automation_service.ACTIONS.keys()),
        "operators": ["eq", "neq", "in", "contains", "gt", "lt", "gte", "lte", "exists"],
    }


@router.post("", response_model=RuleResponse, status_code=201)
@router.post("/", response_model=RuleResponse, status_code=201)
async def create_rule(
    payload: RuleCreate,
    current_user: User = Depends(check_permission("manage_automation_rules")),
):
    _validate(payload)
    rule = AutomationRule(
        **payload.model_dump(),
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
    )
    await rule.insert()
    return _serialize(rule)


@router.get("", response_model=List[RuleResponse])
@router.get("/", response_model=List[RuleResponse])
async def list_rules(
    current_user: User = Depends(check_permission("manage_automation_rules")),
):
    rules = await AutomationRule.find(
        {"tenant_id": current_user.tenant_id, "deleted_at": None}
    ).sort("+priority").to_list()
    return [_serialize(r) for r in rules]


@router.get("/{rule_id}", response_model=RuleResponse)
async def get_rule(
    rule_id: str,
    current_user: User = Depends(check_permission("manage_automation_rules")),
):
    try:
        oid = ObjectId(rule_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    rule = await AutomationRule.find_one({"_id": oid, "tenant_id": current_user.tenant_id, "deleted_at": None})
    if not rule:
        raise HTTPException(404, "Rule not found")
    return _serialize(rule)


@router.put("/{rule_id}", response_model=RuleResponse)
async def update_rule(
    rule_id: str,
    payload: RuleUpdate,
    current_user: User = Depends(check_permission("manage_automation_rules")),
):
    _validate(payload)
    try:
        oid = ObjectId(rule_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    rule = await AutomationRule.find_one({"_id": oid, "tenant_id": current_user.tenant_id, "deleted_at": None})
    if not rule:
        raise HTTPException(404, "Rule not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(rule, k, v)
    rule.last_modified_by_id = current_user.id
    await rule.save()
    return _serialize(rule)


@router.delete("/{rule_id}")
async def delete_rule(
    rule_id: str,
    current_user: User = Depends(check_permission("manage_automation_rules")),
):
    try:
        oid = ObjectId(rule_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    rule = await AutomationRule.find_one({"_id": oid, "tenant_id": current_user.tenant_id, "deleted_at": None})
    if not rule:
        raise HTTPException(404, "Rule not found")
    await rule.soft_delete()
    return {"error": False, "message": "Rule deleted"}


class TestRequest(BaseModel):
    sample: Dict[str, Any]


@router.post("/{rule_id}/test")
async def test_rule(
    rule_id: str,
    payload: TestRequest,
    current_user: User = Depends(check_permission("manage_automation_rules")),
):
    """Evaluate a rule against a sample payload without executing actions."""
    try:
        oid = ObjectId(rule_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    rule = await AutomationRule.find_one({"_id": oid, "tenant_id": current_user.tenant_id, "deleted_at": None})
    if not rule:
        raise HTTPException(404, "Rule not found")
    matched = automation_service._conditions_pass(payload.sample, rule)
    return {
        "matched": matched,
        "would_run_action": rule.action_type if matched else None,
        "action_params": rule.action_params if matched else None,
    }
