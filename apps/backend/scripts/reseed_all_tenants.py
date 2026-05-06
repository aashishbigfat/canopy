"""
Reseed all existing tenants with industry-specific picklists.
Uses the updated seeder functions that correctly target the unified 'picklists' collection.
"""
import asyncio
import sys
import os

# Add parent directory to path so we can import the app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.core.config import settings
from app.models.tenant import Tenant

# Import the seeders
from app.scripts.seed_travel import seed_travel_tenant
from app.scripts.seed_healthcare import seed_healthcare_tenant
from app.scripts.seed_education import seed_education_tenant
from app.scripts.seed_manufacturing import seed_manufacturing_tenant

async def main():
    print(f"Connecting to MongoDB: {settings.MONGODB_URL} / {settings.MONGODB_DB_NAME}")

    client = AsyncIOMotorClient(settings.MONGODB_URL)
    database = client[settings.MONGODB_DB_NAME]

    await init_beanie(
        database=database,
        document_models=[Tenant]
    )

    tenants = await Tenant.find_all().to_list()
    print(f"Found {len(tenants)} tenants to re-seed")

    for tenant in tenants:
        industry = getattr(tenant, "industry", "travel") or "travel"
        print(f"\nSeeding tenant '{tenant.company_name}' ({industry}) [{tenant.id}]")
        
        try:
            if industry == "healthcare":
                await seed_healthcare_tenant(tenant.id, database)
            elif industry == "education":
                await seed_education_tenant(tenant.id, database)
            elif industry == "manufacturing":
                await seed_manufacturing_tenant(tenant.id, database)
            else:
                await seed_travel_tenant(tenant.id, database)
        except Exception as e:
            print(f"  [ERROR] Failed to seed tenant: {e}")

    print("\nReseeding complete!")
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
