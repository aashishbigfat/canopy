"""
Audit: Check which picklist types in the settings have corresponding
dedicated collections/models that the forms actually use.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

PICKLIST_TYPES = [
    "industry", "account_type", "account_source", "supplier_service",
    "sales_stage", "opportunity_type", "experience", "opportunity_tag",
    "lead_status", "source", "source_medium", "salutation",
    "task_priority", "task_status", "inclusion", "supplier_type",
    "destination", "itinerary_inclusion",
]

# Collections that correspond to rich models (not just picklist names)
DEDICATED_COLLECTIONS = {
    "destination": "destinations",     # Destination model in destination.py
}

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    collections = await db.list_collection_names()
    
    print("="*70)
    print("  PICKLIST vs DEDICATED COLLECTION AUDIT")
    print("="*70)
    
    for pt in PICKLIST_TYPES:
        # Count in picklists collection
        pk_count = await db.picklists.count_documents({"picklist_type": pt})
        
        # Check if there's a dedicated collection
        dedicated_col = DEDICATED_COLLECTIONS.get(pt)
        ded_count = 0
        if dedicated_col and dedicated_col in collections:
            ded_count = await db[dedicated_col].count_documents({})
        
        mismatch = " [DUAL SOURCE!]" if dedicated_col else ""
        print(f"  {pt:25s}: picklists={pk_count:3d}  dedicated({dedicated_col or '-':15s})={ded_count:3d}{mismatch}")
    
    # Also check for any other "destination-like" dedicated collections
    print("\n  OTHER RELEVANT COLLECTIONS:")
    for col in sorted(collections):
        if any(k in col for k in ["experience", "industry", "source", "supplier_type", "inclusion"]):
            cnt = await db[col].count_documents({})
            print(f"    {col:40s}: {cnt:5d} docs")
    
    client.close()

asyncio.run(main())
