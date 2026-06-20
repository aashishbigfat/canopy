"""
Email model with polymorphic relationships - Email tracking and management
"""
from beanie import Indexed
from pydantic import EmailStr, Field
from typing import Optional, List
from beanie import PydanticObjectId
from datetime import datetime
from app.models.base import BaseDocument

class Email(BaseDocument):
    """Email model for tracking sent/received emails"""
    
    # Email Details
    subject: str
    body: str
    from_email: EmailStr
    to_emails: List[EmailStr] = Field(default_factory=list)
    cc_emails: List[EmailStr] = Field(default_factory=list)
    bcc_emails: List[EmailStr] = Field(default_factory=list)
    
    # Polymorphic relationship (emailable)
    emailable_type: Optional[str] = None  # "Account", "Contact", "Lead", "Opportunity"
    emailable_id: Optional[PydanticObjectId] = None
    
    # Status
    status: str = "Draft"  # Draft, Sent, Failed, Delivered, Opened
    sent_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    
    # Attachments
    attachment_ids: List[PydanticObjectId] = Field(default_factory=list)
    
    # Template
    template_id: Optional[PydanticObjectId] = None
    
    # Ownership
    owner_id: Indexed(PydanticObjectId)
    
    # Tenant & Audit
    tenant_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    
    # Tracking
    is_tracked: bool = True
    open_count: int = 0
    
    class Settings:
        name = "emails"
        # Indexes managed out of band by scripts/create_indexes.py (deploy step).
        # indexes = [
        # "tenant_id",
        # "owner_id",
        # "status",
        # [("tenant_id", 1), ("owner_id", 1)],
            # [("emailable_type", 1), ("emailable_id", 1)],
        # ]
    
    async def get_emailable(self):
        """Get the related entity (polymorphic), scoped to this email's tenant."""
        if not self.emailable_type or not self.emailable_id:
            return None

        common = {"_id": self.emailable_id, "tenant_id": self.tenant_id, "deleted_at": None}

        if self.emailable_type == "Account":
            from app.models.account import Account
            return await Account.find_one(common)
        elif self.emailable_type == "Contact":
            from app.models.contact import Contact
            return await Contact.find_one(common)
        elif self.emailable_type == "Lead":
            from app.models.lead import Lead
            return await Lead.find_one(common)
        elif self.emailable_type == "Opportunity":
            from app.models.opportunity import Opportunity
            return await Opportunity.find_one(common)

        return None
    
    async def mark_sent(self):
        # """Mark email as sent"""
        self.status = "Sent"
        self.sent_at = datetime.utcnow()
        await self.save()
    
    async def mark_opened(self):
        # """Mark email as opened"""
        if self.status == "Sent":
            self.status = "Opened"
            self.opened_at = datetime.utcnow()
        self.open_count += 1
        await self.save()


class EmailTemplate(BaseDocument):
    """Email template for reusable email content"""
    
    name: Indexed(str)
    subject: str
    body: str
    
    # Template variables support
    variables: List[str] = Field(default_factory=list)  # e.g., ["{{name}}", "{{company}}"]
    
    # Category
    category: Optional[str] = None
    
    # Tenant
    tenant_id: Indexed(PydanticObjectId)
    created_by: PydanticObjectId
    
    is_active: bool = True
    
    class Settings:
        name = "email_templates"
        # indexes = ["tenant_id", "category"]
