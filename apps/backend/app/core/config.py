from pathlib import Path
from typing import Set

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env path relative to backend root (apps/backend), not cwd
_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
_ENV_FILE = _BACKEND_ROOT / ".env"

# Load .env into os.environ (override=False: existing env vars are kept)
# Precedence: env vars (Docker/shell) > .env file > defaults in code
load_dotenv(_ENV_FILE, override=False)

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )
    # App
    APP_NAME: str = "TutterflyC CRM API"
    VERSION: str = "2.0.0"
    ENVIRONMENT: str = "development"
    
    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017/tutterfly_crm"  # Fallback, .env will override
    MONGODB_DB_NAME: str = "tutterfly_crm"
    
    # AWS S3
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = "tutterfly-files"
    S3_PDF_BUCKET: str = "tutterfly-pdfs"
    
    # JWT Authentication
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    # Access token; the frontend refreshes it silently against the 30-day
    # refresh token (see auth_service._create_refresh_token) until that expires.
    # Kept short (1h) so a leaked/stolen access token has a small validity
    # window. NextAuth's jwt callback reads the token's own exp and refreshes
    # transparently, so active users are unaffected.
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 1 hour
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Rate limiting — number of trusted reverse proxies (Nginx / ALB / CDN)
    # in front of the app. Used to pick the real client IP out of the
    # client-supplied X-Forwarded-For chain WITHOUT trusting spoofable
    # leftmost entries. Set to the actual hop count for your deployment:
    #   1 = single Nginx/ALB in front (default)
    #   0 = uvicorn exposed directly (ignore X-Forwarded-For, use socket peer)
    TRUSTED_PROXY_HOPS: int = 1
    
    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    
    # Twilio
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_NUMBER: str = ""
    
    # OpenAI
    OPENAI_API_KEY: str = ""

    # Stripe (Billing)
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    
    # File Upload
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    ALLOWED_EXTENSIONS: Set[str] = {
        "pdf", "doc", "docx", "xls", "xlsx",
        "jpg", "jpeg", "png", "gif", "webp", "bmp", "zip", "csv", "txt"
    }
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:8000,http://localhost:3000,http://15.206.79.199:3000,https://tutterfly-frontend.vercel.app"

    # Frontend URL — used by password-reset / verification emails. MUST be set
    # to the production URL in prod, otherwise reset links go to localhost.
    FRONTEND_URL: str = "http://localhost:3000"

    # Sentry (optional). If unset, Sentry SDK is not initialized.
    SENTRY_DSN: str = ""
    SENTRY_TRACES_SAMPLE_RATE: float = 0.0

    # Meta (WhatsApp / Messenger) webhook secrets — REQUIRED in prod if the
    # /messaging/chatbot/webhook endpoint is exposed publicly. Without these,
    # any anonymous POST to the webhook will be accepted.
    META_WEBHOOK_VERIFY_TOKEN: str = ""
    META_WEBHOOK_APP_SECRET: str = ""

    # Shared signing key for the PDF renderer callback. Render service signs
    # callback requests with this key; we verify on receipt. Empty in dev.
    PDF_CALLBACK_SECRET: str = ""

    # Website enquiry capture (POST /api/v1/website-leads/capture). dookwebsite
    # sends the same lead JSON it posts to the old CRM; these pin the tenant and
    # users that own those leads. Empty API key = endpoint disabled (503).
    WEBSITE_CAPTURE_API_KEY: str = ""
    WEBSITE_CAPTURE_TENANT_ID: str = ""
    WEBSITE_CAPTURE_OWNER_USER_ID: str = ""
    # Optional; defaults to the owner. Old CRM used separate owner/creator users.
    WEBSITE_CAPTURE_CREATED_BY_USER_ID: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

settings = Settings()
