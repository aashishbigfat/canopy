"""
Phase 11 — Dashboard quick links.
"""
from __future__ import annotations
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field
from typing import Optional
from datetime import datetime


class QuickLink(Document):
    tenant_id: Indexed(PydanticObjectId)
    user_id: Indexed(PydanticObjectId)
    label: str
    url: str
    icon: Optional[str] = None
    sort_order: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "quick_links"
