import asyncio
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def f():
    c = AsyncIOMotorClient(settings.MONGODB_URL)
    db = c[settings.MONGODB_DB_NAME]

    visits = await db["bd_visits"].find({"deleted_at": None}).to_list(20)
    owners = set(str(v["owner_id"]) for v in visits)
    print(f"Visit owner IDs: {owners}")
    for uid in owners:
        u = await db["users"].find_one({"_id": ObjectId(uid)})
        if u:
            print(f"  Owner: {u.get('email')} ({u.get('name')})")

    print()
    print("All active users and their role admin status:")
    async for u in db["users"].find({"is_active": True, "deleted_at": None}):
        role_ids = u.get("role_ids", [])
        is_admin = False
        if role_ids:
            admin_role = await db["roles"].find_one({
                "_id": {"$in": role_ids},
                "tenant_id": u.get("tenant_id"),
                "is_admin": True,
            })
            is_admin = admin_role is not None
        print(f"  {u['_id']} | {u.get('email')} | admin={is_admin}")

    c.close()

asyncio.run(f())
