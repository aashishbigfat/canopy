"""
File API endpoints - File upload, download, and management
"""
import logging
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile, Form, Query, Request, Response
from fastapi.responses import StreamingResponse
from typing import Optional
from io import BytesIO

from app.core.config import settings
from app.models.user import User
from app.schemas.file import FileResponse, FileListResponse
from app.services.file_service import FileService, detect_extension_mismatch
from app.api.deps import get_current_user, check_permission
from app.core.rate_limiter import limiter

_logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/upload", response_model=FileResponse, status_code=201)
@limiter.limit("10/minute")
async def upload_file(
    request: Request,
    response: Response,
    file: UploadFile = FastAPIFile(...),
    # These are sent as multipart FORM fields by the client, so they must be
    # declared with Form(...). Without it FastAPI treats them as query params,
    # silently drops the form values, and every upload is stored unattached
    # (fileable_type=None) — so it never shows in the entity's attachment list.
    fileable_type: Optional[str] = Form(None),
    fileable_id: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    current_user: User = Depends(check_permission("upload_file"))
):
    """Upload a file to S3.

    SECURITY validations (in order):
    1. Filename is present.
    2. Extension is in the configured allowlist (rejects executables, scripts).
    3. Size is within MAX_FILE_SIZE (rejects DoS via huge upload).
    4. First bytes match the declared extension (rejects evil.exe-renamed-to-evil.pdf).
       The client-supplied content_type is NOT trusted.
    """
    service = FileService()

    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    # Extension allowlist — case-insensitive
    _, ext = os.path.splitext(file.filename)
    ext = ext.lower().lstrip(".")
    if not ext:
        raise HTTPException(status_code=400, detail="File has no extension")
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File extension '.{ext}' is not allowed. "
                   f"Allowed: {sorted(settings.ALLOWED_EXTENSIONS)}",
        )

    # Read content. NOTE: this still buffers the full body in memory; a
    # follow-up should use streaming + a chunked size check, but for now we
    # validate against MAX_FILE_SIZE after the read.
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="File is empty")
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size: {settings.MAX_FILE_SIZE // (1024 * 1024)}MB",
        )

    # Magic-byte sniff against declared extension
    mismatch = detect_extension_mismatch(ext, content[:32])
    if mismatch:
        raise HTTPException(
            status_code=400,
            detail=f"File content does not match declared type: {mismatch}",
        )

    file_obj = BytesIO(content)
    try:
        file_record = await service.upload_file(
            file_obj=file_obj,
            filename=file.filename,
            content_type=file.content_type,
            file_size=len(content),
            user_id=current_user.id,
            tenant_id=current_user.tenant_id,
            fileable_type=fileable_type,
            fileable_id=fileable_id,
            category=category,
        )
        return FileResponse.from_orm(file_record)
    except HTTPException:
        raise
    except Exception:
        _logger.exception(
            "File upload failed for tenant %s user %s file %s",
            current_user.tenant_id, current_user.id, file.filename,
        )
        # Don't leak internal error details to client
        raise HTTPException(status_code=500, detail="File upload failed")


@router.get("/{file_id}/download")
async def download_file(
    file_id: str,
    current_user: User = Depends(check_permission("download_file"))
):
    """Download a file"""
    service = FileService()
    
    result = await service.download_file(file_id, current_user.tenant_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="File not found")
    
    content, filename, mime_type = result
    
    return StreamingResponse(
        BytesIO(content),
        media_type=mime_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("/{file_id}/url")
async def get_file_url(
    file_id: str,
    expiration: int = 3600,
    current_user: User = Depends(check_permission("view_file"))
):
    """Get presigned URL for file"""
    service = FileService()
    
    url = await service.get_presigned_url(
        file_id,
        current_user.tenant_id,
        expiration
    )
    
    if not url:
        raise HTTPException(status_code=404, detail="File not found")
    
    return {
        "url": url,
        "expires_in": expiration
    }


@router.get("/", response_model=FileListResponse)
async def get_files(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    fileable_type: Optional[str] = None,
    fileable_id: Optional[str] = None,
    current_user: User = Depends(check_permission("view_file"))
):
    """Get all files for current user with pagination"""
    service = FileService()
    
    files, total = await service.get_user_files(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        fileable_type=fileable_type,
        fileable_id=fileable_id,
        page=page,
        per_page=per_page
    )
    
    return FileListResponse(
        files=[FileResponse.from_orm(f) for f in files],
        total=total
    )


@router.get("/entity/{fileable_type}/{fileable_id}", response_model=FileListResponse)
async def get_files_by_entity(
    fileable_type: str,
    fileable_id: str,
    current_user: User = Depends(check_permission("view_file"))
):
    """Get all files for a specific entity"""
    service = FileService()
    
    files = await service.get_files_by_entity(
        fileable_type,
        fileable_id,
        current_user.tenant_id
    )
    
    return FileListResponse(
        files=[FileResponse.from_orm(f) for f in files],
        total=len(files)
    )


@router.get("/{file_id}", response_model=FileResponse)
async def get_file(
    file_id: str,
    current_user: User = Depends(check_permission("view_file"))
):
    """Get file metadata"""
    service = FileService()
    
    file_record = await service.get_file(file_id, current_user.tenant_id)
    
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse.from_orm(file_record)


@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    current_user: User = Depends(check_permission("delete_file"))
):
    """Delete a file"""
    service = FileService()
    
    success = await service.delete_file(
        file_id,
        current_user.tenant_id,
        current_user.id
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="File not found or access denied")
    
    return {
        "error": False,
        "message": "File deleted successfully"
    }
