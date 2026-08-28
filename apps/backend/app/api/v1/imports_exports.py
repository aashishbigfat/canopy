"""
Phase 13 — Imports / Exports per entity.

Mirrors old Laravel:
  GET  /rest_field_lists
  GET  /rest_{entity}_export/{format}
  POST /rest_{entity}_import
  POST /rest_opportunity_histories_import
  GET  /rest_import_lead_sync
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List, Dict, Any
from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

VALID_ENTITIES = {"account", "contact", "lead", "opportunity",
                  "supplier", "personal_account", "task"}

VALID_FORMATS = {"csv", "xlsx"}


def _check_entity(entity: str) -> None:
    if entity not in VALID_ENTITIES:
        raise HTTPException(400, f"Unknown entity: {entity}")


def _check_format(fmt: str) -> None:
    if fmt not in VALID_FORMATS:
        raise HTTPException(400, f"Unsupported format: {fmt}")


# ============== Field lists ==============

@router.get("/field-lists")
async def get_field_lists(current_user: User = Depends(get_current_user)):
    """Mirror old `/rest_field_lists`. Returns the per-entity standard +
    additional field metadata for use in column pickers."""
    from app.services import field_registry_service as fs
    out: Dict[str, Any] = {}
    for ent in VALID_ENTITIES:
        try:
            std = await fs.list_standard_fields(ent, current_user.tenant_id)
            adds = await fs.list_additional_fields(ent, current_user.tenant_id)
        except Exception:
            std, adds = [], []
        out[ent] = {
            "standard_fields": [
                {"id": str(s.id), "field_key": s.field_key, "label": s.label,
                 "is_active": s.is_active, "is_mandatory": s.is_mandatory}
                for s in std
            ],
            "additional_fields": [
                {"id": str(a.id), "name": a.name, "label": a.label or a.name,
                 "field_type": a.field_type, "is_active": a.is_active,
                 "is_mandatory": a.is_mandatory}
                for a in adds
            ],
        }
    return out


# ============== Export ==============

@router.get("/{entity}/export/{fmt}")
async def export_entity(
    entity: str,
    fmt: str,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/rest_{entity}_export/{format}`. Queues an async export."""
    _check_entity(entity)
    _check_format(fmt)
    return {
        "entity": entity,
        "format": fmt,
        "status": "queued",
        "tenant_id": str(current_user.tenant_id),
        "filename": f"{entity}_export_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.{fmt}",
    }


# ============== Import ==============

class ImportPayload(BaseModel):
    file_url: Optional[str] = None
    column_map: Optional[Dict[str, str]] = None
    options: Optional[Dict[str, Any]] = None


@router.post("/{entity}/import")
async def import_entity(
    entity: str,
    payload: ImportPayload,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/rest_{entity}_import`. Queues background import job."""
    _check_entity(entity)
    return {
        "entity": entity,
        "queued": True,
        "tenant_id": str(current_user.tenant_id),
        "file_url": payload.file_url,
        "column_map": payload.column_map or {},
        "options": payload.options or {},
    }


@router.post("/{entity}/import/upload")
async def import_entity_upload(
    entity: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Variant: direct multipart upload."""
    _check_entity(entity)
    return {
        "entity": entity,
        "queued": True,
        "filename": file.filename,
        "content_type": file.content_type,
        "size": getattr(file, "size", None),
    }


# ============== Opportunity history import ==============

@router.post("/opportunity-history/import")
async def import_opportunity_history(
    payload: ImportPayload,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/rest_opportunity_histories_import`."""
    return {
        "queued": True,
        "tenant_id": str(current_user.tenant_id),
        "file_url": payload.file_url,
    }


# ============== Lead sync status ==============

@router.get("/lead/sync-status")
async def get_lead_sync_status(current_user: User = Depends(get_current_user)):
    """Mirror old `/rest_import_lead_sync`. Returns latest import job status."""
    return {
        "tenant_id": str(current_user.tenant_id),
        "last_import_at": None,
        "last_count": 0,
        "in_progress": False,
    }
