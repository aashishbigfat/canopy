import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from bson import ObjectId

async def run():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    # 1. List all tenants
    print("=== TENANTS ===")
    tenants = await db.tenants.find().to_list(100)
    tenant_map = {}
    for t in tenants:
        tid = str(t['_id'])
        name = t.get('company_name', 'Unknown')
        tenant_map[tid] = name
        print(f"ID: {tid} | Name: {name}")

    # 2. List all users and their tenants
    print("\n=== USERS ===")
    users = await db.users.find().to_list(100)
    for u in users:
        print(f"Name: {u.get('name')} | Tenant ID: {u.get('tenant_id')}")

    # 3. Check account_types for EACH tenant
    print("\n=== ACCOUNT TYPES BY TENANT ===")
    for tid, name in tenant_map.items():
        count = await db.account_types.count_documents({"tenant_id": ObjectId(tid)})
        print(f"Tenant: {name} ({tid}) | Count: {count}")
        if count > 0:
            async for doc in db.account_types.find({"tenant_id": ObjectId(tid)}).limit(5):
                print(f"  - {doc.get('name')}")

    # 4. Check if some account_types are missing tenant_id
    null_count = await db.account_types.count_documents({"tenant_id": None})
    print(f"\nAccount types with NO tenant_id: {null_count}")
    if null_count > 0:
        async for doc in db.account_types.find({"tenant_id": None}).limit(5):
            print(f"  - {doc.get('name')}")

if __name__ == "__main__":
    asyncio.run(run())
