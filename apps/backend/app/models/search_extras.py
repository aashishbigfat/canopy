"""
Phase 12 — Search modules + supplier templates persistence.
"""
from __future__ import annotations
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field
from typing import List, Dict, Any
from datetime import datetime


class SearchModuleConfig(Document):
    tenant_id: Indexed(PydanticObjectId, unique=True)
    enabled_modules: List[str] = Field(default_factory=list)
    weights: Dict[str, int] = Field(default_factory=dict)
    settings: Dict[str, Any] = Field(default_factory=dict)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "search_module_configs"


class SearchNote(Document):
    tenant_id: Indexed(PydanticObjectId)
    user_id: Indexed(PydanticObjectId)
    query: str
    note: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "search_notes"


class SupplierEmailTemplate(Document):
    tenant_id: Indexed(PydanticObjectId)
    name: str
    subject: str
    body_html: str
    is_active: bool = True
    created_by: Indexed(PydanticObjectId)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "supplier_email_templates"
