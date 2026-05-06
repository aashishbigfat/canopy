"""
Consolidated settings models - all tenant/user settings stored in single collection
to reduce MongoDB collection count.
Uses 'settings_type' discriminator field.
"""
from __future__ import annotations
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field
from typing import Optional, List, Dict, Any, Literal
from pymongo import IndexModel, ASCENDING
from datetime import datetime


class BaseSettings(Document):
    """Base settings document - all settings stored in 'settings' collection"""
    tenant_id: Indexed(PydanticObjectId)
    
    # Discriminator field
    settings_type: str
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "settings"
        is_root = True
        indexes = [
            "settings_type",
            "tenant_id",
            # Unique 1-per-tenant settings
            IndexModel(
                [("settings_type", ASCENDING), ("tenant_id", ASCENDING)],
                unique=True,
                name="unique_tenant_settings",
                partialFilterExpression={
                    "settings_type": {
                        "$in": [
                            "company", 
                            "leaderboard", 
                            "opportunity_workflow", 
                            "auto_assignment", 
                            "agent_connection"
                        ]
                    }
                }
            ),
            # EmailFooter tenant scope unique
            IndexModel(
                [("settings_type", ASCENDING), ("tenant_id", ASCENDING), ("scope", ASCENDING)],
                unique=True,
                name="unique_tenant_email_footer",
                partialFilterExpression={"settings_type": "email_footer", "scope": "tenant"}
            ),
            # EmailFooter user scope unique
            IndexModel(
                [("settings_type", ASCENDING), ("tenant_id", ASCENDING), ("scope", ASCENDING), ("user_id", ASCENDING)],
                unique=True,
                name="unique_user_email_footer",
                partialFilterExpression={"settings_type": "email_footer", "scope": "user"}
            ),
            # Unique department mapping per department
            IndexModel(
                [("department_id", ASCENDING)],
                unique=True,
                name="unique_department_mapping",
                partialFilterExpression={"settings_type": "department_mapping"}
            ),
        ]



class TenantSettings(BaseSettings):
    """Tenant-level settings (general)"""
    settings_type: Literal["tenant"] = "tenant"
    data: Dict[str, Any] = Field(default_factory=dict)


class UserSettings(BaseSettings):
    """User-level settings"""
    settings_type: Literal["user"] = "user"
    user_id: Indexed(PydanticObjectId)
    data: Dict[str, Any] = Field(default_factory=dict)


class CompanySettings(BaseSettings):
    """Company-level branding, bank, and logo settings (one per tenant)."""
    settings_type: Literal["company"] = "company"
    tenant_id: Indexed(PydanticObjectId)

    company_name: Optional[str] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: str = "#1976d2"
    secondary_color: str = "#424242"

    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None

    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None

    # Bank details
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_swift: Optional[str] = None
    bank_holder_name: Optional[str] = None

    # Tax / Reg
    gstin: Optional[str] = None
    pan: Optional[str] = None
    cin: Optional[str] = None

    extras: Dict[str, Any] = Field(default_factory=dict)


class LeaderboardConfig(BaseSettings):
    """Tenant-level leaderboard parameters / accolades / performance config."""
    settings_type: Literal["leaderboard"] = "leaderboard"
    tenant_id: Indexed(PydanticObjectId)

    parameters: List[Dict[str, Any]] = Field(default_factory=list)
    accolades: List[Dict[str, Any]] = Field(default_factory=list)
    performance: Dict[str, Any] = Field(default_factory=dict)

    is_enabled: bool = True
    refresh_interval_minutes: int = 15


class OpportunityWorkflowSettings(BaseSettings):
    """Tenant-level opportunity workflow flags."""
    settings_type: Literal["opportunity_workflow"] = "opportunity_workflow"
    tenant_id: Indexed(PydanticObjectId)

    require_lock_on_won: bool = False
    auto_lock_at_stage_id: Optional[PydanticObjectId] = None
    enforce_proba_progression: bool = False
    allow_stage_skip: bool = True
    allow_owner_change_after_lock: bool = False
    require_close_lost_reason: bool = True

    extras: Dict[str, Any] = Field(default_factory=dict)


class EmailFooter(BaseSettings):
    """Email footer body. Discriminates between tenant and user scope via user_id."""
    settings_type: Literal["email_footer"] = "email_footer"
    scope: str = "tenant"  # 'tenant' | 'user'
    user_id: Optional[Indexed(PydanticObjectId)] = None

    body_html: str = ""
    is_active: bool = True


class AutoAssignmentRule(BaseSettings):
    """Global tenant-level auto-assignment scheduler config."""
    settings_type: Literal["auto_assignment"] = "auto_assignment"
    tenant_id: Indexed(PydanticObjectId)

    is_enabled: bool = False
    strategy: str = "round_robin"
    cron_expression: Optional[str] = None
    last_run_at: Optional[datetime] = None
    last_run_status: Optional[str] = None

    extras: Dict[str, Any] = Field(default_factory=dict)


class UserAssignmentRule(BaseSettings):
    """Per-user auto-assignment weight / availability."""
    settings_type: Literal["user_assignment"] = "user_assignment"
    user_id: Indexed(PydanticObjectId)

    is_active: bool = True
    weight: int = 1
    daily_cap: Optional[int] = None
    industries: List[str] = Field(default_factory=list)
    sources: List[PydanticObjectId] = Field(default_factory=list)


class CountryUserAssignment(BaseSettings):
    """Country-based routing rule: country -> [user_ids]."""
    settings_type: Literal["country_assignment"] = "country_assignment"
    country: Indexed(str)

    user_ids: List[PydanticObjectId] = Field(default_factory=list)
    is_active: bool = True


class DepartmentMapping(BaseSettings):
    """Department -> users/products/destinations mapping."""
    settings_type: Literal["department_mapping"] = "department_mapping"
    department_id: Indexed(PydanticObjectId)

    user_ids: List[PydanticObjectId] = Field(default_factory=list)
    product_ids: List[PydanticObjectId] = Field(default_factory=list)
    destination_ids: List[PydanticObjectId] = Field(default_factory=list)


class AgentConnection(BaseSettings):
    """Agent connection / handoff config."""
    settings_type: Literal["agent_connection"] = "agent_connection"
    tenant_id: Indexed(PydanticObjectId)

    bd_to_ops_user_id: Optional[PydanticObjectId] = None
    auto_handoff_on_won: bool = False
    handoff_notes: Optional[str] = None
