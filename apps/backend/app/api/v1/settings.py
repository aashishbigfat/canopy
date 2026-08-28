"""
Settings API endpoints
"""
from fastapi import APIRouter, Depends

from app.models.user import User
from app.schemas.settings import (
    TenantSettingsUpdate, TenantSettingsResponse,
    UserSettingsUpdate, UserSettingsResponse
)
from app.services.settings_service import SettingsService
from app.api.deps import get_current_user, check_permission

router = APIRouter()


# Tenant Settings
@router.get("/tenant", response_model=TenantSettingsResponse)
async def get_tenant_settings(
    current_user: User = Depends(get_current_user)
):
    """Get tenant settings"""
    service = SettingsService()
    settings = await service.get_tenant_settings(str(current_user.tenant_id))
    
    # Convert ObjectId to string for response
    return TenantSettingsResponse(
        id=str(settings.id),
        tenant_id=str(settings.tenant_id),
        company_name=settings.company_name,
        logo_url=getattr(settings, 'logo_url', None),
        primary_color=getattr(settings, 'primary_color', '#000000'),
        secondary_color=getattr(settings, 'secondary_color', '#ffffff'),
        timezone=getattr(settings, 'timezone', 'UTC'),
        date_format=getattr(settings, 'date_format', 'YYYY-MM-DD'),
        currency=getattr(settings, 'currency', 'USD'),
        currency_symbol=getattr(settings, 'currency_symbol', '$'),
        language=getattr(settings, 'language', 'en'),
        email_from_name=getattr(settings, 'email_from_name', None),
        email_from_address=getattr(settings, 'email_from_address', None),
        email_signature=getattr(settings, 'email_signature', None),
        auto_assign_leads=getattr(settings, 'auto_assign_leads', False),
        lead_round_robin=getattr(settings, 'lead_round_robin', False),
        default_lead_owner_id=str(settings.default_lead_owner_id) if settings.default_lead_owner_id else None,
        quote_prefix=getattr(settings, 'quote_prefix', 'Q'),
        invoice_prefix=getattr(settings, 'invoice_prefix', 'INV'),
        quote_validity_days=getattr(settings, 'quote_validity_days', 30),
        payment_terms_days=getattr(settings, 'payment_terms_days', 30),
        default_tax_percent=getattr(settings, 'default_tax_percent', 0.0),
        notify_on_new_lead=getattr(settings, 'notify_on_new_lead', True),
        notify_on_new_opportunity=getattr(settings, 'notify_on_new_opportunity', True),
        notify_on_task_due=getattr(settings, 'notify_on_task_due', True),
        custom_settings=getattr(settings, 'custom_settings', {}),
        created_at=getattr(settings, 'created_at', None),
        updated_at=getattr(settings, 'updated_at', None)
    )


@router.put("/tenant", response_model=TenantSettingsResponse)
async def update_tenant_settings(
    data: TenantSettingsUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update tenant settings"""
    service = SettingsService()
    settings = await service.update_tenant_settings(str(current_user.tenant_id), data)
    
    # Convert ObjectId to string for response
    return TenantSettingsResponse(
        id=str(settings.id),
        tenant_id=str(settings.tenant_id),
        company_name=settings.company_name,
        logo_url=getattr(settings, 'logo_url', None),
        primary_color=getattr(settings, 'primary_color', '#000000'),
        secondary_color=getattr(settings, 'secondary_color', '#ffffff'),
        timezone=getattr(settings, 'timezone', 'UTC'),
        date_format=getattr(settings, 'date_format', 'YYYY-MM-DD'),
        currency=getattr(settings, 'currency', 'USD'),
        currency_symbol=getattr(settings, 'currency_symbol', '$'),
        language=getattr(settings, 'language', 'en'),
        email_from_name=getattr(settings, 'email_from_name', None),
        email_from_address=getattr(settings, 'email_from_address', None),
        email_signature=getattr(settings, 'email_signature', None),
        auto_assign_leads=getattr(settings, 'auto_assign_leads', False),
        lead_round_robin=getattr(settings, 'lead_round_robin', False),
        default_lead_owner_id=str(settings.default_lead_owner_id) if settings.default_lead_owner_id else None,
        quote_prefix=getattr(settings, 'quote_prefix', 'Q'),
        invoice_prefix=getattr(settings, 'invoice_prefix', 'INV'),
        quote_validity_days=getattr(settings, 'quote_validity_days', 30),
        payment_terms_days=getattr(settings, 'payment_terms_days', 30),
        default_tax_percent=getattr(settings, 'default_tax_percent', 0.0),
        notify_on_new_lead=getattr(settings, 'notify_on_new_lead', True),
        notify_on_new_opportunity=getattr(settings, 'notify_on_new_opportunity', True),
        notify_on_task_due=getattr(settings, 'notify_on_task_due', True),
        custom_settings=getattr(settings, 'custom_settings', {}),
        created_at=getattr(settings, 'created_at', None),
        updated_at=getattr(settings, 'updated_at', None)
    )


# User Settings
@router.get("/user", response_model=UserSettingsResponse)
async def get_my_settings(current_user: User = Depends(get_current_user)):
    """Get current user's settings"""
    service = SettingsService()
    settings = await service.get_user_settings(str(current_user.id), str(current_user.tenant_id))
    
    # Convert ObjectId to string for response
    return UserSettingsResponse(
        id=str(settings.id),
        user_id=str(settings.user_id),
        tenant_id=str(settings.tenant_id),
        theme=getattr(settings, 'theme', 'light'),
        language=getattr(settings, 'language', 'en'),
        timezone=getattr(settings, 'timezone', None),
        date_format=getattr(settings, 'date_format', None),
        time_format=getattr(settings, 'time_format', None),
        sidebar_collapsed=getattr(settings, 'sidebar_collapsed', False),
        email_notifications=getattr(settings, 'email_notifications', True),
        push_notifications=getattr(settings, 'push_notifications', True),
        desktop_notifications=getattr(settings, 'desktop_notifications', True),
        notify_on_assigned_lead=getattr(settings, 'notify_on_assigned_lead', True),
        notify_on_assigned_opportunity=getattr(settings, 'notify_on_assigned_opportunity', True),
        notify_on_task_reminder=getattr(settings, 'notify_on_task_reminder', True),
        notify_on_mention=getattr(settings, 'notify_on_mention', True),
        preferences=getattr(settings, 'preferences', {}),
        created_at=getattr(settings, 'created_at', None),
        updated_at=getattr(settings, 'updated_at', None)
    )


@router.put("/user", response_model=UserSettingsResponse)
async def update_my_settings(
    data: UserSettingsUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update current user's settings"""
    service = SettingsService()
    settings = await service.update_user_settings(str(current_user.id), str(current_user.tenant_id), data)
    
    # Convert ObjectId to string for response
    return UserSettingsResponse(
        id=str(settings.id),
        user_id=str(settings.user_id),
        tenant_id=str(settings.tenant_id),
        theme=getattr(settings, 'theme', 'light'),
        language=getattr(settings, 'language', 'en'),
        timezone=getattr(settings, 'timezone', None),
        date_format=getattr(settings, 'date_format', None),
        time_format=getattr(settings, 'time_format', None),
        sidebar_collapsed=getattr(settings, 'sidebar_collapsed', False),
        email_notifications=getattr(settings, 'email_notifications', True),
        push_notifications=getattr(settings, 'push_notifications', True),
        desktop_notifications=getattr(settings, 'desktop_notifications', True),
        notify_on_assigned_lead=getattr(settings, 'notify_on_assigned_lead', True),
        notify_on_assigned_opportunity=getattr(settings, 'notify_on_assigned_opportunity', True),
        notify_on_task_reminder=getattr(settings, 'notify_on_task_reminder', True),
        notify_on_mention=getattr(settings, 'notify_on_mention', True),
        preferences=getattr(settings, 'preferences', {}),
        created_at=getattr(settings, 'created_at', None),
        updated_at=getattr(settings, 'updated_at', None)
    )


@router.post("/user/reset", response_model=UserSettingsResponse)
async def reset_my_settings(current_user: User = Depends(get_current_user)):
    """Reset user settings to defaults"""
    service = SettingsService()
    settings = await service.reset_user_settings(str(current_user.id), str(current_user.tenant_id))
    
    # Convert ObjectId to string for response
    return UserSettingsResponse(
        id=str(settings.id),
        user_id=str(settings.user_id),
        tenant_id=str(settings.tenant_id),
        theme=getattr(settings, 'theme', 'light'),
        language=getattr(settings, 'language', 'en'),
        timezone=getattr(settings, 'timezone', None),
        date_format=getattr(settings, 'date_format', None),
        time_format=getattr(settings, 'time_format', None),
        sidebar_collapsed=getattr(settings, 'sidebar_collapsed', False),
        email_notifications=getattr(settings, 'email_notifications', True),
        push_notifications=getattr(settings, 'push_notifications', True),
        desktop_notifications=getattr(settings, 'desktop_notifications', True),
        notify_on_assigned_lead=getattr(settings, 'notify_on_assigned_lead', True),
        notify_on_assigned_opportunity=getattr(settings, 'notify_on_assigned_opportunity', True),
        notify_on_task_reminder=getattr(settings, 'notify_on_task_reminder', True),
        notify_on_mention=getattr(settings, 'notify_on_mention', True),
        preferences=getattr(settings, 'preferences', {}),
        created_at=getattr(settings, 'created_at', None),
        updated_at=getattr(settings, 'updated_at', None)
    )
