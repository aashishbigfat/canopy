"""
Email API endpoints - Email tracking and management
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from bson import ObjectId

from app.models.user import User
from app.schemas.email import (
    EmailCreate, EmailSend, EmailResponse,
    EmailTemplateCreate, EmailTemplateResponse
)
from app.services.email_tracking_service import EmailService
from app.api.deps import get_current_user, check_permission

router = APIRouter()

# Email Endpoints

@router.post("/", response_model=EmailResponse, status_code=201)
async def create_email(
    email_data: EmailCreate,
    current_user: User = Depends(check_permission("create_email"))
):
    """Create a new email (draft)"""
    service = EmailService()
    email = await service.create_email(
        email_data,
        current_user.id,
        current_user.tenant_id
    )
    
    return EmailResponse.from_orm(email)


@router.post("/send", response_model=EmailResponse)
async def send_email(
    email_data: EmailSend,
    current_user: User = Depends(check_permission("send_email"))
):
    """Send an email"""
    service = EmailService()
    
    try:
        email = await service.send_email(
            email_data,
            current_user.id,
            current_user.tenant_id
        )
        
        return EmailResponse.from_orm(email)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


@router.get("/entity/{emailable_type}/{emailable_id}")
async def get_emails_by_entity(
    emailable_type: str,
    emailable_id: str,
    current_user: User = Depends(check_permission("view_email"))
):
    """Get all emails for a specific entity"""
    service = EmailService()
    emails = await service.get_emails_by_entity(
        emailable_type,
        emailable_id,
        current_user.tenant_id
    )
    
    return {
        "emails": [EmailResponse.from_orm(e) for e in emails],
        "total": len(emails)
    }


# Email Template Endpoints (must come before /{email_id} to avoid routing conflicts)

@router.post("/templates", response_model=EmailTemplateResponse, status_code=201)
async def create_template(
    template_data: EmailTemplateCreate,
    current_user: User = Depends(check_permission("create_email_template"))
):
    """Create email template"""
    service = EmailService()
    template = await service.create_template(
        template_data,
        current_user.id,
        current_user.tenant_id
    )
    
    return EmailTemplateResponse.from_orm(template)


@router.get("/templates")
async def get_templates(
    category: Optional[str] = None,
    current_user: User = Depends(check_permission("view_email_template"))
):
    """Get email templates"""
    service = EmailService()
    templates = await service.get_templates(
        current_user.tenant_id,
        category=category
    )
    
    return {
        "templates": [EmailTemplateResponse.from_orm(t) for t in templates],
        "total": len(templates)
    }


@router.post("/templates/{template_id}/apply")
async def apply_template(
    template_id: str,
    variables: dict,
    current_user: User = Depends(check_permission("view_email_template"))
):
    """Apply template with variables"""
    service = EmailService()
    result = await service.apply_template(template_id, variables, current_user.tenant_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return result


@router.get("/{email_id}", response_model=EmailResponse)
async def get_email(
    email_id: str,
    current_user: User = Depends(check_permission("view_email"))
):
    """Get email by ID"""
    service = EmailService()
    email = await service.get_email(email_id, current_user.tenant_id)
    
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    
    return EmailResponse.from_orm(email)


@router.post("/{email_id}/track-open")
async def track_email_open(
    email_id: str,
    current_user: User = Depends(get_current_user)
):
    """Track email open (for tracking pixels)"""
    service = EmailService()
    success = await service.track_open(email_id, current_user.tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Email not found")
    
    return {"message": "Open tracked"}
