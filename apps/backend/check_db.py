import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    docs = await db.field_registry.find({"is_custom": False}).to_list(10)
    print("Standard fields:")
    for doc in docs:
        print(doc)
    
    # Let's also check if there are standard fields with a different discriminator
    docs2 = await db.field_registry.find({"_class_id": "StandardField"}).to_list(10)
    print("StandardField class docs:")
    for doc in docs2:
        print(doc)

if __name__ == "__main__":
    asyncio.run(main())
