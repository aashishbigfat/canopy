"""
Script to create a new user
"""
import asyncio
import sys
sys.path.insert(0, r'd:\tutterfly\apps\backend')

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from passlib.context import CryptContext

from app.core.config import settings
from app.models.user import User
from app.models.tenant import Tenant

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_user():
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    # Initialize Beanie
    await init_beanie(database=db, document_models=[User, Tenant])
    
    # Check if user already exists
    existing_user = await User.find_one(User.email == "kartikbansal9152@gmail.com")
    if existing_user:
        print(f"User already exists: {existing_user.email}")
        return
    
    # Find or create a tenant
    tenant = await Tenant.find_one()
    if not tenant:
        # Create default tenant
        tenant = Tenant(
            company_name="Default Company",
            subdomain="default",
            email="admin@default.com"
        )
        await tenant.insert()
        print(f"Created tenant: {tenant.company_name} (ID: {tenant.id})")
    else:
        print(f"Using existing tenant: {tenant.company_name} (ID: {tenant.id})")
    
    # Hash password
    hashed_password = pwd_context.hash("kartikbansal_9152")
    
    # Create user
    user = User(
        name="Kartik Bansal",
        email="kartikbansal9152@gmail.com",
        password=hashed_password,
        tenant_id=tenant.id,
        is_active=True,
        is_verified=True
    )
    
    await user.insert()
    print(f"\nUser created successfully!")
    print(f"  Email: {user.email}")
    print(f"  Name: {user.name}")
    print(f"  Tenant: {tenant.company_name}")
    print(f"  User ID: {user.id}")

if __name__ == "__main__":
    asyncio.run(create_user())
