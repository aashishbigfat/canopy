from beanie import Indexed, PydanticObjectId
from pydantic import EmailStr, Field
from typing import Optional, List, Dict, Literal
from datetime import datetime
from app.models.base import BaseDocument
from app.constants.industry_registry import (
    SUPPORTED_INDUSTRIES,
    INDUSTRY_MODULE_DEFAULTS,
    get_default_modules as _registry_get_default_modules,
)

# Valid industry identifiers — kept in sync with frontend IndustryType.
# Sourced from industry_registry to keep one source of truth.
VALID_INDUSTRIES = tuple(SUPPORTED_INDUSTRIES)

# Re-exported for backward-compatibility; new code should import from
# app.constants.industry_registry directly.
DEFAULT_MODULES_BY_INDUSTRY: Dict[str, Dict[str, bool]] = INDUSTRY_MODULE_DEFAULTS

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
    industry: Literal["travel", "healthcare", "education", "manufacturing"] = "travel"
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

    @classmethod
    def get_default_modules(cls, industry: str) -> Dict[str, bool]:
        """Return the default module flags for a given industry.

        Delegates to industry_registry.get_default_modules so tenant.py and
        the registry can never drift out of sync.
        """
        return _registry_get_default_modules(industry)

    async def insert(self, *args, **kwargs):
        """Override insert to automatically seed default modules based on industry."""
        if not self.modules:
            self.modules = self.get_default_modules(self.industry)
        return await super().insert(*args, **kwargs)


