"""
Authentication API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm

from app.schemas.auth import (
    UserLogin, UserRegister, PasswordChange, PasswordReset,
    PasswordResetConfirm, TokenResponse, RefreshToken
)
from app.services.auth_service import AuthService
from app.models.user import User
from app.api.deps import get_current_user
from app.core.config import settings
from app.core.rate_limiter import limiter

router = APIRouter()

@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, response: Response, user_data: UserRegister):
    """Register a new user"""
    service = AuthService()
    
    try:
        user = await service.register_user(user_data)
        
        return {
            "error": False,
            "message": "User registered successfully. Please verify your email.",
            "user": {
                "id": str(user.id),
                "name": user.name,
                "email": user.email
            }
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, response: Response, login_data: UserLogin):
    """Login user and return access token"""
    service = AuthService()
    
    try:
        user, access_token, refresh_token = await service.login_user(login_data)
        
        permissions = await user.get_permissions()
        
        # Fetch tenant to include industry + modules in response
        from app.models.tenant import Tenant
        tenant = await Tenant.get(user.tenant_id)
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user={
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "tenant_id": str(user.tenant_id),
                "role_ids": [str(r) for r in user.role_ids],
                "permissions": permissions,
                "industry": tenant.industry if tenant else "travel",
                "modules": tenant.modules if tenant else {},
            }
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"}
        )


@router.post("/token")
@limiter.limit("5/minute")
async def login_for_access_token(request: Request, response: Response, form_data: OAuth2PasswordRequestForm = Depends()):
    """OAuth2 compatible token endpoint"""
    service = AuthService()
    
    login_data = UserLogin(
        email=form_data.username,
        password=form_data.password
    )
    
    try:
        user, access_token, refresh_token = await service.login_user(login_data)
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "refresh_token": refresh_token
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"}
        )


@router.post("/refresh")
@limiter.limit("10/minute")
async def refresh_token(request: Request, response: Response, token_data: RefreshToken):
    """Refresh access token"""
    service = AuthService()
    
    try:
        access_token = await service.refresh_access_token(token_data.refresh_token)
        
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    from app.models.tenant import Tenant
    tenant = await Tenant.get(current_user.tenant_id)
    
    return {
        "id": str(current_user.id),
        "name": current_user.name,
        "email": current_user.email,
        "tenant_id": str(current_user.tenant_id),
        "role_ids": [str(r) for r in current_user.role_ids],
        "permissions": await current_user.get_permissions(),
        "is_active": current_user.is_active,
        "is_verified": current_user.is_verified,
        "last_login_at": current_user.last_login_at,
        "industry": tenant.industry if tenant else "travel",
        "modules": tenant.modules if tenant else {},
    }


@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user)
):
    """Change user password"""
    service = AuthService()
    
    try:
        await service.change_password(
            current_user,
            password_data.current_password,
            password_data.new_password
        )
        
        return {
            "error": False,
            "message": "Password changed successfully"
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/password-reset")
@limiter.limit("3/minute")
async def request_password_reset(request: Request, response: Response, reset_data: PasswordReset):
    """Request password reset"""
    service = AuthService()
    
    await service.request_password_reset(reset_data.email)
    
    return {
        "error": False,
        "message": "If email exists, password reset link has been sent"
    }


@router.post("/password-reset/confirm")
@limiter.limit("3/minute")
async def confirm_password_reset(request: Request, response: Response, reset_data: PasswordResetConfirm):
    """Confirm password reset with token"""
    service = AuthService()
    
    try:
        await service.reset_password(
            reset_data.token,
            reset_data.new_password
        )
        
        return {
            "error": False,
            "message": "Password reset successfully"
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout user (client should discard token)"""
    # In a stateless JWT system, logout is handled client-side
    # Optionally, implement token blacklisting here
    
    return {
        "error": False,
        "message": "Logged out successfully"
    }
