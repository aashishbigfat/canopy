"""
Phase 12 — Search modules + Supplier templates.

Mirrors old Laravel:
  /rest_search_modules (GET, POST)
  /rest_notes_add, /rest_notes_get
  /admin/rest_supplier_template, _update, _delete, /get_supplier_template
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List, Dict, Any
from beanie import Document, Indexed, PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import get_current_user
from app.models.user import User
from app.models.search_extras import (
    SearchModuleConfig, SearchNote, SupplierEmailTemplate,
)

router = APIRouter()


# ============== SEARCH MODULES ==============

class SearchModuleConfigIn(BaseModel):
    enabled_modules: List[str]
    weights: Optional[Dict[str, int]] = None
    settings: Optional[Dict[str, Any]] = None


@router.get("/modules")
async def get_search_modules(current_user: User = Depends(get_current_user)):
    obj = await SearchModuleConfig.find_one(
        {"tenant_id": current_user.tenant_id},
    )
    if not obj:
        return {
            "tenant_id": str(current_user.tenant_id),
            "enabled_modules": [],
            "weights": {},
            "settings": {},
        }
    return obj.model_dump()


@router.post("/modules")
async def save_search_modules(
    payload: SearchModuleConfigIn,
    current_user: User = Depends(get_current_user),
):
    obj = await SearchModuleConfig.find_one(
        {"tenant_id": current_user.tenant_id},
    )
    if obj:
        obj.enabled_modules = payload.enabled_modules
        if payload.weights is not None:
            obj.weights = payload.weights
        if payload.settings is not None:
            obj.settings = payload.settings
        obj.updated_at = datetime.utcnow()
        await obj.save()
        return obj.model_dump()
    obj = SearchModuleConfig(
        tenant_id=current_user.tenant_id,
        enabled_modules=payload.enabled_modules,
        weights=payload.weights or {},
        settings=payload.settings or {},
    )
    await obj.insert()
    return obj.model_dump()


# ============== SEARCH NOTES ==============

class SearchNoteIn(BaseModel):
    query: str
    note: str


@router.post("/notes", status_code=201)
async def add_search_note(
    payload: SearchNoteIn,
    current_user: User = Depends(get_current_user),
):
    obj = SearchNote(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        query=payload.query,
        note=payload.note,
    )
    await obj.insert()
    return obj.model_dump()


@router.get("/notes")
async def list_search_notes(current_user: User = Depends(get_current_user)):
    rows = await SearchNote.find(
        {"tenant_id": current_user.tenant_id, "user_id": current_user.id},
    ).sort("-created_at").to_list()
    return [r.model_dump() for r in rows]


# ============== SUPPLIER EMAIL TEMPLATES ==============

class SupplierTemplateIn(BaseModel):
    name: str
    subject: str
    body_html: str
    is_active: Optional[bool] = True


@router.get("/supplier-templates")
async def list_supplier_templates(current_user: User = Depends(get_current_user)):
    rows = await SupplierEmailTemplate.find(
        {"tenant_id": current_user.tenant_id},
    ).to_list()
    return [r.model_dump() for r in rows]


@router.post("/supplier-templates", status_code=201)
async def create_supplier_template(
    payload: SupplierTemplateIn,
    current_user: User = Depends(get_current_user),
):
    obj = SupplierEmailTemplate(
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
        **payload.model_dump(exclude_none=True),
    )
    await obj.insert()
    return obj.model_dump()


@router.put("/supplier-templates/{template_id}")
async def update_supplier_template(
    template_id: PydanticObjectId,
    payload: SupplierTemplateIn,
    current_user: User = Depends(get_current_user),
):
    obj = await SupplierEmailTemplate.get(template_id)
    if not obj or obj.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Template not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


@router.delete("/supplier-templates/{template_id}", status_code=204)
async def delete_supplier_template(
    template_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await SupplierEmailTemplate.get(template_id)
    if not obj or obj.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Template not found")
    await obj.delete()
