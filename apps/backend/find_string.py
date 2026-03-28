import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def run():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    collections = await db.list_collection_names()
    print(f"Collections found: {collections}")
    
    for coll_name in collections:
        count = await db[coll_name].count_documents({"name": "Accommodation"})
        if count > 0:
            doc = await db[coll_name].find_one({"name": "Accommodation"})
            print(f"FOUND IN [{coll_name}]: {doc}")
        
        # Also check if it's in a list if 'name' is not the field
        # But usually 'name' is the field for picklists.

if __name__ == "__main__":
    asyncio.run(run())
