"""
File API endpoints - File upload, download, and management
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile, Query
from fastapi.responses import StreamingResponse
from typing import Optional
from io import BytesIO

from app.models.user import User
from app.schemas.file import FileResponse, FileListResponse
from app.services.file_service import FileService
from app.api.deps import get_current_user, check_permission

router = APIRouter()

@router.post("/upload", response_model=FileResponse, status_code=201)
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    fileable_type: Optional[str] = None,
    fileable_id: Optional[str] = None,
    category: Optional[str] = None,
    current_user: User = Depends(check_permission("upload_file"))
):
    """Upload a file to S3"""
    service = FileService()
    
    try:
        # Read file content
        content = await file.read()
        file_obj = BytesIO(content)
        
        # Upload file
        file_record = await service.upload_file(
            file_obj=file_obj,
            filename=file.filename,
            content_type=file.content_type,
            file_size=len(content),
            user_id=current_user.id,
            tenant_id=current_user.tenant_id,
            fileable_type=fileable_type,
            fileable_id=fileable_id,
            category=category
        )
        
        return FileResponse.from_orm(file_record)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")


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
