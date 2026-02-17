"""
Seed lead statuses and industries into the database
"""
import asyncio
import sys
import os

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.models.lead_picklists import LeadStatus
from app.models.picklists import Industry
from app.models.user import User


async def seed_lead_picklists():
    """Seed lead statuses and industries into the database"""
    
    print("📝 Starting Lead Picklists Seeding Process")
    print("=" * 50)
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    
    # Initialize Beanie
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[LeadStatus, Industry, User]
    )
    
    print("✅ Connected to MongoDB")
    
    # Get a tenant_id (first user's ID or a dummy)
    user = await User.find_one()
    if not user:
        print("❌ No user found. Cannot seed tenant-based picklists (Industry).")
        # For LeadStatus it's fine as it doesn't have tenant_id
        tenant_id = None
    else:
        tenant_id = user.id
        print(f"👤 Using tenant_id from user: {user.email}")

    # Seed Lead Statuses
    print("\n📝 Seeding Lead Statuses...")
    lead_statuses = [
        {"name": "Contacted", "color": "#3B82F6", "sorting": 1},
        {"name": "Open", "color": "#10B981", "sorting": 2, "is_default": True},
        {"name": "Qualified", "color": "#8B5CF6", "sorting": 3},
        {"name": "Unqualified", "color": "#EF4444", "sorting": 4},
    ]
    
    for status_data in lead_statuses:
        existing = await LeadStatus.find_one(LeadStatus.name == status_data["name"])
        if not existing:
            status = LeadStatus(**status_data)
            await status.insert()
            print(f"   ✅ Created Status: {status.name}")
        else:
            print(f"   ℹ️ Status already exists: {status_data['name']}")

    # Seed Industries
    if tenant_id:
        print("\n📝 Seeding Industries...")
        industries = [
            "Hospitality", "Travel Agency", "Tour Operator", "Corporate", 
            "Education", "Finance", "Healthcare", "Technology", "Others"
        ]
        
        for name in industries:
            existing = await Industry.find_one(Industry.name == name, Industry.tenant_id == tenant_id)
            if not existing:
                industry = Industry(name=name, tenant_id=tenant_id)
                await industry.insert()
                print(f"   ✅ Created Industry: {name}")
            else:
                print(f"   ℹ️ Industry already exists: {name}")
    
    # Close connection
    client.close()
    
    print("\n🎉 Lead Picklists Seeding Complete!")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(seed_lead_picklists())
