"""
Settings models for tenant and user configuration
"""
from beanie import Indexed
from pydantic import Field
from typing import Optional, Dict, Any, List
from beanie import PydanticObjectId
from app.models.base import BaseDocument


class TenantSettings(BaseDocument):
    """Tenant-level settings"""
    
    tenant_id: Indexed(PydanticObjectId, unique=True)
    
    # Branding
    company_name: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: str = "#1976d2"
    secondary_color: str = "#424242"
    
    # Regional
    timezone: str = "UTC"
    date_format: str = "YYYY-MM-DD"
    currency: str = "USD"
    currency_symbol: str = "$"
    language: str = "en"
    
    # Email settings
    email_from_name: Optional[str] = None
    email_from_address: Optional[str] = None
    email_signature: Optional[str] = None
    
    # Lead/Opportunity settings
    auto_assign_leads: bool = False
    lead_round_robin: bool = False
    default_lead_owner_id: Optional[PydanticObjectId] = None
    
    # Quote/Invoice settings
    quote_prefix: str = "QT"
    invoice_prefix: str = "INV"
    quote_validity_days: int = 30
    payment_terms_days: int = 30
    default_tax_percent: float = 0.0
    
    # Financial costing settings (multi-tenant)
    default_tax_misc_supplier: Optional[str] = None  # Used as supplier name in Tax & Miscellaneous rows
    
    # Notifications
    notify_on_new_lead: bool = True
    notify_on_new_opportunity: bool = True
    notify_on_task_due: bool = True
    
    # Custom fields (JSON)
    custom_settings: Dict[str, Any] = Field(default_factory=dict)
    
    class Settings:
        name = "tenant_settings"


class UserSettings(BaseDocument):
    """User-level settings"""
    
    user_id: Indexed(PydanticObjectId, unique=True)
    tenant_id: Indexed(PydanticObjectId)
    
    # Display preferences
    theme: str = "light"  # light, dark, auto
    sidebar_collapsed: bool = False
    dashboard_layout: Optional[str] = None
    
    # Notifications
    email_notifications: bool = True
    push_notifications: bool = True
    desktop_notifications: bool = True
    
    notify_on_assigned_lead: bool = True
    notify_on_assigned_opportunity: bool = True
    notify_on_task_reminder: bool = True
    notify_on_mention: bool = True
    
    # Regional overrides
    timezone: Optional[str] = None
    language: Optional[str] = None
    date_format: Optional[str] = None
    
    # Custom preferences (JSON)
    preferences: Dict[str, Any] = Field(default_factory=dict)
    
    class Settings:
        name = "user_settings"
