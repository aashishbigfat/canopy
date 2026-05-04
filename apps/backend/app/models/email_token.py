"""
Phase 17 — Email verification / password reset tokens.
"""
from __future__ import annotations
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field
from typing import Optional
from datetime import datetime


class EmailToken(Document):
    user_id: Indexed(PydanticObjectId)
    token: Indexed(str, unique=True)
    purpose: str = "verify"          # verify | reset
    expires_at: Optional[datetime] = None
    used_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "email_tokens"
