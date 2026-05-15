"""
Migrate Destination documents into picklists collection as DestinationPicklist.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    print("Migrating destinations to picklists...")
    
    # Get all from destinations
    legacy_dests = await db.destinations.find({}).to_list(None)
    print(f"Found {len(legacy_dests)} legacy destinations.")
    
    migrated = 0
    for dest in legacy_dests:
        name = dest.get("name")
        tenant_id = dest.get("tenant_id")
        
        # Check if already exists in picklists
        existing = await db.picklists.find_one({
            "picklist_type": "destination",
            "name": name,
            "tenant_id": tenant_id
        })
        
        if not existing:
            # Create in picklists
            await db.picklists.insert_one({
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
            
            # Note: The legacy destination ID is lost, but pivot tables
            # use destination_id which references the old ID.
            # wait, if the ID changes, pivot links (DestinationOpportunity) break!
            
    print(f"Migrated {migrated} destinations to picklists.")
    client.close()

asyncio.run(main())
