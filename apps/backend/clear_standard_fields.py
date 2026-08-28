"""One-time script: clear old standard fields so lazy seeder re-creates them with corrected definitions."""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    result = await db.field_registry.delete_many({"is_custom": False})
    print(f"Deleted {result.deleted_count} standard field docs")
    client.close()

asyncio.run(main())
