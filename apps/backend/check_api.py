import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.user import User
from app.schemas.user import UserResponse
from app.core.config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    await init_beanie(
        database=db,
        document_models=[User]
    )
    
    users = await User.find().limit(2).to_list()
    for u in users:
        print(f"Original DB ID: {u.id}")
        resp = UserResponse.from_orm(u)
        print(f"Response ID: {resp.id}")
        print(f"Response Dump: {resp.model_dump()}")
        print("-" * 40)

if __name__ == "__main__":
    asyncio.run(main())
