"""
Authentication service for user login, registration, and token management
"""
from typing import Optional, Tuple
from datetime import datetime, timedelta
from bson import ObjectId
from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.models.user import User
from app.models.tenant import Tenant
from app.schemas.auth import UserLogin, UserRegister

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    """Service for authentication operations"""
    
    async def register_user(
        self,
        user_data: UserRegister,
        tenant_id: Optional[ObjectId] = None
    ) -> User:
        """Register a new user"""
        
        # Check if email already exists
        existing_user = await User.find_one(User.email == user_data.email)
        if existing_user:
            raise ValueError("Email already registered")
        
        # Hash password
        hashed_password = pwd_context.hash(user_data.password)
        
        # Create user
        user = User(
            name=user_data.name,
            email=user_data.email,
            password=hashed_password,
            tenant_id=tenant_id or ObjectId(user_data.tenant_id),
            is_active=True,
            is_verified=False
        )
        
        await user.insert()
        
        # Send verification email (TODO)
        # await self._send_verification_email(user)
        
        return user
    
    async def login_user(
        self,
        login_data: UserLogin
    ) -> Tuple[User, str, str]:
        """Login user and return user, access_token, refresh_token"""
        
        # Find user by email
        user = await User.find_one(User.email == login_data.email)
        
        if not user:
            raise ValueError("Invalid email or password")
        
        # Verify password
        if not pwd_context.verify(login_data.password, user.password):
            raise ValueError("Invalid email or password")
        
        # Check if user is active
        if not user.is_active:
            raise ValueError("User account is inactive")
        
        # Generate tokens
        access_token = self._create_access_token(user)
        refresh_token = self._create_refresh_token(user)
        
        # Update last login
        await user.update_last_login()
        
        # Log login activity
        await self._log_login(user)
        
        return user, access_token, refresh_token
    
    async def change_password(
        self,
        user: User,
        current_password: str,
        new_password: str
    ) -> bool:
        """Change user password"""
        
        # Verify current password
        if not pwd_context.verify(current_password, user.password):
            raise ValueError("Current password is incorrect")
        
        # Hash new password
        user.password = pwd_context.hash(new_password)
        await user.save()
        
        return True
    
    async def request_password_reset(self, email: str) -> str:
        """Request password reset and return reset token"""
        
        user = await User.find_one(User.email == email)
        if not user:
            # Don't reveal if email exists
            return "If email exists, reset link will be sent"
        
        # Generate reset token
        reset_token = self._create_reset_token(user)
        print("\n=== RESET TOKEN ===\n", reset_token, "\n===================\n")
        
        # Send reset email
        # await self._send_reset_email(user, reset_token)
        
        return reset_token
    
    async def reset_password(
        self,
        token: str,
        new_password: str
    ) -> bool:
        """Reset password using token"""
        
        try:
            # Decode token
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = payload.get("sub")
            token_type = payload.get("type")
            
            if token_type != "reset":
                raise ValueError("Invalid token type")
            
            # Get user
            user = await User.get(ObjectId(user_id))
            if not user:
                raise ValueError("User not found")
            
            # Update password
            user.password = pwd_context.hash(new_password)
            await user.save()
            
            return True
            
        except Exception as e:
            raise ValueError(f"Invalid or expired token: {str(e)}")
    
    async def refresh_access_token(self, refresh_token: str) -> str:
        """Refresh access token using refresh token"""
        
        try:
            payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = payload.get("sub")
            token_type = payload.get("type")
            
            if token_type != "refresh":
                raise ValueError("Invalid token type")
            
            user = await User.get(ObjectId(user_id))
            if not user or not user.is_active:
                raise ValueError("User not found or inactive")
            
            # Generate new access token
            access_token = self._create_access_token(user)
            return access_token
            
        except Exception as e:
            raise ValueError(f"Invalid refresh token: {str(e)}")
    
    def _create_access_token(self, user: User) -> str:
        """Create JWT access token"""
        expires = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        payload = {
            "sub": str(user.id),
            "email": user.email,
            "tenant_id": str(user.tenant_id),
            "type": "access",
            "exp": expires
        }
        
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    def _create_refresh_token(self, user: User) -> str:
        """Create JWT refresh token"""
        expires = datetime.utcnow() + timedelta(days=30)
        
        payload = {
            "sub": str(user.id),
            "type": "refresh",
            "exp": expires
        }
        
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    def _create_reset_token(self, user: User) -> str:
        """Create password reset token"""
        expires = datetime.utcnow() + timedelta(hours=1)
        
        payload = {
            "sub": str(user.id),
            "type": "reset",
            "exp": expires
        }
        
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    async def _log_login(self, user: User):
        """Log user login activity"""
        from app.models.activity_log import LoginLog
        
        log = LoginLog(
            user_id=user.id,
            user_name=user.name,
            user_email=user.email,
            tenant_id=user.tenant_id
        )
        await log.insert()
