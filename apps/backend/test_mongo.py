import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()
async def main():
    client = AsyncIOMotorClient(os.getenv("MONGODB_URL"))
    db = client[os.getenv("MONGODB_DB_NAME")]
    
    count = await db.picklists.count_documents({"_class_id": "BasePicklist.Industry"})
    print("BasePicklist.Industry count:", count)
    
    sample = await db.picklists.find_one({"_class_id": "BasePicklist.Industry"})
    print("sample:", sample)

asyncio.run(main())
