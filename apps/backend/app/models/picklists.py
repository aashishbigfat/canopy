"""
Picklist models for Account module
"""
from beanie import Indexed
from pydantic import Field
from typing import Optional
from beanie import PydanticObjectId
from app.models.base import BaseDocument

class AccountType(BaseDocument):
    """Account type picklist"""
    name: Indexed(str)
    description: Optional[str] = None
    tenant_id: Indexed(PydanticObjectId)
    sorting: int = 0
    is_active: bool = True
    
    class Settings:
        name = "account_types"
        indexes = ["tenant_id", "sorting"]


class Industry(BaseDocument):
    """Industry picklist"""
    name: Indexed(str)
    description: Optional[str] = None
    tenant_id: Indexed(PydanticObjectId)
    sorting: int = 0
    is_active: bool = True
    
    class Settings:
        name = "industries"
        indexes = ["tenant_id", "sorting"]


class Rating(BaseDocument):
    """Account rating/category picklist"""
    name: Indexed(str)
    description: Optional[str] = None
    sorting: int = 0
    is_active: bool = True
    
    class Settings:
        name = "ratings"
        indexes = ["sorting"]


class AccountSource(BaseDocument):
    """Account source picklist"""
    name: Indexed(str)
    description: Optional[str] = None
    tenant_id: Indexed(PydanticObjectId)
    sorting: int = 0
    is_active: bool = True
    
    class Settings:
        name = "account_sources"
        indexes = ["tenant_id", "sorting"]
