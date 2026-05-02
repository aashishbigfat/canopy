from beanie import Indexed, PydanticObjectId
from pydantic import EmailStr, Field
from typing import Optional, List, Dict
from datetime import datetime
from app.models.base import BaseDocument

class Tenant(BaseDocument):
    """Tenant model for multi-tenancy"""
    
    # Company information
    company_name: Indexed(str)
    subdomain: Indexed(str, unique=True)
    
    # Contact information
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    
    # Address
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    zip_code: Optional[str] = None
    
    # Settings
    logo_url: Optional[str] = None
    timezone: str = "UTC"
    currency: str = "USD"
    
    # Subscription
    plan: str = "free"  # free, basic, premium
    is_active: bool = True
    trial_ends_at: Optional[datetime] = None
    
    # Limits
    max_users: int = 5
    max_storage_gb: int = 10
    
    # Industry Configuration (Multi-Industry CRM)
    industry: str = "travel"  # travel | healthcare | education | manufacturing
    modules: Dict[str, bool] = Field(default_factory=dict)
    
    class Settings:
        name = "tenants"
                # Indexes temporarily disabled
        # indexes = [
        # "company_name",
        # "subdomain",
        # "is_active"
        # ]
    
    class Config:
        json_schema_extra = {
            "example": {
                "company_name": "Acme Travel",
                "subdomain": "acme",
                "email": "admin@acme.com"
            }
        }
