import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from bson import ObjectId

async def main():
    from dotenv import load_dotenv
    load_dotenv()
    
    mongo_url = os.environ.get('MONGODB_URL') or os.environ.get('MONGO_URL') or 'mongodb://localhost:27017'
    db_name = os.environ.get('MONGODB_DB_NAME') or os.environ.get('DB_NAME') or 'tutterfly'
    
    print(f"Connecting to DB: {db_name}")
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
        print(f"  [FORCE SEED] Tenant '{tenant.company_name}' ({industry}) — seeding/normalizing {industry} stages...")
        await service.seed_standard_stages(tenant.id, industry)
        
        # Verify
        active_count = await SalesStage.find(
            {"tenant_id": tenant.id, "is_active": True}
        ).count()
        print(f"         Done: Now has {active_count} active stages")

    print("\nNormalization complete!")
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
