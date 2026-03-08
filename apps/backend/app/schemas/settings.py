"""
Pydantic schemas for Settings API
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any


class TenantSettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    timezone: Optional[str] = None
    date_format: Optional[str] = None
    currency: Optional[str] = None
    currency_symbol: Optional[str] = None
    language: Optional[str] = None
    email_from_name: Optional[str] = None
    email_from_address: Optional[str] = None
    email_signature: Optional[str] = None
    auto_assign_leads: Optional[bool] = None
    lead_round_robin: Optional[bool] = None
    default_lead_owner_id: Optional[str] = None
    quote_prefix: Optional[str] = None
    invoice_prefix: Optional[str] = None
    quote_validity_days: Optional[int] = None
    payment_terms_days: Optional[int] = None
    default_tax_percent: Optional[float] = None
    notify_on_new_lead: Optional[bool] = None
    notify_on_new_opportunity: Optional[bool] = None
    notify_on_task_due: Optional[bool] = None
    custom_settings: Optional[Dict[str, Any]] = None


class TenantSettingsResponse(BaseModel):
    id: str
    tenant_id: str
    company_name: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: str
    secondary_color: str
    timezone: str
    date_format: str
    currency: str
    currency_symbol: str
    language: str
    email_from_name: Optional[str] = None
    email_from_address: Optional[str] = None
    auto_assign_leads: bool
    lead_round_robin: bool
    quote_prefix: str
    invoice_prefix: str
    quote_validity_days: int
    payment_terms_days: int
    default_tax_percent: float
    notify_on_new_lead: bool
    notify_on_new_opportunity: bool
    notify_on_task_due: bool
    custom_settings: Dict[str, Any]
    
    class Config:
        from_attributes = True


class UserSettingsUpdate(BaseModel):
    theme: Optional[str] = None
    sidebar_collapsed: Optional[bool] = None
    dashboard_layout: Optional[str] = None
    email_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None
    desktop_notifications: Optional[bool] = None
    notify_on_assigned_lead: Optional[bool] = None
    notify_on_assigned_opportunity: Optional[bool] = None
    notify_on_task_reminder: Optional[bool] = None
    notify_on_mention: Optional[bool] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    date_format: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None


class UserSettingsResponse(BaseModel):
    id: str
    user_id: str
    theme: str
    sidebar_collapsed: bool
    email_notifications: bool
    push_notifications: bool
    desktop_notifications: bool
    notify_on_assigned_lead: bool
    notify_on_assigned_opportunity: bool
    notify_on_task_reminder: bool
    notify_on_mention: bool
    timezone: Optional[str] = None
    language: Optional[str] = None
    date_format: Optional[str] = None
    preferences: Dict[str, Any]
    
    class Config:
        from_attributes = True
