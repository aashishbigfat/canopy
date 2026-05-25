from beanie import Indexed, PydanticObjectId
from pydantic import EmailStr, Field
from typing import Optional, List, Dict, Literal
from datetime import datetime
from app.models.base import BaseDocument

# Valid industry identifiers — kept in sync with frontend IndustryType
VALID_INDUSTRIES = ("travel", "healthcare", "education", "manufacturing")

# Default modules seeded per industry so require_module() guards work out of the box
DEFAULT_MODULES_BY_INDUSTRY: Dict[str, Dict[str, bool]] = {
    "travel": {
        "destinations": True,
        "itineraries": True,
        "packages": True,
        "suppliers": True,
    },
    "healthcare": {
        "suppliers": True,
    },
    "education": {
        "suppliers": True,
    },
    "manufacturing": {
        "suppliers": True,
    },
}

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
        """Return the default module flags for a given industry."""
        return DEFAULT_MODULES_BY_INDUSTRY.get(industry, {}).copy()

    async def insert(self, *args, **kwargs):
        """Override insert to automatically seed default modules based on industry."""
        if not self.modules:
            self.modules = self.get_default_modules(self.industry)
        return await super().insert(*args, **kwargs)


