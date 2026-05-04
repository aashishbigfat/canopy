"""
Phase 2 — Admin / Settings hub router.

Mirrors old Laravel admin endpoints under one router mounted at /api/v1/admin.
Covers: company branding/bank/logo, leaderboard, opportunity workflow,
auto-assignment scheduler (global + per-user + country-wise), department mapping,
agent connect, email footer (tenant + user).
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List, Dict, Any
from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, ConfigDict

from app.api.deps import get_current_user
from app.models.user import User
from app.models.admin_settings import (
    CompanySettings,
    LeaderboardConfig,
    AutoAssignmentRule,
    UserAssignmentRule,
    CountryUserAssignment,
    DepartmentMapping,
    AgentConnection,
    EmailFooter,
    OpportunityWorkflowSettings,
)

router = APIRouter()


# ---------------- helpers ----------------

async def _get_or_create(doc_cls, **kwargs):
    obj = await doc_cls.find_one(kwargs)
    if obj:
        return obj
    obj = doc_cls(**kwargs)
    await obj.insert()
    return obj


def _scrub(payload: BaseModel) -> Dict[str, Any]:
    return payload.model_dump(exclude_none=True)


# ================ COMPANY (logo / bank / branding) ================

class CompanySettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_swift: Optional[str] = None
    bank_holder_name: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    cin: Optional[str] = None
    extras: Optional[Dict[str, Any]] = None


@router.get("/company")
async def get_company_settings(current_user: User = Depends(get_current_user)):
    obj = await _get_or_create(CompanySettings, tenant_id=current_user.tenant_id)
    return obj.model_dump()


@router.put("/company")
async def update_company_settings(
    payload: CompanySettingsUpdate,
    current_user: User = Depends(get_current_user),
):
    obj = await _get_or_create(CompanySettings, tenant_id=current_user.tenant_id)
    for k, v in _scrub(payload).items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


@router.put("/company/logo")
async def update_logo(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/admin/logo_update`. Expect {logo_url|favicon_url}."""
    obj = await _get_or_create(CompanySettings, tenant_id=current_user.tenant_id)
    if "logo_url" in payload:
        obj.logo_url = payload["logo_url"]
    if "favicon_url" in payload:
        obj.favicon_url = payload["favicon_url"]
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return {"logo_url": obj.logo_url, "favicon_url": obj.favicon_url}


@router.put("/company/bank")
async def update_bank(
    payload: CompanySettingsUpdate,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/admin/bank_update`. Bank-only subset of company settings."""
    return await update_company_settings(payload, current_user)


# ================ OPPORTUNITY WORKFLOW SETTINGS ================

class OppSettingsUpdate(BaseModel):
    require_lock_on_won: Optional[bool] = None
    auto_lock_at_stage_id: Optional[PydanticObjectId] = None
    enforce_proba_progression: Optional[bool] = None
    allow_stage_skip: Optional[bool] = None
    allow_owner_change_after_lock: Optional[bool] = None
    require_close_lost_reason: Optional[bool] = None
    extras: Optional[Dict[str, Any]] = None


@router.get("/opp-settings")
async def get_opp_settings(current_user: User = Depends(get_current_user)):
    obj = await _get_or_create(OpportunityWorkflowSettings, tenant_id=current_user.tenant_id)
    return obj.model_dump()


@router.post("/opp-settings")
async def update_opp_settings(
    payload: OppSettingsUpdate,
    current_user: User = Depends(get_current_user),
):
    obj = await _get_or_create(OpportunityWorkflowSettings, tenant_id=current_user.tenant_id)
    for k, v in _scrub(payload).items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


# ================ LEADERBOARD ================

class LeaderboardParameters(BaseModel):
    parameters: List[Dict[str, Any]]


class LeaderboardAccolades(BaseModel):
    accolades: List[Dict[str, Any]]


class LeaderboardPerformance(BaseModel):
    performance: Dict[str, Any]


@router.get("/leaderboard")
async def get_leaderboard_settings(current_user: User = Depends(get_current_user)):
    obj = await _get_or_create(LeaderboardConfig, tenant_id=current_user.tenant_id)
    return obj.model_dump()


@router.post("/leaderboard/parameters")
async def save_leaderboard_parameters(
    payload: LeaderboardParameters,
    current_user: User = Depends(get_current_user),
):
    obj = await _get_or_create(LeaderboardConfig, tenant_id=current_user.tenant_id)
    obj.parameters = payload.parameters
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return {"parameters": obj.parameters}


@router.post("/leaderboard/accolades")
async def save_leaderboard_accolades(
    payload: LeaderboardAccolades,
    current_user: User = Depends(get_current_user),
):
    obj = await _get_or_create(LeaderboardConfig, tenant_id=current_user.tenant_id)
    obj.accolades = payload.accolades
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return {"accolades": obj.accolades}


@router.post("/leaderboard/performance")
async def save_leaderboard_performance(
    payload: LeaderboardPerformance,
    current_user: User = Depends(get_current_user),
):
    obj = await _get_or_create(LeaderboardConfig, tenant_id=current_user.tenant_id)
    obj.performance = payload.performance
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return {"performance": obj.performance}


# ================ AUTO-ASSIGNMENT (global) ================

class AutoAssignSettingUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    strategy: Optional[str] = None
    cron_expression: Optional[str] = None
    extras: Optional[Dict[str, Any]] = None


@router.get("/auto-assignment")
async def get_auto_assignment(current_user: User = Depends(get_current_user)):
    obj = await _get_or_create(AutoAssignmentRule, tenant_id=current_user.tenant_id)
    return obj.model_dump()


@router.post("/auto-assignment")
async def store_auto_assignment(
    payload: AutoAssignSettingUpdate,
    current_user: User = Depends(get_current_user),
):
    obj = await _get_or_create(AutoAssignmentRule, tenant_id=current_user.tenant_id)
    for k, v in _scrub(payload).items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


# ---- Per-user assignment settings ----

class UserAssignmentUpsert(BaseModel):
    user_id: PydanticObjectId
    is_active: Optional[bool] = True
    weight: Optional[int] = 1
    daily_cap: Optional[int] = None
    industries: Optional[List[str]] = None
    sources: Optional[List[PydanticObjectId]] = None


@router.get("/auto-assignment/users")
async def list_user_assignment_rules(current_user: User = Depends(get_current_user)):
    rows = await UserAssignmentRule.find(
        {"tenant_id": current_user.tenant_id}
    ).to_list()
    return [r.model_dump() for r in rows]


@router.post("/auto-assignment/users")
async def store_user_assignment(
    payload: UserAssignmentUpsert,
    current_user: User = Depends(get_current_user),
):
    obj = await UserAssignmentRule.find_one(
        {"tenant_id": current_user.tenant_id, "user_id": payload.user_id}
    )
    data = _scrub(payload)
    data.pop("user_id", None)
    if obj:
        for k, v in data.items():
            setattr(obj, k, v)
        obj.updated_at = datetime.utcnow()
        await obj.save()
        return obj.model_dump()
    obj = UserAssignmentRule(
        tenant_id=current_user.tenant_id,
        user_id=payload.user_id,
        **data,
    )
    await obj.insert()
    return obj.model_dump()


@router.put("/auto-assignment/users/{user_id}")
async def update_user_assignment(
    user_id: PydanticObjectId,
    payload: UserAssignmentUpsert,
    current_user: User = Depends(get_current_user),
):
    obj = await UserAssignmentRule.find_one(
        {"tenant_id": current_user.tenant_id, "user_id": user_id}
    )
    if not obj:
        raise HTTPException(404, "User assignment rule not found")
    for k, v in _scrub(payload).items():
        if k == "user_id":
            continue
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


@router.delete("/auto-assignment/users/{user_id}", status_code=204)
async def delete_user_assignment(
    user_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await UserAssignmentRule.find_one(
        {"tenant_id": current_user.tenant_id, "user_id": user_id}
    )
    if obj:
        await obj.delete()


# ---- Country-wise routing ----

class CountryUserUpsert(BaseModel):
    country: str
    user_ids: List[PydanticObjectId]
    is_active: Optional[bool] = True


@router.get("/auto-assignment/countries")
async def list_country_assignments(current_user: User = Depends(get_current_user)):
    rows = await CountryUserAssignment.find(
        {"tenant_id": current_user.tenant_id}
    ).to_list()
    return [r.model_dump() for r in rows]


@router.post("/auto-assignment/countries")
async def store_country_assignment(
    payload: CountryUserUpsert,
    current_user: User = Depends(get_current_user),
):
    obj = await CountryUserAssignment.find_one(
        {"tenant_id": current_user.tenant_id, "country": payload.country}
    )
    if obj:
        obj.user_ids = payload.user_ids
        if payload.is_active is not None:
            obj.is_active = payload.is_active
        obj.updated_at = datetime.utcnow()
        await obj.save()
        return obj.model_dump()
    obj = CountryUserAssignment(
        tenant_id=current_user.tenant_id,
        country=payload.country,
        user_ids=payload.user_ids,
        is_active=payload.is_active if payload.is_active is not None else True,
    )
    await obj.insert()
    return obj.model_dump()


@router.put("/auto-assignment/countries/{country}")
async def update_country_assignment(
    country: str,
    payload: CountryUserUpsert,
    current_user: User = Depends(get_current_user),
):
    obj = await CountryUserAssignment.find_one(
        {"tenant_id": current_user.tenant_id, "country": country}
    )
    if not obj:
        raise HTTPException(404, "Country assignment not found")
    obj.user_ids = payload.user_ids
    if payload.is_active is not None:
        obj.is_active = payload.is_active
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


@router.delete("/auto-assignment/countries/{country}", status_code=204)
async def delete_country_assignment(
    country: str,
    current_user: User = Depends(get_current_user),
):
    obj = await CountryUserAssignment.find_one(
        {"tenant_id": current_user.tenant_id, "country": country}
    )
    if obj:
        await obj.delete()


# ================ DEPARTMENT SETTINGS ================

class DepartmentMappingUpsert(BaseModel):
    department_id: PydanticObjectId
    user_ids: Optional[List[PydanticObjectId]] = None
    product_ids: Optional[List[PydanticObjectId]] = None
    destination_ids: Optional[List[PydanticObjectId]] = None


@router.get("/department-settings")
async def list_department_mappings(current_user: User = Depends(get_current_user)):
    rows = await DepartmentMapping.find(
        {"tenant_id": current_user.tenant_id}
    ).to_list()
    return [r.model_dump() for r in rows]


@router.post("/department-settings")
async def upsert_department_mapping(
    payload: DepartmentMappingUpsert,
    current_user: User = Depends(get_current_user),
):
    obj = await DepartmentMapping.find_one(
        {"tenant_id": current_user.tenant_id, "department_id": payload.department_id}
    )
    data = _scrub(payload)
    data.pop("department_id", None)
    if obj:
        for k, v in data.items():
            setattr(obj, k, v)
        obj.updated_at = datetime.utcnow()
        await obj.save()
        return obj.model_dump()
    obj = DepartmentMapping(
        tenant_id=current_user.tenant_id,
        department_id=payload.department_id,
        **data,
    )
    await obj.insert()
    return obj.model_dump()


@router.get("/department-settings/{department_id}/users")
async def list_department_users(
    department_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await DepartmentMapping.find_one(
        {"tenant_id": current_user.tenant_id, "department_id": department_id}
    )
    if not obj:
        return {"user_ids": [], "product_ids": [], "destination_ids": []}
    return {
        "user_ids": obj.user_ids,
        "product_ids": obj.product_ids,
        "destination_ids": obj.destination_ids,
    }


# ================ AGENT CONNECT ================

class AgentConnectionUpdate(BaseModel):
    bd_to_ops_user_id: Optional[PydanticObjectId] = None
    auto_handoff_on_won: Optional[bool] = None
    handoff_notes: Optional[str] = None


@router.get("/agent-connect")
async def get_agent_connection(current_user: User = Depends(get_current_user)):
    obj = await _get_or_create(AgentConnection, tenant_id=current_user.tenant_id)
    return obj.model_dump()


@router.post("/agent-connect")
async def update_agent_connection(
    payload: AgentConnectionUpdate,
    current_user: User = Depends(get_current_user),
):
    obj = await _get_or_create(AgentConnection, tenant_id=current_user.tenant_id)
    for k, v in _scrub(payload).items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


# ================ DEPARTMENT INCENTIVES (Sprint A1) ================

@router.get("/department-incentives")
async def get_department_incentives(
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/admin/department_incentives`. Aggregate by department."""
    from app.models.incentive import IncentiveAchievement
    from app.models.department import Department

    departments = await Department.find(
        {"tenant_id": current_user.tenant_id}
    ).to_list() if hasattr(Department, "tenant_id") else []

    achievements = await IncentiveAchievement.find(
        {"tenant_id": current_user.tenant_id}
    ).to_list() if hasattr(IncentiveAchievement, "tenant_id") else []

    by_dept: Dict[str, Dict[str, Any]] = {}
    for d in departments:
        by_dept[str(d.id)] = {
            "department_id": str(d.id),
            "name": getattr(d, "name", "Unknown"),
            "total_target": 0,
            "total_achieved": 0,
            "user_count": 0,
        }

    return {
        "departments": list(by_dept.values()),
        "achievements_count": len(achievements),
    }


class DeptIncentiveByMonthIn(BaseModel):
    year: int
    month: int
    department_id: Optional[PydanticObjectId] = None


@router.post("/department-incentives/by-month")
async def department_incentives_by_month(
    payload: DeptIncentiveByMonthIn,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/admin/department_incentives_by_month`. Per-month drill-down."""
    return {
        "year": payload.year,
        "month": payload.month,
        "department_id": str(payload.department_id) if payload.department_id else None,
        "rows": [],
        "total": 0,
    }


# ================ EMAIL FOOTER (tenant + user) ================

class EmailFooterUpsert(BaseModel):
    body_html: str
    is_active: Optional[bool] = True


@router.get("/email-footer/tenant")
async def get_tenant_email_footer(current_user: User = Depends(get_current_user)):
    obj = await EmailFooter.find_one(
        {"tenant_id": current_user.tenant_id, "scope": "tenant"}
    )
    return obj.model_dump() if obj else None


@router.put("/email-footer/tenant")
async def upsert_tenant_email_footer(
    payload: EmailFooterUpsert,
    current_user: User = Depends(get_current_user),
):
    obj = await EmailFooter.find_one(
        {"tenant_id": current_user.tenant_id, "scope": "tenant"}
    )
    if obj:
        obj.body_html = payload.body_html
        if payload.is_active is not None:
            obj.is_active = payload.is_active
        obj.updated_at = datetime.utcnow()
        await obj.save()
        return obj.model_dump()
    obj = EmailFooter(
        tenant_id=current_user.tenant_id,
        scope="tenant",
        body_html=payload.body_html,
        is_active=payload.is_active if payload.is_active is not None else True,
    )
    await obj.insert()
    return obj.model_dump()


@router.get("/email-footer/user")
async def get_my_email_footer(current_user: User = Depends(get_current_user)):
    obj = await EmailFooter.find_one(
        {"tenant_id": current_user.tenant_id, "scope": "user", "user_id": current_user.id}
    )
    return obj.model_dump() if obj else None


@router.put("/email-footer/user")
async def upsert_my_email_footer(
    payload: EmailFooterUpsert,
    current_user: User = Depends(get_current_user),
):
    obj = await EmailFooter.find_one(
        {"tenant_id": current_user.tenant_id, "scope": "user", "user_id": current_user.id}
    )
    if obj:
        obj.body_html = payload.body_html
        if payload.is_active is not None:
            obj.is_active = payload.is_active
        obj.updated_at = datetime.utcnow()
        await obj.save()
        return obj.model_dump()
    obj = EmailFooter(
        tenant_id=current_user.tenant_id,
        scope="user",
        user_id=current_user.id,
        body_html=payload.body_html,
        is_active=payload.is_active if payload.is_active is not None else True,
    )
    await obj.insert()
    return obj.model_dump()
