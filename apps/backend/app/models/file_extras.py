"""
Phase 9 — File folders, shares, versions, public links.
"""
from __future__ import annotations
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field
from typing import List, Optional
from datetime import datetime


class FileFolder(Document):
    tenant_id: Indexed(PydanticObjectId)
    name: Indexed(str)
    description: Optional[str] = None
    parent_id: Optional[PydanticObjectId] = None
    owner_id: Indexed(PydanticObjectId)
    is_public: bool = False
    shared_with_user_ids: List[PydanticObjectId] = Field(default_factory=list)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None

    class Settings:
        name = "file_folders"


class FileShare(Document):
    tenant_id: Indexed(PydanticObjectId)
    file_id: Optional[PydanticObjectId] = None
    folder_id: Optional[PydanticObjectId] = None
    user_id: Indexed(PydanticObjectId)
    permission: str = "read"          # read | write
    shared_by: PydanticObjectId
    shared_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "file_shares"


class FileVersion(Document):
    tenant_id: Indexed(PydanticObjectId)
    file_id: Indexed(PydanticObjectId)
    version_no: int
    s3_url: Optional[str] = None
    file_size: Optional[int] = None
    uploaded_by: Indexed(PydanticObjectId)
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "file_versions"


class FilePublicLink(Document):
    tenant_id: Indexed(PydanticObjectId)
    file_id: Indexed(PydanticObjectId)
    token: Indexed(str, unique=True)
    expires_at: Optional[datetime] = None
    is_active: bool = True
    created_by: Indexed(PydanticObjectId)
    access_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "file_public_links"
