"""
Phase 14 — FCM push token + mobile bootstrap endpoints.

Mirrors old Laravel:
  POST /fcm_update
  POST /storeToken (mobile)
  GET  /send_reminder (cron trigger)
  GET  /view_notification, /check_notification, /all_notification, /get_all_notification
"""
from __future__ import annotations
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.models.fcm import FCMToken
from app.models.notification import Notification

router = APIRouter()


class FCMRegisterIn(BaseModel):
    token: str
    device_id: Optional[str] = None
    platform: Optional[str] = None
    app_version: Optional[str] = None


@router.post("/tokens", status_code=201)
async def register_fcm_token(
    payload: FCMRegisterIn,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/fcm_update` and `/storeToken`."""
    obj = await FCMToken.find_one(
        FCMToken.user_id == current_user.id,
        FCMToken.token == payload.token,
    )
    if obj:
        obj.is_active = True
        obj.device_id = payload.device_id or obj.device_id
        obj.platform = payload.platform or obj.platform
        obj.app_version = payload.app_version or obj.app_version
        obj.last_used_at = datetime.utcnow()
        obj.updated_at = datetime.utcnow()
        await obj.save()
        return obj.model_dump()
    obj = FCMToken(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        token=payload.token,
        device_id=payload.device_id,
        platform=payload.platform,
        app_version=payload.app_version,
        last_used_at=datetime.utcnow(),
    )
    await obj.insert()
    return obj.model_dump()


@router.get("/tokens")
async def list_my_fcm_tokens(current_user: User = Depends(get_current_user)):
    rows = await FCMToken.find(
        {"user_id": current_user.id, "is_active": True}
    ).to_list()
    return [r.model_dump() for r in rows]


@router.delete("/tokens/{token_id}", status_code=204)
async def deactivate_fcm_token(
    token_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    # Tenant + user scoped — the token belongs to one user inside one tenant.
    obj = await FCMToken.find_one(
        {"_id": token_id, "user_id": current_user.id, "tenant_id": current_user.tenant_id}
    )
    if not obj:
        raise HTTPException(404, "Token not found")
    obj.is_active = False
    obj.updated_at = datetime.utcnow()
    await obj.save()


# ============== Notification helpers (legacy paths) ==============

@router.get("/view-notification")
async def view_notification(current_user: User = Depends(get_current_user)):
    """Mirror old `/view_notification`. Returns latest unseen notification."""
    obj = await Notification.find(
        Notification.user_id == current_user.id,
        Notification.is_read == False,  # noqa: E712
    ).sort("-created_at").first_or_none()
    if not obj:
        return None
    return {
        "id": str(obj.id),
        "title": obj.title,
        "message": obj.message,
        "type": obj.type,
        "created_at": obj.created_at,
    }


@router.get("/check-notification")
async def check_notification(current_user: User = Depends(get_current_user)):
    """Mirror old `/check_notification`. Quick unread-count probe."""
    count = await Notification.find(
        Notification.user_id == current_user.id,
        Notification.is_read == False,  # noqa: E712
    ).count()
    return {"unread_count": count}


@router.get("/all-notifications")
async def all_notifications(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/all_notification` and `/get_all_notification`."""
    rows = await Notification.find(
        Notification.user_id == current_user.id,
    ).sort("-created_at").limit(limit).to_list()
    return [
        {
            "id": str(r.id),
            "title": r.title,
            "message": r.message,
            "type": r.type,
            "is_read": r.is_read,
            "created_at": r.created_at,
        }
        for r in rows
    ]


# ============== Reminder cron trigger ==============

@router.get("/send-reminders")
async def send_reminders(x_cron_key: Optional[str] = Header(None)):
    """
    Mirror old `/send_reminder`. Triggered by external cron. Iterates active
    reminders due within the next hour and emits notifications. Stub returns
    counters; real dispatch handled by Celery beat.
    """
    from app.models.reminder import Reminder
    now = datetime.utcnow()
    cutoff = now + timedelta(hours=1)
    due = await Reminder.find(
        Reminder.remind_at <= cutoff,
    ).to_list() if hasattr(Reminder, "remind_at") else []
    return {
        "now": now.isoformat(),
        "cutoff": cutoff.isoformat(),
        "due_count": len(due),
        "dispatched": 0,
    }
