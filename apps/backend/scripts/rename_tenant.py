"""
Rename the single TRAVEL tenant's company_name.

  'Tutterfly HQ'  ->  'Dook Travels Pvt Ltd'

Changes ONLY company_name on that one tenant. Does NOT touch subdomain,
industry, any other tenant, or any other field. Deletes nothing.
Idempotent + guarded: only updates if the current name still matches.

Run from apps/backend:  python scripts/rename_tenant.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from app.core.config import settings

TENANT_ID = ObjectId("69695c5af4e00c00af79d149")
OLD_NAME = "Tutterfly HQ"
NEW_NAME = "Dook Travels Pvt Ltd"


async def main():
    db = AsyncIOMotorClient(settings.MONGODB_URL)[settings.MONGODB_DB_NAME]

    t = await db.tenants.find_one({"_id": TENANT_ID})
    if not t:
        print(f"ABORT: tenant {TENANT_ID} not found.")
        return
    if t.get("industry") != "travel":
        print(f"ABORT: tenant industry is {t.get('industry')!r}, expected 'travel'. No change.")
        return

    print(f"BEFORE: company_name={t.get('company_name')!r}  industry={t.get('industry')!r}  subdomain={t.get('subdomain')!r}")

    if t.get("company_name") == NEW_NAME:
        print("Already renamed. Nothing to do.")
        return
    if t.get("company_name") != OLD_NAME:
        print(f"ABORT: current name {t.get('company_name')!r} != expected {OLD_NAME!r}. Refusing to overwrite.")
        return

    res = await db.tenants.update_one(
        {"_id": TENANT_ID, "company_name": OLD_NAME},
        {"$set": {"company_name": NEW_NAME}},
    )
    after = await db.tenants.find_one({"_id": TENANT_ID})
    print(f"matched={res.matched_count} modified={res.modified_count}")
    print(f"AFTER : company_name={after.get('company_name')!r}  industry={after.get('industry')!r}  subdomain={after.get('subdomain')!r}")


if __name__ == "__main__":
    asyncio.run(main())
