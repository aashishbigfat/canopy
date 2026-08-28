"""
Phase 14 — FCM (Firebase Cloud Messaging) push token registry.
"""
from __future__ import annotations
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field
from typing import Optional
from datetime import datetime


class FCMToken(Document):
    """
    Per-device push notification token.
    Composite identity: (user_id, device_id) — duplicates are ignored on insert.
    """
    tenant_id: Indexed(PydanticObjectId)
    user_id: Indexed(PydanticObjectId)
    token: Indexed(str)
    device_id: Optional[str] = None
    platform: Optional[str] = None      # ios | android | web
    app_version: Optional[str] = None

    is_active: bool = True
    last_used_at: Optional[datetime] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "fcm_tokens"
