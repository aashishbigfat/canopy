"""
Authentication and authorization dependencies for FastAPI
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
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
            print("JWT Error: No 'sub' in payload")
            raise credentials_exception
    except JWTError as e:
        print(f"JWT Error: {type(e).__name__}: {str(e)}")
        print(f"Token (first 20 chars): {token[:20]}...")
        raise credentials_exception
    
    user = await User.get(ObjectId(user_id))
    if user is None or not user.is_active:
        print(f"User Error: User {user_id} not found or inactive")
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
