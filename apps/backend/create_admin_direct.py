"""
Simple script to test MongoDB connection and create admin user
Bypasses Beanie's index creation
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def main():
    # Connect directly with motor
    client = AsyncIOMotorClient(os.getenv("MONGODB_URL"))
    db = client[os.getenv("MONGODB_DB_NAME")]
    
    print("✅ Connected to MongoDB")
    
    # Check if admin exists
    users_collection = db["users"]
    existing = await users_collection.find_one({"email": "admin@tutterfly.com"})
    
    if existing:
        print(f"✅ Admin user already exists: {existing['email']}")
        return
    
    # Create tenant first
    tenants_collection = db["tenants"]
    tenant = await tenants_collection.find_one({"subdomain": "admin"})
    
    if not tenant:
        tenant_doc = {
            "company_name": "Tutterfly HQ",
            "subdomain": "admin",
            "email": "admin@tutterfly.com",
            "is_active": True,
            "plan": "premium",
            "max_users": 100,
            "max_storage_gb": 1000,
            "timezone": "UTC",
            "currency": "USD",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = await tenants_collection.insert_one(tenant_doc)
        tenant_id = result.inserted_id
        print(f"✅ Created tenant: {tenant_id}")
    else:
        tenant_id = tenant["_id"]
        print(f"✅ Using existing tenant: {tenant_id}")
    
    # Create admin user
    user_doc = {
        "name": "Admin User",
        "email": "admin@tutterfly.com",
        "password": pwd_context.hash("admin"),
        "tenant_id": tenant_id,
        "is_active": True,
        "is_verified": True,
        "role_ids": [],
        "timezone": "UTC",
        "language": "en",
        "max_leads_per_day": 100,
        "max_opportunities": 500,
        "is_available_for_assignment": True,
        "assigned_countries": [],
        "assigned_destinations": [],
        "not_assigned_countries": [],
        "monthly_revenue_target": 0.0,
        "monthly_deals_target": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await users_collection.insert_one(user_doc)
    print(f"✅ Created admin user!")
    print(f"   Email: admin@tutterfly.com")
    print(f"   Password: admin")
    print(f"   User ID: {result.inserted_id}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
