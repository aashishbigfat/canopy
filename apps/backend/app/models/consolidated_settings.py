"""
Consolidated settings models - all tenant/user settings stored in single collection
to reduce MongoDB collection count.
Uses 'settings_type' discriminator field.
"""
from beanie import Indexed, Document
from pydantic import Field
from typing import Optional, Literal, Dict, Any, List
from beanie import PydanticObjectId
from datetime import datetime

class BaseSettings(Document):
    """Base settings document - all settings stored in 'settings' collection"""
    tenant_id: Optional[Indexed(PydanticObjectId)] = None
    user_id: Optional[Indexed(PydanticObjectId)] = None
    
    # Discriminator field
    settings_type: str
    
    # Generic data storage for settings
    data: Dict[str, Any] = Field(default_factory=dict)
    
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "settings"
        indexes = [
            "settings_type",
            "tenant_id",
            "user_id",
            [("settings_type", 1), ("tenant_id", 1)],
            [("settings_type", 1), ("user_id", 1)],
        ]


class TenantSettings(BaseSettings):
    """Tenant-level settings"""
    settings_type: Literal["tenant"] = "tenant"
    
    class Settings:
        name = "settings"

class UserSettings(BaseSettings):
    """User-level settings"""
    settings_type: Literal["user"] = "user"
    
    class Settings:
        name = "settings"

class CompanySettings(BaseSettings):
    """Company settings"""
    settings_type: Literal["company"] = "company"
    
    class Settings:
        name = "settings"

class LeaderboardConfig(BaseSettings):
    """Leaderboard configuration"""
    settings_type: Literal["leaderboard"] = "leaderboard"
    
    class Settings:
        name = "settings"

class OpportunityWorkflowSettings(BaseSettings):
    """Opportunity workflow settings"""
    settings_type: Literal["opportunity_workflow"] = "opportunity_workflow"
    
    class Settings:
        name = "settings"

class EmailFooter(BaseSettings):
    """Email footer settings"""
    settings_type: Literal["email_footer"] = "email_footer"
    
    class Settings:
        name = "settings"
