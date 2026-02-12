from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Set
from dotenv import load_dotenv

# Load .env file explicitly
load_dotenv()

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
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
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
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
        "jpg", "jpeg", "png", "gif", "zip", "csv"
    }
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:4200,http://localhost:3000,https://tutterfly-frontend.vercel.app"
    
    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

settings = Settings()
