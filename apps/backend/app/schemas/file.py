"""
Pydantic schemas for File API
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class FileResponse(BaseModel):
    """Schema for file response"""
    id: str
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    
    storage_type: str
    s3_bucket: Optional[str] = None
    s3_key: Optional[str] = None
    
    fileable_type: Optional[str] = None
    fileable_id: Optional[str] = None
    
    category: Optional[str] = None
    is_public: bool = False
    download_count: int = 0
    
    tenant_id: str
    owner_id: str
    created_at: datetime
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, obj):
        """Convert ObjectId fields to strings for API response"""
        if hasattr(obj, 'id'):
            data = obj.model_dump()
            # Convert ObjectId fields to strings
            data['id'] = str(obj.id)
            if hasattr(obj, 'tenant_id') and obj.tenant_id:
                data['tenant_id'] = str(obj.tenant_id)
            if hasattr(obj, 'owner_id') and obj.owner_id:
                data['owner_id'] = str(obj.owner_id)
            if hasattr(obj, 'fileable_id') and obj.fileable_id:
                data['fileable_id'] = str(obj.fileable_id)
            
            return cls(**data)
        return cls()


class FileListResponse(BaseModel):
    """Schema for list of files"""
    files: list[FileResponse]
    total: int
