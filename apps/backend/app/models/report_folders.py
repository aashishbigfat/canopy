"""
Phase 8 — Report folders + sharing.
"""
from __future__ import annotations
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class ReportFolder(Document):
    """A folder grouping reports. Supports hierarchical folders."""
    tenant_id: Indexed(PydanticObjectId)
    name: Indexed(str)
    description: Optional[str] = None

    parent_id: Optional[PydanticObjectId] = None
    is_public: bool = False  # public folders visible across tenant
    is_default: bool = False

    created_by: Indexed(PydanticObjectId)
    last_modified_by_id: Optional[PydanticObjectId] = None
    shared_with_user_ids: List[PydanticObjectId] = Field(default_factory=list)
    report_ids: List[PydanticObjectId] = Field(default_factory=list)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "report_folders"


class ReportFolderShare(Document):
    """Per-user share record for a folder. Auxiliary index for cleanup queries."""
    tenant_id: Indexed(PydanticObjectId)
    folder_id: Indexed(PydanticObjectId)
    user_id: Indexed(PydanticObjectId)

    permission: str = "read"          # read | write
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "report_folder_shares"
