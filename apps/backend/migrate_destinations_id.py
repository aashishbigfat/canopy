"""
Migrate Destination documents into picklists collection as DestinationPicklist.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    print("Migrating destinations to picklists (preserving _id)...")
    
    legacy_dests = await db.destinations.find({}).to_list(None)
    print(f"Found {len(legacy_dests)} legacy destinations.")
    
    migrated = 0
    for dest in legacy_dests:
        name = dest.get("name")
        tenant_id = dest.get("tenant_id")
        
        # Check if already exists in picklists by name/tenant
        existing = await db.picklists.find_one({
            "picklist_type": "destination",
            "name": name,
            "tenant_id": tenant_id
        })
        
        if not existing:
            # Check if there is already a doc with this _id in picklists
            existing_by_id = await db.picklists.find_one({"_id": dest["_id"]})
            if existing_by_id:
                print(f"Warning: _id {dest['_id']} already exists in picklists. Skipping {name}")
                continue
                
            # Create in picklists with EXACT SAME _id
            await db.picklists.insert_one({
                "_id": dest["_id"],
                "picklist_type": "destination",
                "name": name,
                "description": dest.get("description"),
                "is_active": dest.get("is_active", True),
                "sorting": 0,
                "tenant_id": tenant_id,
                "created_at": dest.get("created_at"),
                "updated_at": dest.get("updated_at")
            })
            migrated += 1
            print(f"Migrated: {name}")
            
    print(f"Migrated {migrated} destinations to picklists.")
    client.close()

asyncio.run(main())
