import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def run():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    # 1. Drop the junk collection
    if 'BaseDocument' in await db.list_collection_names():
        await db.drop_collection('BaseDocument')
        print("Dropped 'BaseDocument' collection.")
    
    # 2. Clear established picklist collections to ensure clean state
    await db.account_types.delete_many({})
    await db.supplier_services.delete_many({})
    await db.account_sources.delete_many({})
    print("Cleared account_types, supplier_services, and account_sources collections.")

if __name__ == "__main__":
    asyncio.run(run())
