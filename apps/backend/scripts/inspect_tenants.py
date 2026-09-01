"""
READ-ONLY tenant inventory. Makes NO changes.

Lists every tenant with key fields and a count of users + core domain
records, so we can safely decide what to rename / delete.

Run from apps/backend:  python scripts/inspect_tenants.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

CORE_COLLECTIONS = [
    "users", "accounts", "contacts", "leads", "opportunities",
    "tasks", "suppliers", "itineraries", "departures",
]


async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]

    tenants = await db.tenants.find({}).to_list(None)
    print(f"DB: {settings.MONGODB_DB_NAME}  |  total tenants: {len(tenants)}\n")

    for t in tenants:
        tid = t.get("_id")
        print("=" * 70)
        print(f"  _id          : {tid}")
        print(f"  company_name : {t.get('company_name')!r}")
        print(f"  subdomain    : {t.get('subdomain')!r}")
        print(f"  industry     : {t.get('industry')!r}")
        print(f"  is_active    : {t.get('is_active')}")
        print(f"  created_at   : {t.get('created_at')}")
        print(f"  deleted_at   : {t.get('deleted_at')}")
        # Per-tenant record counts (helps gauge deletion impact)
        for coll in CORE_COLLECTIONS:
            try:
                n = await db[coll].count_documents({"tenant_id": tid})
            except Exception as e:
                n = f"err: {e}"
            if n:
                print(f"     {coll:<14}: {n}")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
