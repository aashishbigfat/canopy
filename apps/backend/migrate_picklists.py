"""
Migrate picklist data from old separate collections to the consolidated 'picklists' collection.
This fixes the empty dropdown issue caused by the manager's architecture change.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from datetime import datetime

# Mapping: old_collection_name -> picklist_type discriminator
MIGRATION_MAP = {
    "lead_statuses": "lead_status",
    "sources": "source",
    "source_mediums": "source_medium",
    "sales_stages": "sales_stage",
    "experiences": "experience",
    "industries": "industry",
}

async def migrate():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    now = datetime.utcnow()
    
    total_migrated = 0
    
    for old_coll, picklist_type in MIGRATION_MAP.items():
        docs = await db[old_coll].find().to_list(None)
        if not docs:
            print(f"  [{old_coll}] No documents to migrate")
            continue
        
        migrated = 0
        skipped = 0
        for doc in docs:
            # Check if already migrated (by name + tenant_id + picklist_type)
            query = {
                "picklist_type": picklist_type,
                "name": doc.get("name"),
                "tenant_id": doc.get("tenant_id"),
            }
            existing = await db["picklists"].find_one(query)
            if existing:
                skipped += 1
                continue
            
            # Build the consolidated document
            new_doc = {
                "name": doc.get("name"),
                "picklist_type": picklist_type,
                "tenant_id": doc.get("tenant_id"),
                "sorting": doc.get("sorting", 0),
                "is_active": doc.get("is_active", True),
                "is_default": doc.get("is_default", False),
                "description": doc.get("description"),
                "created_at": doc.get("created_at", now),
                "updated_at": doc.get("updated_at", now),
                # Beanie discriminator field
                "_class_id": f"BasePicklist.{type_to_class(picklist_type)}",
            }
            
            # Type-specific fields
            if picklist_type == "lead_status":
                new_doc["color"] = doc.get("color")
            elif picklist_type == "sales_stage":
                new_doc["probability"] = doc.get("probability", 0)
                new_doc["is_won"] = doc.get("is_won", False)
                new_doc["is_lost"] = doc.get("is_lost", False)
                new_doc["color"] = doc.get("color")
            
            await db["picklists"].insert_one(new_doc)
            migrated += 1
        
        total_migrated += migrated
        print(f"  [{old_coll} -> picklists/{picklist_type}] Migrated: {migrated}, Skipped (already exists): {skipped}")
    
    # Verify
    final_count = await db["picklists"].count_documents({})
    print(f"\n[OK] Migration complete! Total picklists collection: {final_count} documents")
    
    # Show breakdown
    types = await db["picklists"].distinct("picklist_type")
    for pt in sorted(types):
        c = await db["picklists"].count_documents({"picklist_type": pt})
        print(f"   {pt}: {c}")
    
    client.close()


def type_to_class(picklist_type: str) -> str:
    """Map picklist_type to the Beanie class name for _class_id."""
    mapping = {
        "lead_status": "LeadStatus",
        "source": "Source",
        "source_medium": "SourceMedium",
        "sales_stage": "SalesStage",
        "experience": "Experience",
        "industry": "Industry",
        "account_type": "AccountType",
        "rating": "Rating",
        "account_source": "AccountSource",
        "supplier_service": "SupplierServicePicklist",
        "opportunity_type": "OpportunityType",
        "opportunity_tag": "OpportunityTag",
    }
    return mapping.get(picklist_type, picklist_type)


if __name__ == "__main__":
    print("[MIGRATE] Migrating old picklist collections -> consolidated 'picklists' collection...")
    asyncio.run(migrate())
