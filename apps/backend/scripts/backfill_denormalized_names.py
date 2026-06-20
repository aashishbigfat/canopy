"""
Backfill denormalized owner_name / account_name (PERF Phase 7).

Populates the server-managed denormalized name fields on existing records so the
list endpoints can read them instead of joining users/accounts:
  - owner_name   on accounts, contacts, leads, opportunities
  - account_name on contacts, opportunities

SAFE / IDEMPOTENT: re-running just re-sets the same values. New records get these
on insert (model hooks); change-owner / rename keep them in sync; this script is
the one-time catch-up for pre-existing data. Run as a deploy step.

USAGE (from apps/backend):
    python scripts/backfill_denormalized_names.py
    python scripts/backfill_denormalized_names.py --dry-run
"""
import argparse
import asyncio
import os

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import UpdateMany
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGODB_URL", os.getenv("MONGO_URL", "mongodb://localhost:27017"))
DB_NAME = os.getenv("MONGODB_DB_NAME", os.getenv("MONGO_DB", "tutterfly_crm"))

OWNER_COLLECTIONS = ("accounts", "contacts", "leads", "opportunities")
ACCOUNT_NAME_COLLECTIONS = ("contacts", "opportunities")


async def _bulk_set(db, coll, tenant_id, match_field, id_to_name, set_field, dry_run):
    """One bulk_write of tenant-scoped UpdateMany ops: set <set_field> per id."""
    ops = [
        UpdateMany(
            {"tenant_id": tenant_id, match_field: _id},
            {"$set": {set_field: name}},
        )
        for _id, name in id_to_name.items()
        if name is not None
    ]
    if not ops:
        return 0
    if dry_run:
        return -len(ops)  # negative => "would run N ops"
    res = await db[coll].bulk_write(ops, ordered=False)
    return res.modified_count


async def backfill(dry_run: bool = False) -> None:
    print(f"DB: {DB_NAME}  dry_run={dry_run}\n")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    try:
        tenants = await db["tenants"].find({}, {"_id": 1}).to_list(None)
        print(f"Tenants: {len(tenants)}")
        for t in tenants:
            tid = t["_id"]
            users = await db["users"].find({"tenant_id": tid}, {"_id": 1, "name": 1}).to_list(None)
            accounts = await db["accounts"].find(
                {"tenant_id": tid, "deleted_at": None}, {"_id": 1, "name": 1}
            ).to_list(None)
            user_map = {u["_id"]: u.get("name") for u in users}
            account_map = {a["_id"]: a.get("name") for a in accounts}
            if not user_map and not account_map:
                continue

            parts = [f"  tenant {tid} (users={len(user_map)}, accounts={len(account_map)}):"]
            for coll in OWNER_COLLECTIONS:
                n = await _bulk_set(db, coll, tid, "owner_id", user_map, "owner_name", dry_run)
                parts.append(f"{coll}.owner_name={n}")
            for coll in ACCOUNT_NAME_COLLECTIONS:
                n = await _bulk_set(db, coll, tid, "account_id", account_map, "account_name", dry_run)
                parts.append(f"{coll}.account_name={n}")
            print(" ".join(parts))
    finally:
        client.close()
    print("\nDone." + (" (dry run — nothing written)" if dry_run else ""))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backfill denormalized owner_name/account_name.")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    asyncio.run(backfill(dry_run=args.dry_run))
