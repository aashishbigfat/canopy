import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from bson import ObjectId

async def run():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    tenant_id = ObjectId('69695c5af4e00c00af79d149') # Tutterfly HQ
    
    # 1. Drop the junk collection
    if 'BaseDocument' in await db.list_collection_names():
        await db.drop_collection('BaseDocument')
        print("Dropped 'BaseDocument' collection.")
    
    # 2. Clear corrupted account_types for this tenant
    await db.account_types.delete_many({"tenant_id": tenant_id})
    # 3. Clear corrupted supplier_services for this tenant (so they auto-reseed on next request)
    await db.supplier_services.delete_many({"tenant_id": tenant_id})
    
    print(f"Purged corrupted picklist data for tenant {tenant_id}.")

if __name__ == "__main__":
    asyncio.run(run())
