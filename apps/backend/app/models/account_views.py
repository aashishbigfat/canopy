"""
Account views and columns models for saved filters and column configuration
"""
from beanie import Indexed, Document
from pydantic import Field
from typing import Optional, Dict, Any
from beanie import PydanticObjectId
from datetime import datetime

class AccountView(Document):
    """Saved views/filters for accounts"""
    name: str
    
    # Filter criteria stored as JSON
    filters: Dict[str, Any] = Field(default_factory=dict)
    
    # Visibility
    public_view: bool = False
    
    # Owner
    created_by: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "account_views"
        # indexes = [
        # "tenant_id",
        # "created_by",
        # [("tenant_id", 1), ("created_by", 1)],
            # [("tenant_id", 1), ("public_view", 1)]
        # ]


class AccountColumn(Document):
    """Column configuration for account list view"""
    name: str  # Internal field name
    alias_name: str  # Display name
    editable_flag: bool = False
    
    # Tenant (can be null for system columns)
    tenant_id: Optional[Indexed(PydanticObjectId)] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "account_columns"
        # indexes = ["tenant_id"]


class AccountPinView(Document):
    """Pinned view for quick access"""
    owner_id: Indexed(PydanticObjectId, unique=True)
    account_view_id: PydanticObjectId
    tenant_id: Indexed(PydanticObjectId)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "account_pin_views"
        # indexes = ["owner_id", "tenant_id"]
