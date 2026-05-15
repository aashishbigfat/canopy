import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    docs = await db.field_registry.find().to_list(100)
    print(f"Total fields: {len(docs)}")
    for doc in docs:
        print(f"Name: {doc.get('name')}, Entity: {doc.get('entity_type')}, Custom: {doc.get('is_custom')}, Class: {doc.get('_class_id')}")

if __name__ == "__main__":
    asyncio.run(main())
