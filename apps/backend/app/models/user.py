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
    
    async def has_permission(self, permission: str) -> bool:
        """Check if user has a specific permission"""
        # Import here to avoid circular dependency
        from app.models.role import Role
        
        for role_id in self.role_ids:
            role = await Role.get(role_id)
            if role and permission in role.permissions:
                return True
        return False
    
    async def has_any_permission(self, permissions: List[str]) -> bool:
        """Check if user has any of the specified permissions"""
        for permission in permissions:
            if await self.has_permission(permission):
                return True
        return False
        
    async def get_permissions(self) -> List[str]:
        """Get all permissions across all assigned roles"""
        from app.models.role import Role
        
        perms = set()
        for role_id in self.role_ids:
            role = await Role.get(role_id)
            if role:
                perms.update(role.permissions)
        return list(perms)
    
    async def update_last_login(self):
        """Update last login timestamp"""
        self.last_login_at = datetime.utcnow()
        await self.save()
