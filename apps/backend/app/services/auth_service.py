"""
Authentication service for user login, registration, and token management
"""
from typing import Tuple
from datetime import datetime, timedelta, timezone
from bson import ObjectId
import jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.models.user import User
from app.schemas.auth import UserLogin, UserRegister
from app.services.email_service import EmailService

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Pre-computed bcrypt hash of a random password. Used to make login take the
# same amount of time whether or not the email exists, blocking timing-based
# user enumeration. The hash itself never matches any real password.
_DUMMY_BCRYPT_HASH = pwd_context.hash("__dummy_for_timing_attacks__")

class AuthService:
    """Service for authentication operations"""
    
    async def register_user(
        self,
        user_data: UserRegister,
        tenant_id: ObjectId,
    ) -> User:
        """Register a new user within an explicitly-supplied tenant.

        SECURITY: tenant_id is now a REQUIRED, caller-supplied parameter. The
        previous behavior allowed the endpoint to fall back to
        `ObjectId(user_data.tenant_id)` — i.e., the client's request body —
        which let any unauthenticated visitor register themselves into ANY
        existing tenant by guessing its id (queryable via the public
        `/check-tenant-activity` endpoint). The endpoint that calls this is
        now admin-gated and always passes the admin's own tenant.
        """

        # Check if email already exists — include soft-deleted users so a
        # re-registration attempt with a deleted account's email is rejected
        # explicitly (rather than silently re-using a dangling email).
        existing_user = await User.find_one({"email": user_data.email})
        if existing_user:
            raise ValueError("Email already registered")

        # Hash password
        hashed_password = pwd_context.hash(user_data.password)

        # Create user — tenant_id is forced from the caller, never from the
        # request body. is_verified is False until they confirm their email.
        user = User(
            name=user_data.name,
            email=user_data.email,
            password=hashed_password,
            tenant_id=tenant_id,
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
        """Login user and return user, access_token, refresh_token.

        SECURITY notes:
        - Active, non-deleted users only (soft-deleted accounts cannot re-auth).
        - Constant-time response: bcrypt runs even when the email is unknown,
          so an attacker cannot time the response to enumerate registered
          emails.
        - All credential-failure paths return the same error message; the
          industry mismatch case used to include the industry name, which
          allowed an attacker who knew an email to discover which industry it
          belongs to. Now it returns the same generic message.
        """

        generic_invalid = ValueError("Invalid email or password")

        # Find user by email — exclude soft-deleted accounts
        user = await User.find_one(
            {"email": login_data.email, "deleted_at": None}
        )

        # Constant-time: always run bcrypt, against the real hash if we found
        # a user, against the dummy hash otherwise.
        password_hash = user.password if user else _DUMMY_BCRYPT_HASH
        password_ok = pwd_context.verify(login_data.password, password_hash)

        if not user or not password_ok:
            raise generic_invalid

        if not user.is_active:
            # Distinct error is fine here — an attacker already cleared the
            # bcrypt gate, so we're talking to the legitimate user.
            raise ValueError("User account is inactive")

        # Verify industry access if provided. The error must NOT mention the
        # industry, otherwise an attacker who knew an email could discover
        # which vertical it belongs to by trying each industry value.
        if login_data.industry:
            from app.services.industry_service import get_tenant_industry, TenantNotFoundError
            try:
                tenant_industry = await get_tenant_industry(user.tenant_id)
            except TenantNotFoundError:
                raise generic_invalid
            if tenant_industry.lower() != login_data.industry.lower():
                raise generic_invalid

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
    
    async def request_password_reset(self, email: str) -> None:
        """Request a password reset.

        SECURITY: returns None either way, never the token. The token is only
        delivered via the user's registered email — anything else (including
        returning it to the caller) would defeat the entire flow.

        Soft-deleted accounts are ignored without any signal back to the caller.
        """
        user = await User.find_one(
            {"email": email, "deleted_at": None, "is_active": True}
        )
        if not user:
            # Silent no-op — endpoint will return the same generic message.
            return None

        reset_token = self._create_reset_token(user)
        await self._send_reset_email(user, reset_token)
        return None
    
    async def _send_reset_email(self, user: User, reset_token: str):
        """Send password reset email to user.

        SECURITY: the reset URL is derived from settings.FRONTEND_URL, which
        is loaded from environment. Previously this was hardcoded to
        http://localhost:3000 — in production the email would point users to
        the developer's laptop, breaking password reset entirely and creating
        a phishing vector if the email recipient ever clicked the localhost
        link with their CRM session open.
        """
        email_service = EmailService()

        frontend_url = (settings.FRONTEND_URL or "http://localhost:3000").rstrip("/")
        reset_url = f"{frontend_url}/reset-password?token={reset_token}"
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">Password Reset Request</h2>
                <p>Hello {user.name},</p>
                <p>You recently requested to reset your password for your Tutterfly CRM account. Click the button below to reset it:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" 
                       style="background-color: #2563eb; color: white; padding: 12px 24px; 
                              text-decoration: none; border-radius: 6px; display: inline-block;">
                        Reset Your Password
                    </a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
                    {reset_url}
                </p>
                <p><strong>This link will expire in 1 hour.</strong></p>
                <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 12px; color: #6b7280;">
                    This email was sent by Tutterfly CRM.<br>
                    If you need help, contact our support team.
                </p>
            </div>
        </body>
        </html>
        """
        
        await email_service.send_html_email(
            to_email=user.email,
            subject="Password Reset Request - Tutterfly CRM",
            html_body=html_body
        )
    
    async def reset_password(
        self,
        token: str,
        new_password: str
    ) -> bool:
        """Reset password using a reset token.

        SECURITY: all failure paths raise the SAME generic error. Previously
        the message included the underlying exception text (`str(e)`), which
        leaked internal details — JWT decoding errors, ObjectId parse errors,
        and database exceptions all reached the client verbatim.
        """
        generic_error = ValueError("Invalid or expired reset token")

        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        except Exception:
            raise generic_error

        user_id = payload.get("sub")
        token_type = payload.get("type")
        if token_type != "reset" or not user_id:
            raise generic_error

        try:
            user_oid = ObjectId(user_id)
        except Exception:
            raise generic_error

        user = await User.find_one(
            {"_id": user_oid, "deleted_at": None, "is_active": True}
        )
        if not user:
            raise generic_error

        user.password = pwd_context.hash(new_password)
        await user.save()
        return True

    async def refresh_access_token(self, refresh_token: str) -> str:
        """Refresh access token using a refresh token.

        SECURITY: same as reset_password — all failure paths return one
        generic message. Internal exception text is logged server-side but
        not returned.
        """
        generic_error = ValueError("Invalid or expired refresh token")

        try:
            payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        except Exception:
            raise generic_error

        user_id = payload.get("sub")
        token_type = payload.get("type")
        if token_type != "refresh" or not user_id:
            raise generic_error

        try:
            user_oid = ObjectId(user_id)
        except Exception:
            raise generic_error

        user = await User.find_one(
            {"_id": user_oid, "is_active": True, "deleted_at": None}
        )
        if not user:
            raise generic_error

        return self._create_access_token(user)
    
    def _create_access_token(self, user: User) -> str:
        """Create JWT access token"""
        expires = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
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
        expires = datetime.now(timezone.utc) + timedelta(days=30)
        
        payload = {
            "sub": str(user.id),
            "type": "refresh",
            "exp": expires
        }
        
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    def _create_reset_token(self, user: User) -> str:
        """Create password reset token"""
        expires = datetime.now(timezone.utc) + timedelta(hours=1)
        
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
