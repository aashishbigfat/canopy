"""
Phase 2 — Admin/Settings hub Beanie documents.

Adds:
  - CompanySettings (extension of TenantSettings for branding/bank/logo)
  - LeaderboardConfig (parameters / accolades / performance)
  - AutoAssignmentRule (global scheduler config)
  - UserAssignmentRule (per-user)
  - CountryUserAssignment (country-wise routing)
  - DepartmentMapping (department -> users/products/destinations)
  - AgentConnection (agent wiring config)
  - EmailFooter (tenant-level and per-user)
"""
from __future__ import annotations
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class CompanySettings(Document):
    """Company-level branding, bank, and logo settings (one per tenant)."""
    tenant_id: Indexed(PydanticObjectId, unique=True)

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

    # Custom blob
    extras: Dict[str, Any] = Field(default_factory=dict)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "company_settings"


class LeaderboardConfig(Document):
    """Tenant-level leaderboard parameters / accolades / performance config."""
    tenant_id: Indexed(PydanticObjectId, unique=True)

    parameters: List[Dict[str, Any]] = Field(default_factory=list)
    accolades: List[Dict[str, Any]] = Field(default_factory=list)
    performance: Dict[str, Any] = Field(default_factory=dict)

    is_enabled: bool = True
    refresh_interval_minutes: int = 15

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "leaderboard_configs"


class AutoAssignmentRule(Document):
    """Global tenant-level auto-assignment scheduler config."""
    tenant_id: Indexed(PydanticObjectId, unique=True)

    is_enabled: bool = False
    strategy: str = "round_robin"  # round_robin | weighted | country_wise | department_wise
    cron_expression: Optional[str] = None  # for scheduled batch runs
    last_run_at: Optional[datetime] = None
    last_run_status: Optional[str] = None  # success | failed | skipped

    extras: Dict[str, Any] = Field(default_factory=dict)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "auto_assignment_rules"


class UserAssignmentRule(Document):
    """Per-user auto-assignment weight / availability."""
    tenant_id: Indexed(PydanticObjectId)
    user_id: Indexed(PydanticObjectId)

    is_active: bool = True
    weight: int = 1
    daily_cap: Optional[int] = None
    industries: List[str] = Field(default_factory=list)
    sources: List[PydanticObjectId] = Field(default_factory=list)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "user_assignment_rules"


class CountryUserAssignment(Document):
    """Country-based routing rule: country -> [user_ids]."""
    tenant_id: Indexed(PydanticObjectId)
    country: Indexed(str)  # ISO code or name

    user_ids: List[PydanticObjectId] = Field(default_factory=list)
    is_active: bool = True

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "country_user_assignments"


class DepartmentMapping(Document):
    """Department -> users/products/destinations mapping for routing & quotas."""
    tenant_id: Indexed(PydanticObjectId)
    department_id: Indexed(PydanticObjectId, unique=True)

    user_ids: List[PydanticObjectId] = Field(default_factory=list)
    product_ids: List[PydanticObjectId] = Field(default_factory=list)
    destination_ids: List[PydanticObjectId] = Field(default_factory=list)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "department_mappings"


class AgentConnection(Document):
    """Agent connection / handoff config between BD ↔ Operations etc."""
    tenant_id: Indexed(PydanticObjectId, unique=True)

    bd_to_ops_user_id: Optional[PydanticObjectId] = None
    auto_handoff_on_won: bool = False
    handoff_notes: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "agent_connections"


class EmailFooter(Document):
    """
    Email footer body. `scope` discriminates:
      - 'tenant' -> applies to all users (one per tenant)
      - 'user'   -> per-user override
    """
    tenant_id: Indexed(PydanticObjectId)
    scope: Indexed(str)  # 'tenant' | 'user'
    user_id: Optional[Indexed(PydanticObjectId)] = None

    body_html: str = ""
    is_active: bool = True

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "email_footers"


class OpportunityWorkflowSettings(Document):
    """Tenant-level opportunity workflow flags (`opp_settings` in old Laravel)."""
    tenant_id: Indexed(PydanticObjectId, unique=True)

    require_lock_on_won: bool = False
    auto_lock_at_stage_id: Optional[PydanticObjectId] = None
    enforce_proba_progression: bool = False
    allow_stage_skip: bool = True
    allow_owner_change_after_lock: bool = False
    require_close_lost_reason: bool = True

    extras: Dict[str, Any] = Field(default_factory=dict)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "opportunity_workflow_settings"
