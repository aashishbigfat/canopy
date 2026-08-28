"""
Authentication schemas for login, registration, and password management
"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from app.core.validators import validate_password_complexity

class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str
    industry: Optional[str] = None
    remember_me: bool = False


class UserRegister(BaseModel):
    """Schema for user registration"""
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    confirm_password: str
    tenant_id: Optional[str] = None
    
    @validator('password')
    def validate_complexity(cls, v):
        return validate_password_complexity(v)
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v


class PasswordChange(BaseModel):
    """Schema for changing password"""
    current_password: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str
    
    @validator('new_password')
    def validate_complexity(cls, v):
        return validate_password_complexity(v)
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v


class PasswordReset(BaseModel):
    """Schema for password reset request"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Schema for confirming password reset"""
    token: str
    new_password: str = Field(..., min_length=8)

    @validator('new_password')
    def validate_complexity(cls, v):
        return validate_password_complexity(v)


class TokenResponse(BaseModel):
    """Schema for token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


class RefreshToken(BaseModel):
    """Schema for token refresh"""
    refresh_token: str
