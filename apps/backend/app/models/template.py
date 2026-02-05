"""
Template model for email and document templates
"""
from beanie import Indexed
from pydantic import Field
from typing import Optional, List
from beanie import PydanticObjectId
from app.models.base import BaseDocument


class Template(BaseDocument):
    """Email/Document template"""
    
    name: Indexed(str)
    description: Optional[str] = None
    
    # Type
    type: str = "email"  # email, sms, document, quote, invoice
    category: Optional[str] = None
    
    # Content
    subject: Optional[str] = None  # For emails
    body: str
    
    # Variables/placeholders
    variables: List[str] = Field(default_factory=list)  # {{contact_name}}, {{company}}, etc.
    
    # Status
    is_active: bool = True
    is_default: bool = False
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    
    class Settings:
        name = "templates"
        # indexes = [
        # "tenant_id", "type", "category", "name",
        # [("tenant_id", 1), ("type", 1)],
            # [("tenant_id", 1), ("is_default", 1)],
        # ]
