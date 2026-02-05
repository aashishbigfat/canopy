"""
Email service layer - Business logic for email management and sending
"""
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
from app.models.email import Email, EmailTemplate
from app.schemas.email import EmailCreate, EmailSend, EmailTemplateCreate

class EmailService:
    """Service for Email business logic"""
    
    async def create_email(
        self,
        email_data: EmailCreate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Email:
        """Create a new email (draft)"""
        
        email = Email(
            **email_data.model_dump(exclude_unset=True),
            tenant_id=tenant_id,
            owner_id=user_id,
            created_by=user_id,
            status="Draft"
        )
        
        await email.insert()
        return email
    
    async def send_email(
        self,
        email_data: EmailSend,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Email:
        """Create and send an email"""
        from app.services.email_service import EmailService as SMTPService
        
        # Create email record
        email = Email(
            **email_data.model_dump(exclude_unset=True, exclude={'send_immediately'}),
            tenant_id=tenant_id,
            owner_id=user_id,
            created_by=user_id,
            status="Draft"
        )
        
        await email.insert()
        
        # Send via SMTP
        if email_data.send_immediately:
            smtp_service = SMTPService()
            try:
                await smtp_service.send_email(
                    to_email=email_data.to_emails[0],
                    subject=email_data.subject,
                    body=email_data.body
                )
                await email.mark_sent()
            except Exception as e:
                email.status = "Failed"
                await email.save()
                raise e
        
        return email
    
    async def get_email(
        self,
        email_id: str,
        tenant_id: ObjectId
    ) -> Optional[Email]:
        """Get email by ID"""
        email = await Email.get(ObjectId(email_id))
        
        if email and email.tenant_id == tenant_id and not email.deleted_at:
            return email
        return None
    
    async def get_emails_by_entity(
        self,
        emailable_type: str,
        emailable_id: str,
        tenant_id: ObjectId
    ) -> List[Email]:
        """Get all emails for a specific entity"""
        emails = await Email.find(
            Email.emailable_type == emailable_type,
            Email.emailable_id == ObjectId(emailable_id),
            Email.tenant_id == tenant_id,
            Email.deleted_at == None
        ).sort("-created_at").to_list()
        
        return emails
    
    async def track_open(
        self,
        email_id: str,
        tenant_id: ObjectId
    ) -> bool:
        """Track email open"""
        email = await self.get_email(email_id, tenant_id)
        
        if not email:
            return False
        
        await email.mark_opened()
        return True
    
    # Email Templates
    
    async def create_template(
        self,
        template_data: EmailTemplateCreate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> EmailTemplate:
        """Create email template"""
        
        template = EmailTemplate(
            **template_data.model_dump(exclude_unset=True),
            tenant_id=tenant_id,
            created_by=user_id
        )
        
        await template.insert()
        return template
    
    async def get_templates(
        self,
        tenant_id: ObjectId,
        category: Optional[str] = None
    ) -> List[EmailTemplate]:
        """Get email templates"""
        query = {
            "tenant_id": tenant_id,
            "is_active": True,
            "deleted_at": None
        }
        
        if category:
            query["category"] = category
        
        templates = await EmailTemplate.find(query).sort("+name").to_list()
        return templates
    
    async def apply_template(
        self,
        template_id: str,
        variables: dict,
        tenant_id: ObjectId
    ) -> dict:
        """Apply template with variables"""
        template = await EmailTemplate.get(ObjectId(template_id))
        
        if not template or template.tenant_id != tenant_id:
            raise ValueError("Template not found")
        
        # Replace variables
        subject = template.subject
        body = template.body
        
        for key, value in variables.items():
            placeholder = f"{{{{{key}}}}}"
            subject = subject.replace(placeholder, str(value))
            body = body.replace(placeholder, str(value))
        
        return {
            "subject": subject,
            "body": body
        }
