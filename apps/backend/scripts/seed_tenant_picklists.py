"""
One-time migration script: seed tenant-scoped picklists for all existing tenants.

Run from the backend directory:
  python scripts/seed_tenant_picklists.py

This script:
1. Finds all tenants in the database
2. For each tenant, checks each picklist type (Industry, Rating, LeadStatus, etc.)
3. If the tenant has no items for a picklist, it copies the global ones (tenant_id=None)
   and assigns them to the tenant, so they can edit/delete them.
"""
import asyncio
import sys
import os
from datetime import datetime

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
    from app.models.consolidated_picklists import (
        AccountType, Industry, Rating, AccountSource, SupplierServicePicklist,
        LeadStatus, Source, SourceMedium, SalesStage, OpportunityType, Experience, OpportunityTag,
    )
    from app.models.opportunity import Opportunity
    from app.models.user import User

    # The list of picklist models to seed
    PICKLIST_MODELS = [
        AccountType, Industry, Rating, AccountSource, SupplierServicePicklist,
        LeadStatus, Source, SourceMedium, OpportunityType, Experience, OpportunityTag
    ]
    # Note: SalesStage was already seeded by seed_tenant_stages.py, so we skip it here.

    await init_beanie(
        database=db,
        document_models=[
            Tenant, User, Opportunity, SalesStage,
            *PICKLIST_MODELS
        ]
    )

    tenants = await Tenant.find_all().to_list()
    print(f"Found {len(tenants)} tenants")

    for tenant in tenants:
        industry = getattr(tenant, "industry", "travel") or "travel"
        print(f"\nProcessing Tenant '{tenant.company_name}' ({industry}) [{tenant.id}]")
        
        for Model in PICKLIST_MODELS:
            model_name = Model.__name__
            
            # Check if this tenant already has items for this picklist
            existing_count = await Model.find(
                {"tenant_id": tenant.id}
            ).count()
            
            if existing_count > 0:
                print(f"  [SKIP] {model_name} — already has {existing_count} items")
                continue
                
            # Find global defaults (tenant_id = None)
            global_items = await Model.find({"tenant_id": None}).to_list()
            
            if not global_items:
                print(f"  [WARN] {model_name} — No global defaults found to seed!")
                continue
                
            # Seed them for this tenant
            new_items = []
            for item in global_items:
                # Copy attributes but set tenant_id
                item_data = item.model_dump(exclude={"id", "created_at", "updated_at", "revision_id"})
                item_data["tenant_id"] = tenant.id
                
                new_item = Model(**item_data)
                new_items.append(new_item)
                
            if new_items:
                await Model.insert_many(new_items)
                print(f"  [SEED] {model_name} — seeded {len(new_items)} items")

    print("\nMigration complete!")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
