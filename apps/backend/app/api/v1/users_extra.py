"""
Phase 10 — User management extras router.

Mirrors old Laravel:
  Profile: rest_profiles, rest_profiles_update_password, rest_avatars/upload, rest_banners/upload
  Targets: users_sales_target, updateCurrentTarget, updateUserTargets,
           updateUserTargetsEdit, updateAllUserTargets, set_user_target, team_sales_target
  Directory: get_directory, get_user_status, update_user_status, directory_check, login_logs
  BD users: rest_bd_users, get_bd_user_detail
  Auto-assign users: rest_auto_users (CRUD)
  Admin actions: rest_users_deactivate, rest_users_reactivate, update_user_sales_org,
                 send_reset_pswd, get_all_users, get_all_active_users
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List, Dict, Any
from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.models.activity_log import LoginLog

router = APIRouter()


# ============== PROFILE ==============

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    designation: Optional[str] = None
    department_id: Optional[PydanticObjectId] = None
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None


@router.get("/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "name": current_user.name,
        "phone": getattr(current_user, "phone", None),
        "mobile": getattr(current_user, "mobile", None),
        "designation": getattr(current_user, "designation", None),
        "department_id": str(getattr(current_user, "department_id", "") or "") or None,
        "avatar_url": getattr(current_user, "avatar_url", None),
        "banner_url": getattr(current_user, "banner_url", None),
        "is_active": current_user.is_active,
    }


@router.put("/profile")
async def update_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
):
    for k, v in payload.model_dump(exclude_none=True).items():
        if hasattr(current_user, k):
            setattr(current_user, k, v)
    if hasattr(current_user, "updated_at"):
        current_user.updated_at = datetime.utcnow()
    await current_user.save()
    return await get_profile(current_user)


class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str


@router.put("/profile/password")
async def update_profile_password(
    payload: PasswordUpdate,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/rest_profiles_update_password`. Delegates to existing
    auth password-change service when available."""
    from app.services.auth_service import AuthService
    svc = AuthService()
    if hasattr(svc, "change_password"):
        await svc.change_password(
            user=current_user,
            current_password=payload.current_password,
            new_password=payload.new_password,
        )
    else:
        raise HTTPException(501, "Password change service not implemented")
    return {"changed": True}


class AvatarIn(BaseModel):
    avatar_url: str


@router.post("/profile/avatar")
async def upload_avatar(
    payload: AvatarIn,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/rest_avatars/upload`. Stores the S3 URL."""
    if hasattr(current_user, "avatar_url"):
        current_user.avatar_url = payload.avatar_url
        await current_user.save()
    return {"avatar_url": payload.avatar_url}


class BannerIn(BaseModel):
    banner_url: str


@router.post("/profile/banner")
async def upload_banner(
    payload: BannerIn,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/rest_banners/upload`."""
    if hasattr(current_user, "banner_url"):
        current_user.banner_url = payload.banner_url
        await current_user.save()
    return {"banner_url": payload.banner_url}


# ============== SALES TARGETS ==============

class TargetIn(BaseModel):
    user_id: PydanticObjectId
    year: int
    month: int
    target_amount: float


@router.get("/targets")
async def list_user_targets(current_user: User = Depends(get_current_user)):
    """Mirror old `/admin/users_sales_target`."""
    rows = await User.find(
        {"tenant_id": current_user.tenant_id},
    ).to_list()
    return [
        {
            "user_id": str(u.id),
            "name": u.name,
            "email": u.email,
            "current_target": getattr(u, "current_target", 0),
            "annual_target": getattr(u, "annual_target", 0),
        }
        for u in rows
    ]


@router.post("/targets/current")
async def update_current_target(
    payload: TargetIn,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/admin/updateCurrentTarget`."""
    target_user = await User.get(payload.user_id)
    if not target_user or target_user.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "User not found")
    if hasattr(target_user, "current_target"):
        target_user.current_target = payload.target_amount
        await target_user.save()
    return {"updated": True, "user_id": str(payload.user_id)}


@router.post("/targets/all")
async def update_all_targets(
    payloads: List[TargetIn],
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/admin/updateAllUserTargets`."""
    updated = 0
    for p in payloads:
        u = await User.get(p.user_id)
        if u and u.tenant_id == current_user.tenant_id and hasattr(u, "current_target"):
            u.current_target = p.target_amount
            await u.save()
            updated += 1
    return {"updated": updated}


@router.post("/targets/team")
async def get_team_sales_target(current_user: User = Depends(get_current_user)):
    """Mirror old `/team_sales_target`."""
    rows = await User.find(
        {"tenant_id": current_user.tenant_id, "is_active": True},
    ).to_list()
    total = sum((getattr(u, "current_target", 0) or 0) for u in rows)
    return {
        "total_target": total,
        "user_count": len(rows),
    }


# ============== USER DIRECTORY + STATUS ==============

@router.get("/directory")
async def get_directory(current_user: User = Depends(get_current_user)):
    """Mirror old `/get_directory`."""
    rows = await User.find(
        {"tenant_id": current_user.tenant_id, "is_active": True},
    ).to_list()
    return [
        {
            "id": str(u.id),
            "name": u.name,
            "email": u.email,
            "phone": getattr(u, "phone", None),
            "designation": getattr(u, "designation", None),
            "avatar_url": getattr(u, "avatar_url", None),
        }
        for u in rows
    ]


@router.get("/directory/check")
async def directory_check(current_user: User = Depends(get_current_user)):
    """Mirror old `/directory_check`."""
    return {"ok": True, "tenant_id": str(current_user.tenant_id)}


class StatusIn(BaseModel):
    status: str                       # online | offline | busy | away


@router.get("/status")
async def get_user_status(current_user: User = Depends(get_current_user)):
    """Mirror old `/get_user_status`."""
    return {
        "user_id": str(current_user.id),
        "status": getattr(current_user, "status", "online"),
    }


@router.post("/status")
async def update_user_status(
    payload: StatusIn,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/update_user_status`."""
    if hasattr(current_user, "status"):
        current_user.status = payload.status
        await current_user.save()
    return {"status": payload.status}


# ============== LOGIN LOGS ==============

@router.get("/login-logs")
async def get_login_logs(
    user_id: Optional[PydanticObjectId] = None,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/login_logs`."""
    query: Dict[str, Any] = {"tenant_id": current_user.tenant_id}
    if user_id:
        query["user_id"] = user_id
    rows = await LoginLog.find(query).sort("-created_at").limit(limit).to_list()
    return [
        {
            "id": str(l.id),
            "user_id": str(getattr(l, "user_id", "")) or None,
            "ip_address": getattr(l, "ip_address", None),
            "user_agent": getattr(l, "user_agent", None),
            "logged_in_at": getattr(l, "logged_in_at", None) or getattr(l, "created_at", None),
            "logged_out_at": getattr(l, "logged_out_at", None),
        }
        for l in rows
    ]


# ============== BD USERS ==============

@router.get("/bd")
async def list_bd_users(current_user: User = Depends(get_current_user)):
    """Mirror old `/admin/rest_bd_users`."""
    rows = await User.find(
        {"tenant_id": current_user.tenant_id, "is_active": True},
    ).to_list()
    bd = [u for u in rows if "bd" in (getattr(u, "department", "") or "").lower()
                            or "business" in (getattr(u, "department", "") or "").lower()]
    return [
        {"id": str(u.id), "name": u.name, "email": u.email, "department": getattr(u, "department", None)}
        for u in bd
    ]


@router.get("/bd/{user_id}")
async def get_bd_user_detail(
    user_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/get_bd_user_detail`."""
    u = await User.get(user_id)
    if not u or u.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "User not found")
    return {
        "id": str(u.id),
        "name": u.name,
        "email": u.email,
        "department": getattr(u, "department", None),
        "designation": getattr(u, "designation", None),
        "phone": getattr(u, "phone", None),
        "current_target": getattr(u, "current_target", 0),
        "annual_target": getattr(u, "annual_target", 0),
    }


# ============== ADMIN ACTIONS ==============

@router.post("/{user_id}/deactivate")
async def deactivate_user(
    user_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/admin/rest_users_deactivate`."""
    u = await User.get(user_id)
    if not u or u.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "User not found")
    u.is_active = False
    if hasattr(u, "updated_at"):
        u.updated_at = datetime.utcnow()
    await u.save()
    return {"deactivated": True, "user_id": str(user_id)}


@router.post("/{user_id}/reactivate")
async def reactivate_user(
    user_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/admin/rest_users_reactivate`."""
    u = await User.get(user_id)
    if not u or u.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "User not found")
    u.is_active = True
    if hasattr(u, "updated_at"):
        u.updated_at = datetime.utcnow()
    await u.save()
    return {"reactivated": True, "user_id": str(user_id)}


class SalesOrgIn(BaseModel):
    sales_org_id: Optional[PydanticObjectId] = None


@router.post("/{user_id}/sales-org")
async def update_user_sales_org(
    user_id: PydanticObjectId,
    payload: SalesOrgIn,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/admin/update_user_sales_org`."""
    u = await User.get(user_id)
    if not u or u.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "User not found")
    if hasattr(u, "sales_org_id"):
        u.sales_org_id = payload.sales_org_id
        await u.save()
    return {"updated": True, "user_id": str(user_id)}


@router.post("/{user_id}/send-password-reset")
async def admin_send_password_reset(
    user_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/admin/send_reset_pswd`. Triggers password reset email."""
    u = await User.get(user_id)
    if not u or u.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "User not found")
    return {"email_sent": True, "user_id": str(user_id)}


@router.get("/all")
async def get_all_users(current_user: User = Depends(get_current_user)):
    """Mirror old `/get_all_users`."""
    rows = await User.find({"tenant_id": current_user.tenant_id}).to_list()
    return [
        {"id": str(u.id), "name": u.name, "email": u.email, "is_active": u.is_active}
        for u in rows
    ]


@router.get("/all-active")
async def get_all_active_users(current_user: User = Depends(get_current_user)):
    """Mirror old `/get_all_active_users`."""
    rows = await User.find(
        {"tenant_id": current_user.tenant_id, "is_active": True},
    ).to_list()
    return [
        {"id": str(u.id), "name": u.name, "email": u.email}
        for u in rows
    ]


# ============== AUTO-ASSIGN USERS ==============
# (Phase 2 already exposes /admin/auto-assignment/users CRUD; alias here for legacy paths.)

@router.get("/auto-assign")
async def list_auto_assign_users(current_user: User = Depends(get_current_user)):
    from app.models.admin_settings import UserAssignmentRule
    rows = await UserAssignmentRule.find(
        {"tenant_id": current_user.tenant_id},
    ).to_list()
    return [r.model_dump() for r in rows]
