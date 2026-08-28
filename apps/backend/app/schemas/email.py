"""
Pydantic schemas for Email API
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class EmailBase(BaseModel):
    """Base schema for Email"""
    subject: str
    body: str
    from_email: EmailStr
    to_emails: List[EmailStr]
    cc_emails: List[EmailStr] = Field(default_factory=list)
    bcc_emails: List[EmailStr] = Field(default_factory=list)
    
    emailable_type: Optional[str] = None
    emailable_id: Optional[str] = None
    
    template_id: Optional[str] = None


class EmailCreate(EmailBase):
    """Schema for creating an email"""
    pass


class EmailSend(EmailBase):
    """Schema for sending an email"""
    send_immediately: bool = True


class EmailResponse(EmailBase):
    """Schema for email response"""
    id: str
    tenant_id: str
    owner_id: str
    
    status: str
    sent_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    open_count: int = 0
    
    created_at: datetime
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, obj):
        """Convert ObjectId fields to strings for API response"""
        if hasattr(obj, 'id'):
            data = obj.model_dump()
            # Convert ObjectId fields to strings
            data['id'] = str(obj.id)
            if hasattr(obj, 'tenant_id') and obj.tenant_id:
                data['tenant_id'] = str(obj.tenant_id)
            if hasattr(obj, 'owner_id') and obj.owner_id:
                data['owner_id'] = str(obj.owner_id)
            if hasattr(obj, 'emailable_id') and obj.emailable_id:
                data['emailable_id'] = str(obj.emailable_id)
            
            return cls(**data)
        return cls()


class EmailTemplateBase(BaseModel):
    """Base schema for EmailTemplate"""
    name: str
    subject: str
    body: str
    variables: List[str] = Field(default_factory=list)
    category: Optional[str] = None


class EmailTemplateCreate(EmailTemplateBase):
    """Schema for creating email template"""
    pass


class EmailTemplateResponse(EmailTemplateBase):
    """Schema for email template response"""
    id: str
    tenant_id: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, obj):
        """Convert ObjectId fields to strings for API response"""
        if hasattr(obj, 'id'):
            data = obj.model_dump()
            # Convert ObjectId fields to strings
            data['id'] = str(obj.id)
            if hasattr(obj, 'tenant_id') and obj.tenant_id:
                data['tenant_id'] = str(obj.tenant_id)
            
            return cls(**data)
        return cls()
