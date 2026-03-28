import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def run():
    client = AsyncIOMotorClient(
        settings.MONGODB_URL,
        ssl=True,
        tls=True,
        tlsAllowInvalidCertificates=False
    )
    db = client[settings.MONGODB_DB_NAME]
    
    print("--- ACCOUNT TYPES ---")
    async for doc in db.account_types.find({}):
        print(f"[{doc.get('tenant_id')}] {doc.get('name')}")
        
    print("\n--- INDUSTRIES ---")
    async for doc in db.industries.find({}).limit(10):
        print(f"[{doc.get('tenant_id')}] {doc.get('name')}")

if __name__ == "__main__":
    asyncio.run(run())
