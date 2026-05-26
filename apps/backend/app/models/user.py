from beanie import Indexed, PydanticObjectId
from pydantic import EmailStr, Field, model_validator
from typing import Optional, List, Any
from datetime import datetime
from passlib.context import CryptContext
from app.models.base import BaseDocument

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class User(BaseDocument):
    """User model matching Laravel User"""
    
    # Basic fields
    name: str
    email: Indexed(EmailStr, unique=True)
    password: str  # Hashed
    
    # Tenant & Organization
    tenant_id: Indexed(PydanticObjectId)
    department_id: Optional[PydanticObjectId] = None
    role_hierarchy_id: Optional[PydanticObjectId] = None
    
    # Profile
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    directory: Optional[str] = None
    
    # Status
    is_active: bool = True
    is_verified: bool = False
    email_verified_at: Optional[datetime] = None
    
    # Roles & Permissions (array of role IDs)
    role_ids: List[PydanticObjectId] = Field(default_factory=list)
    
    # Settings
    timezone: str = "UTC"
    language: str = "en"
    
    # SMTP settings (for email sending)
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    
    # Auto-assignment settings
    max_leads_per_day: int = 10
    max_opportunities: int = 50
    is_available_for_assignment: bool = True
    
    # Assigned countries/destinations for auto-assignment
    assigned_countries: List[str] = Field(default_factory=list)
    assigned_destinations: List[PydanticObjectId] = Field(default_factory=list)
    not_assigned_countries: List[str] = Field(default_factory=list)
    
    # Monthly targets
    monthly_revenue_target: float = 0.0
    monthly_deals_target: int = 0
    
    # Assignment tracking
    last_assigned_at: Optional[datetime] = None
    
    # Remember token
    remember_token: Optional[str] = None
    
    # Last login
    last_login_at: Optional[datetime] = None
    
    # Audit fields
    created_by: Optional[PydanticObjectId] = None
    last_modified_by_id: Optional[PydanticObjectId] = None
    
    class Settings:
        name = "users"
        # Indexes temporarily disabled to fix startup
        # indexes = [
        #     "email",
        #     "tenant_id",
        #     "is_active",
        #     "department_id",
        #     "role_hierarchy_id",
        #     [("tenant_id", 1), ("email", 1)],
        # ]
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "email": "john@example.com",
                "tenant_id": "507f1f77bcf86cd799439011"
            }
        }
    
    @model_validator(mode="before")
    @classmethod
    def empty_strings_to_none(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Convert empty strings to None for ObjectId fields
            for field in ["department_id", "role_hierarchy_id", "created_by", "last_modified_by_id"]:
                if field in data and data[field] == "":
                    data[field] = None
        return data
    
    def verify_password(self, plain_password: str) -> bool:
        """Verify password against hash"""
        return pwd_context.verify(plain_password, self.password)
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password"""
        return pwd_context.hash(password)
    
    async def _load_active_roles(self) -> "List[Any]":
        """Load this user's roles in a single tenant-scoped query.

        SECURITY: roles MUST be filtered by this user's tenant_id. A role_id
        from another tenant (whether by data corruption or attack) must not
        grant any permission here — this is the gate that `check_permission`
        relies on for every authenticated API call. Previously each role was
        loaded via the unscoped `Role.get(role_id)`, which made cross-tenant
        permission inheritance possible. Cutting the per-id queries to one
        bulk lookup is also an N+1 fix.
        """
        from app.models.role import Role

        if not self.role_ids:
            return []
        return await Role.find(
            {
                "_id": {"$in": list(self.role_ids)},
                "tenant_id": self.tenant_id,
                "deleted_at": None,
            }
        ).to_list()

    async def has_permission(self, permission: str) -> bool:
        """Check if user has a specific permission (tenant-scoped).

        Admin roles (is_admin=True) automatically receive unlock_opportunity —
        kept in sync with get_permissions().
        """
        roles = await self._load_active_roles()
        for r in roles:
            if permission in (r.permissions or []):
                return True
            if permission == "unlock_opportunity" and getattr(r, "is_admin", False):
                return True
        return False

    async def has_any_permission(self, permissions: List[str]) -> bool:
        """Check if user has any of the specified permissions (tenant-scoped)."""
        if not permissions:
            return False
        wanted = set(permissions)
        roles = await self._load_active_roles()
        for r in roles:
            if wanted.intersection(r.permissions or []):
                return True
            if "unlock_opportunity" in wanted and getattr(r, "is_admin", False):
                return True
        return False

    async def get_permissions(self) -> List[str]:
        """Get all permissions across all assigned roles (tenant-scoped, deduped).

        Admin roles (is_admin=True) automatically receive the unlock_opportunity
        permission so super admins can unlock locked opportunities.
        """
        roles = await self._load_active_roles()
        perms: set[str] = set()
        for r in roles:
            perms.update(r.permissions or [])
            if getattr(r, "is_admin", False):
                perms.add("unlock_opportunity")
        return list(perms)

    async def is_super_admin(self) -> bool:
        """Return True if the user holds at least one admin role."""
        roles = await self._load_active_roles()
        return any(getattr(r, "is_admin", False) for r in roles)

    async def update_last_login(self):
        """Update last login timestamp."""
        from datetime import timezone as _tz
        self.last_login_at = datetime.now(_tz.utc)
        await self.save()
