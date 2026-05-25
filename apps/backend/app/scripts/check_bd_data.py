"""Quick check of BD data in MongoDB."""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def check():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]

    visits = await db["bd_visits"].count_documents({"deleted_at": None})
    expenses = await db["expenses"].count_documents({"deleted_at": None})
    types = await db["picklists"].count_documents({"picklist_type": "bd_activity_type"})

    print(f"BD Visits: {visits}")
    print(f"Expenses: {expenses}")
    print(f"BD Activity Types: {types}")

    v = await db["bd_visits"].find_one({"deleted_at": None})
    if v:
        print(f"\nSample visit:")
        print(f"  tenant_id: {v.get('tenant_id')}")
        print(f"  owner_id:  {v.get('owner_id')}")
        print(f"  status:    {v.get('status')}")
        print(f"  title:     {v.get('title')}")
        print(f"  scheduled: {v.get('scheduled_date')}")
    else:
        print("\nNo visits found!")

    # Check logged-in user
    u = await db["users"].find_one({"is_active": True, "deleted_at": None})
    if u:
        print(f"\nFirst active user:")
        print(f"  _id:       {u['_id']}")
        print(f"  tenant_id: {u.get('tenant_id')}")
        print(f"  email:     {u.get('email')}")
        print(f"  name:      {u.get('name')}")

        # Check if user's tenant matches visit tenant
        user_tid = u.get("tenant_id")
        matching = await db["bd_visits"].count_documents({"tenant_id": user_tid, "deleted_at": None})
        print(f"\n  Visits matching this user's tenant: {matching}")

        # Check if user's ID matches visit owner
        uid = u["_id"]
        owned = await db["bd_visits"].count_documents({"owner_id": uid, "deleted_at": None})
        print(f"  Visits owned by this user: {owned}")

    # Check user permissions (role)
    roles = await db["roles"].find({"tenant_id": u.get("tenant_id") if u else None}).to_list(10)
    for r in roles:
        perms = r.get("permissions", [])
        bd_perms = [p for p in perms if "bd" in p.lower()]
        if bd_perms:
            print(f"\n  Role '{r.get('name')}' BD perms: {bd_perms}")

    client.close()

asyncio.run(check())
