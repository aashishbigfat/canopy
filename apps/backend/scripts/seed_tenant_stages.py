"""
One-time migration script: seed tenant-scoped sales stages for all existing tenants.

Run from the backend directory:
  python scripts/seed_tenant_stages.py

This script:
1. Finds all tenants in the database
2. For each tenant, checks if they already have tenant-scoped sales stages
3. If not, seeds the industry-appropriate stages under that tenant's ID
"""
import asyncio
import sys
import os

# Add parent directory to path so we can import the app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from bson import ObjectId


async def main():
    # Load env vars
    from dotenv import load_dotenv
    load_dotenv()

    mongo_url = os.getenv("MONGODB_URL") or os.getenv("MONGO_URL") or "mongodb://localhost:27017"
    db_name = os.getenv("MONGODB_DB_NAME") or os.getenv("DB_NAME") or "tutterfly"

    print(f"Connecting to MongoDB: {mongo_url} / {db_name}")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    # Import all document models needed by beanie
    from app.models.tenant import Tenant
    from app.models.opportunity_picklists import SalesStage
    from app.models.consolidated_picklists import (
        AccountType, Industry, Rating, AccountSource, SupplierServicePicklist,
        LeadStatus, Source, SourceMedium, OpportunityType, Experience, OpportunityTag,
    )
    from app.models.opportunity import Opportunity
    from app.models.user import User

    await init_beanie(
        database=db,
        document_models=[
            Tenant, User, Opportunity, SalesStage,
            AccountType, Industry, Rating, AccountSource, SupplierServicePicklist,
            LeadStatus, Source, SourceMedium, OpportunityType, Experience, OpportunityTag,
        ]
    )

    from app.services.opportunity_service import OpportunityService
    service = OpportunityService()

    tenants = await Tenant.find_all().to_list()
    print(f"Found {len(tenants)} tenants")

    for tenant in tenants:
        industry = getattr(tenant, "industry", "travel") or "travel"
        
        # Check if this tenant already has tenant-scoped stages
        existing_count = await SalesStage.find(
            {"tenant_id": tenant.id, "is_active": True}
        ).count()
        
        if existing_count > 0:
            print(f"  [SKIP] Tenant '{tenant.company_name}' ({industry}) — already has {existing_count} stages")
            continue
        
        print(f"  [SEED] Tenant '{tenant.company_name}' ({industry}) — seeding {industry} stages...")
        await service.seed_standard_stages(tenant.id, industry)
        
        # Verify
        seeded_count = await SalesStage.find(
            {"tenant_id": tenant.id, "is_active": True}
        ).count()
        print(f"         Done: {seeded_count} stages created")

    print("\nMigration complete!")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
