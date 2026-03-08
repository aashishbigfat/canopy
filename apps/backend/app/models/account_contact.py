"""
Pivot collection for Account-Contact many-to-many relationship
"""
from beanie import Document, Indexed
from beanie import PydanticObjectId
from datetime import datetime
from pydantic import Field

class AccountContact(Document):
    """Pivot table for Account-Contact relationship"""
    
    account_id: Indexed(PydanticObjectId)
    contact_id: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "account_contact"
        # indexes = [
        # [("account_id", 1), ("contact_id", 1)],
            # "tenant_id"
        # ]
