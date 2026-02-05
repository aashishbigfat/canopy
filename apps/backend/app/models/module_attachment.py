"""
Module attachments for file management
"""
from beanie import Indexed, Document
from pydantic import Field
from typing import Optional
from beanie import PydanticObjectId
from datetime import datetime

class ModuleAttachment(Document):
    """File attachments for any module (polymorphic)"""
    
    # Module info (polymorphic)
    module: str  # "Account", "Opportunity", "Contact", etc.
    module_id: Indexed(PydanticObjectId)
    
    # File info
    file_name: str
    file_extension: str
    file_size: int  # bytes
    file_path: Optional[str] = None  # Local path or S3 key
    
    # S3 info (if using S3)
    s3_bucket: Optional[str] = None
    s3_key: Optional[str] = None
    s3_url: Optional[str] = None
    
    # Metadata
    description: Optional[str] = None
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    uploaded_by: PydanticObjectId
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "module_attachments"
        # indexes = [
        # "module",
        # "module_id",
        # "tenant_id",
        # [("module", 1), ("module_id", 1)],
            # [("tenant_id", 1), ("module", 1)]
        # ]
