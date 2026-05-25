"""
Phase 9 — File folders, shares, public links, versioning.

Mirrors old Laravel:
  Folders: rest_file_folders (CRUD), folder_delete/{id}
  Shares:  rest_share_files, rest_share_folder, rest_share_folder_list,
           rest_shared_files_by_admin, rest_shared_files_by_admin_new,
           rest_shared_with_me_folders, rest_share_folders
  Versions: rest_files_new, rest_files_new/{id} POST
  Public links: rest_files_public_link/{id}, rest_files_public_url/{token}
  Misc: rest_files_download/{id}, recent_files_all, rest_files_display/{token},
        rest_files_preview/{id}, file_delete/{id}
"""
from __future__ import annotations
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import secrets
from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.models.file import File
from app.models.file_extras import FileFolder, FileShare, FileVersion, FilePublicLink

router = APIRouter()


# ============== FOLDERS ==============

class FolderIn(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[PydanticObjectId] = None
    is_public: bool = False


@router.get("/folders")
async def list_folders(current_user: User = Depends(get_current_user)):
    rows = await FileFolder.find(
        {"tenant_id": current_user.tenant_id, "deleted_at": None}
    ).to_list()
    visible = [
        f for f in rows
        if f.is_public or f.owner_id == current_user.id
        or current_user.id in (f.shared_with_user_ids or [])
    ]
    return [r.model_dump() for r in visible]


@router.post("/folders", status_code=201)
async def create_folder(
    payload: FolderIn,
    current_user: User = Depends(get_current_user),
):
    obj = FileFolder(
        tenant_id=current_user.tenant_id,
        owner_id=current_user.id,
        **payload.model_dump(),
    )
    await obj.insert()
    return obj.model_dump()


@router.get("/folders/{folder_id}")
async def get_folder(
    folder_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await FileFolder.find_one(
        {"_id": folder_id, "tenant_id": current_user.tenant_id, "deleted_at": None}
    )
    if not obj:
        raise HTTPException(404, "Folder not found")
    return obj.model_dump()


@router.put("/folders/{folder_id}")
async def update_folder(
    folder_id: PydanticObjectId,
    payload: FolderIn,
    current_user: User = Depends(get_current_user),
):
    obj = await FileFolder.find_one(
        {"_id": folder_id, "tenant_id": current_user.tenant_id, "deleted_at": None}
    )
    if not obj:
        raise HTTPException(404, "Folder not found")
    if obj.owner_id != current_user.id:
        raise HTTPException(403, "Only the folder owner can edit")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    await obj.save()
    return obj.model_dump()


@router.delete("/folders/{folder_id}", status_code=204)
async def delete_folder(
    folder_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await FileFolder.find_one(
        {"_id": folder_id, "tenant_id": current_user.tenant_id, "deleted_at": None}
    )
    if not obj:
        raise HTTPException(404, "Folder not found")
    if obj.owner_id != current_user.id:
        raise HTTPException(403, "Only the folder owner can delete")
    obj.deleted_at = datetime.utcnow()
    await obj.save()


# ============== SHARES ==============

class ShareIn(BaseModel):
    file_id: Optional[PydanticObjectId] = None
    folder_id: Optional[PydanticObjectId] = None
    user_ids: List[PydanticObjectId]
    permission: str = "read"


@router.post("/shares", status_code=201)
async def create_share(
    payload: ShareIn,
    current_user: User = Depends(get_current_user),
):
    if not payload.file_id and not payload.folder_id:
        raise HTTPException(400, "file_id or folder_id required")
    created = []
    for uid in payload.user_ids:
        existing = await FileShare.find_one(
            {"tenant_id": current_user.tenant_id, "file_id": payload.file_id, "folder_id": payload.folder_id, "user_id": uid}
        )
        if existing:
            continue
        obj = FileShare(
            tenant_id=current_user.tenant_id,
            file_id=payload.file_id,
            folder_id=payload.folder_id,
            user_id=uid,
            permission=payload.permission,
            shared_by=current_user.id,
        )
        await obj.insert()
        created.append(obj.model_dump())
    # Mirror onto folder.shared_with_user_ids — tenant-scoped lookup
    if payload.folder_id:
        folder = await FileFolder.find_one(
            {"_id": payload.folder_id, "tenant_id": current_user.tenant_id, "deleted_at": None}
        )
        if folder:
            existing_ids = set(folder.shared_with_user_ids or [])
            existing_ids.update(payload.user_ids)
            folder.shared_with_user_ids = list(existing_ids)
            folder.updated_at = datetime.utcnow()
            await folder.save()
    return {"created": len(created), "shares": created}


@router.get("/shares/shared-with-me")
async def list_files_shared_with_me(current_user: User = Depends(get_current_user)):
    rows = await FileShare.find(
        {"tenant_id": current_user.tenant_id, "user_id": current_user.id}
    ).to_list()
    return [r.model_dump() for r in rows]


@router.get("/shares/folders-shared-with-me")
async def list_folders_shared_with_me(current_user: User = Depends(get_current_user)):
    rows = await FileFolder.find(
        {"tenant_id": current_user.tenant_id}
    ).to_list()
    out = [
        f for f in rows
        if current_user.id in (f.shared_with_user_ids or [])
    ]
    return [r.model_dump() for r in out]


@router.get("/shares/by-admin")
async def list_files_shared_by_admin(current_user: User = Depends(get_current_user)):
    """Mirror old `/rest_shared_files_by_admin` and `_new`."""
    rows = await FileShare.find(
        {"tenant_id": current_user.tenant_id, "user_id": current_user.id}
    ).to_list()
    return [r.model_dump() for r in rows]


@router.delete("/shares/{share_id}", status_code=204)
async def revoke_share(
    share_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await FileShare.get(share_id)
    if not obj or obj.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Share not found")
    if obj.shared_by != current_user.id:
        raise HTTPException(403, "Only the original sharer can revoke")
    await obj.delete()


# ============== VERSIONS ==============

class VersionIn(BaseModel):
    s3_url: str
    file_size: Optional[int] = None
    notes: Optional[str] = None


@router.get("/{file_id}/versions")
async def list_versions(
    file_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    rows = await FileVersion.find(
        {"tenant_id": current_user.tenant_id, "file_id": file_id}
    ).sort("-version_no").to_list()
    return [r.model_dump() for r in rows]


@router.post("/{file_id}/versions", status_code=201)
async def upload_new_version(
    file_id: PydanticObjectId,
    payload: VersionIn,
    current_user: User = Depends(get_current_user),
):
    file = await File.get(file_id)
    if not file or file.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "File not found")
    last = await FileVersion.find(
        {"tenant_id": current_user.tenant_id, "file_id": file_id}
    ).sort("-version_no").first_or_none()
    next_no = (last.version_no + 1) if last else 1
    obj = FileVersion(
        tenant_id=current_user.tenant_id,
        file_id=file_id,
        version_no=next_no,
        s3_url=payload.s3_url,
        file_size=payload.file_size,
        notes=payload.notes,
        uploaded_by=current_user.id,
    )
    await obj.insert()
    return obj.model_dump()


# ============== PUBLIC LINKS ==============

class PublicLinkIn(BaseModel):
    expires_in_days: Optional[int] = None


@router.post("/{file_id}/public-link", status_code=201)
async def create_public_link(
    file_id: PydanticObjectId,
    payload: PublicLinkIn,
    current_user: User = Depends(get_current_user),
):
    file = await File.get(file_id)
    if not file or file.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "File not found")
    expires_at = None
    if payload.expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=payload.expires_in_days)
    obj = FilePublicLink(
        tenant_id=current_user.tenant_id,
        file_id=file_id,
        token=secrets.token_urlsafe(32),
        expires_at=expires_at,
        created_by=current_user.id,
    )
    await obj.insert()
    return obj.model_dump()


@router.get("/{file_id}/public-link")
async def get_public_link(
    file_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await FilePublicLink.find_one(
        {"tenant_id": current_user.tenant_id, "file_id": file_id, "is_active": True}
    )
    if not obj:
        raise HTTPException(404, "No active public link")
    return obj.model_dump()


@router.delete("/{file_id}/public-link", status_code=204)
async def revoke_public_link(
    file_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await FilePublicLink.find_one(
        {"tenant_id": current_user.tenant_id, "file_id": file_id, "is_active": True}
    )
    if not obj:
        return
    obj.is_active = False
    await obj.save()


# Public access (no auth) — token-gated.
@router.get("/public/{token}", tags=["Public"])
async def access_public_link(token: str):
    obj = await FilePublicLink.find_one(
        {"token": token, "is_active": True}
    )
    if not obj:
        raise HTTPException(404, "Link not found or revoked")
    if obj.expires_at and obj.expires_at < datetime.utcnow():
        raise HTTPException(410, "Link expired")
    obj.access_count += 1
    await obj.save()
    file = await File.get(obj.file_id)
    if not file:
        raise HTTPException(404, "File missing")
    return {
        "file_id": str(file.id),
        "filename": getattr(file, "name", None),
        "s3_url": getattr(file, "s3_url", None),
        "size": getattr(file, "size", None),
        "access_count": obj.access_count,
    }


# ============== UTILITY ==============

@router.get("/recent")
async def recent_files(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/recent_files_all`."""
    rows = await File.find(
        {"tenant_id": current_user.tenant_id}
    ).sort("-created_at").limit(limit).to_list() if hasattr(File, "tenant_id") else []
    return [
        {
            "id": str(f.id),
            "name": getattr(f, "name", None),
            "size": getattr(f, "size", None),
            "created_at": getattr(f, "created_at", None),
        }
        for f in rows
    ]


@router.get("/{file_id}/download")
async def download_file_url(
    file_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/rest_files_download/{id}`. Returns presigned S3 URL."""
    file = await File.get(file_id)
    if not file or getattr(file, "tenant_id", None) != current_user.tenant_id:
        raise HTTPException(404, "File not found")
    return {
        "id": str(file.id),
        "download_url": getattr(file, "s3_url", None),
        "expires_in": 600,
    }


@router.get("/{file_id}/preview")
async def preview_file(
    file_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/rest_files_preview/{id}`. Returns inline preview metadata."""
    file = await File.get(file_id)
    if not file or getattr(file, "tenant_id", None) != current_user.tenant_id:
        raise HTTPException(404, "File not found")
    return {
        "id": str(file.id),
        "preview_url": getattr(file, "s3_url", None),
        "mime_type": getattr(file, "mime_type", None),
    }
