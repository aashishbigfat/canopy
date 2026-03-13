import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

import os
from dotenv import load_dotenv

async def run():
    load_dotenv()
    client = AsyncIOMotorClient(os.getenv('MONGODB_URL'))
    db = client['tutterfly_crm']
    stages = await db['sales_stages'].find({}).to_list(100)
    for s in stages:
        print(f"{s.get('name')}: {s.get('probability')}")

if __name__ == "__main__":
    asyncio.run(run())
