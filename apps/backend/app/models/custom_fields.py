"""
Custom fields models for dynamic field management
"""
from beanie import Indexed, Document
from pydantic import Field
from typing import Optional, List
from beanie import PydanticObjectId
from datetime import datetime

class AdditionalFieldAccount(Document):
    """Definition of additional/custom fields for accounts"""
    name: str
    field_type: str  # text, number, date, dropdown, checkbox, etc.
    is_mandatory: bool = False
    is_active: bool = True
    sorting: int = 0
    
    # For dropdown fields
    options: List[str] = Field(default_factory=list)
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "additional_field_accounts"
        # indexes = ["tenant_id", "is_active", "sorting"]


class AccountCustomField(Document):
    """Values of custom fields for specific accounts"""
    account_id: Indexed(PydanticObjectId)
    account_additional_field_id: Indexed(PydanticObjectId)
    
    # Store value as JSON string for flexibility
    field_value: str
    
    # Field metadata
    type: str  # text, number, date, etc.
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "account_custom_fields"
        # indexes = [
        # "account_id",
        # "account_additional_field_id",
        # "tenant_id",
        # [("account_id", 1), ("account_additional_field_id", 1)]
        # ]
