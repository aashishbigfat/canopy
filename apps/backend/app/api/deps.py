"""
Authentication and authorization dependencies for FastAPI
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt import InvalidTokenError as JWTError  # alias keeps downstream code unchanged
from datetime import datetime, timedelta
from typing import Optional
from bson import ObjectId

from app.core.config import settings
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    to_encode.setdefault("type", "access")
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Get current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        # Reject non-access tokens. Refresh tokens (type="refresh", 30-day TTL) and
        # reset tokens (type="reset", 1-hour TTL) must not authenticate API calls.
        # Legacy tokens issued before this check (no "type" claim) are still accepted
        # for backward compatibility; they will roll over as users re-login.
        token_type = payload.get("type")
        if token_type is not None and token_type != "access":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # JWT is signed — user_id is trusted, but we still require an active,
    # non-deleted user. No tenant scoping is possible here: this lookup IS
    # how tenant context is established for the rest of the request.
    user = await User.find_one(
        {"_id": ObjectId(user_id), "is_active": True, "deleted_at": None}
    )
    if user is None:
        raise credentials_exception

    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def check_permission(permission: str):
    """Dependency to check if user has a specific permission"""
    async def permission_checker(current_user: User = Depends(get_current_user)):
        has_perm = await current_user.has_permission(permission)
        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission} required"
            )
        return current_user
    return permission_checker


def check_any_permission(permissions: list[str]):
    """Dependency to check if user has any of the specified permissions"""
    async def permission_checker(current_user: User = Depends(get_current_user)):
        has_perm = await current_user.has_any_permission(permissions)
        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: One of {permissions} required"
            )
        return current_user
    return permission_checker
