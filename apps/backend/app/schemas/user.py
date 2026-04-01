"""
Pydantic schemas for User API
"""
from pydantic import BaseModel, EmailStr, Field, validator, BeforeValidator
from typing import Optional, List, Annotated
from datetime import datetime
from app.core.validators import validate_password_complexity, PHONE_REGEX, PHONE_REGEX_MESSAGE
import re

def parse_phone_number(v: str) -> Optional[str]:
    if not v:
        return None
    # If it is fetched from DB but fails the strict regex, we return None to avoid 500 error
    if not re.match(PHONE_REGEX, v):
        return None
    return v


class UserBase(BaseModel):
    """Base schema for User"""
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: Annotated[Optional[str], BeforeValidator(parse_phone_number)] = Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)
    department_id: Optional[str] = None
    role_hierarchy_id: Optional[str] = None
    
    # Profile
    avatar_url: Optional[str] = None
    directory: Optional[str] = None
    
    # Settings
    timezone: str = "UTC"
    language: str = "en"
    
    # Status
    is_active: bool = True
    
    # Auto-assignment
    max_leads_per_day: int = 10
    max_opportunities: int = 50
    is_available_for_assignment: bool = True
    
    # Assigned territories
    assigned_countries: List[str] = Field(default_factory=list)
    assigned_destinations: List[str] = Field(default_factory=list)
    not_assigned_countries: List[str] = Field(default_factory=list)
    
    # Targets
    monthly_revenue_target: float = 0.0
    monthly_deals_target: int = 0


class UserCreate(UserBase):
    """Schema for creating user"""
    password: str = Field(..., min_length=8)
    role_ids: List[str] = Field(default_factory=list)
    
    @validator('password')
    def validate_complexity(cls, v):
        return validate_password_complexity(v)
    
    # SMTP settings (optional)
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None


class UserUpdate(BaseModel):
    """Schema for updating user"""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Annotated[Optional[str], BeforeValidator(parse_phone_number)] = Field(None, pattern=PHONE_REGEX, description=PHONE_REGEX_MESSAGE)
    department_id: Optional[str] = None
    role_hierarchy_id: Optional[str] = None
    
    avatar_url: Optional[str] = None
    directory: Optional[str] = None
    
    timezone: Optional[str] = None
    language: Optional[str] = None
    
    is_active: Optional[bool] = None
    
    max_leads_per_day: Optional[int] = None
    max_opportunities: Optional[int] = None
    is_available_for_assignment: Optional[bool] = None
    
    assigned_countries: Optional[List[str]] = None
    assigned_destinations: Optional[List[str]] = None
    not_assigned_countries: Optional[List[str]] = None
    
    monthly_revenue_target: Optional[float] = None
    monthly_deals_target: Optional[int] = None
    
    # SMTP settings
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None


class UserPasswordUpdate(BaseModel):
    """Schema for updating user password"""
    current_password: str
    new_password: str = Field(..., min_length=8)

    @validator('new_password')
    def validate_complexity(cls, v):
        return validate_password_complexity(v)


class UserResponse(UserBase):
    """Schema for user response"""
    id: str
    tenant_id: str
    role_ids: List[str]
    
    is_verified: bool
    email_verified_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, obj):
        """Convert ObjectId fields to strings for API response"""
        if hasattr(obj, 'id'):
            data = obj.model_dump()
            # Convert ObjectId fields to strings
            data['id'] = str(obj.id)
            if hasattr(obj, 'tenant_id') and obj.tenant_id:
                data['tenant_id'] = str(obj.tenant_id)
            # Convert department_id to string
            if hasattr(obj, 'department_id') and obj.department_id:
                data['department_id'] = str(obj.department_id)
            # Convert role_hierarchy_id to string
            if hasattr(obj, 'role_hierarchy_id') and obj.role_hierarchy_id:
                data['role_hierarchy_id'] = str(obj.role_hierarchy_id)
            # Convert role_ids to strings
            if hasattr(obj, 'role_ids') and obj.role_ids:
                data['role_ids'] = [str(role_id) for role_id in obj.role_ids]
            # Convert assigned_destinations to strings
            if hasattr(obj, 'assigned_destinations') and obj.assigned_destinations:
                data['assigned_destinations'] = [str(dest_id) for dest_id in obj.assigned_destinations]
            # Convert audit fields to strings
            if hasattr(obj, 'created_by') and obj.created_by:
                data['created_by'] = str(obj.created_by)
            if hasattr(obj, 'last_modified_by_id') and obj.last_modified_by_id:
                data['last_modified_by_id'] = str(obj.last_modified_by_id)
            
            return cls(**data)
        return cls()


class UserDetailResponse(UserResponse):
    """Schema for detailed user response with relationships"""
    # Will be populated by service
    roles: List[dict] = Field(default_factory=list)
    department: Optional[dict] = None
    hierarchy: Optional[dict] = None


class UserListResponse(BaseModel):
    """Schema for list of users"""
    users: List[UserResponse]
    total: int


class UserStatusUpdate(BaseModel):
    """Schema for updating user status"""
    is_active: bool


class UserRoleAssignment(BaseModel):
    """Schema for assigning roles to user"""
    role_ids: List[str]


class UserTerritoryUpdate(BaseModel):
    """Schema for updating user territories"""
    assigned_countries: List[str] = Field(default_factory=list)
    assigned_destinations: List[str] = Field(default_factory=list)
    not_assigned_countries: List[str] = Field(default_factory=list)


class UserTargetUpdate(BaseModel):
    """Schema for updating user targets"""
    monthly_revenue_target: float
    monthly_deals_target: int


class UserPerformanceResponse(BaseModel):
    """Schema for user performance metrics"""
    user_id: str
    user_name: str
    
    # Current month
    current_month_revenue: float = 0.0
    current_month_deals: int = 0
    current_month_target_revenue: float = 0.0
    current_month_target_deals: int = 0
    
    # Achievement percentages
    revenue_achievement: float = 0.0
    deals_achievement: float = 0.0
    
    # Overall stats
    total_opportunities: int = 0
    won_opportunities: int = 0
    lost_opportunities: int = 0
    pipeline_value: float = 0.0
    
    # Activity
    tasks_completed: int = 0
    events_attended: int = 0
    emails_sent: int = 0
