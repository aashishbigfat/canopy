"""
File model for managing uploaded files with S3 integration
"""
from beanie import Indexed
from pydantic import Field
from typing import Optional
from beanie import PydanticObjectId
from datetime import datetime
from app.models.base import BaseDocument

class File(BaseDocument):
    """File model for uploaded files"""
    
    # File Information
    filename: str
    original_filename: str
    file_path: str  # S3 path or local path
    file_size: int  # in bytes
    mime_type: str
    
    # Storage
    storage_type: str = "s3"  # s3, local
    s3_bucket: Optional[str] = None
    s3_key: Optional[str] = None
    
    # Polymorphic relationship (fileable)
    fileable_type: Optional[str] = None  # "Account", "Contact", "Lead", "Opportunity", etc.
    fileable_id: Optional[PydanticObjectId] = None
    
    # Category
    category: Optional[str] = None  # document, image, attachment, etc.
    
    # Ownership
    owner_id: Indexed(PydanticObjectId)
    
    # Tenant & Audit
    tenant_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    
    # Access
    is_public: bool = False
    download_count: int = 0
    
    class Settings:
        name = "files"
        # indexes = [
        # "tenant_id",
        # "owner_id",
        # [("tenant_id", 1), ("owner_id", 1)],
            # [("fileable_type", 1), ("fileable_id", 1)],
        # ]
    
    async def get_fileable(self):
        # """Get the related entity (polymorphic)"""
        if not self.fileable_type or not self.fileable_id:
            return None
        
        if self.fileable_type == "Account":
            from app.models.account import Account
            return await Account.get(self.fileable_id)
        elif self.fileable_type == "Contact":
            from app.models.contact import Contact
            return await Contact.get(self.fileable_id)
        elif self.fileable_type == "Lead":
            from app.models.lead import Lead
            return await Lead.get(self.fileable_id)
        elif self.fileable_type == "Opportunity":
            from app.models.opportunity import Opportunity
            return await Opportunity.get(self.fileable_id)
        
        return None
    
    async def increment_download_count(self):
        # """Increment download count"""
        self.download_count += 1
        await self.save()
