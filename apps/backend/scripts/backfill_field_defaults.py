"""
Backfill migration: ensure all field_registry documents have
`is_mandatory`, `system_mandatory`, and `field_key` set.

Fixes:
  - AdditionalField* docs missing `is_mandatory` -> default False
  - StandardField docs missing `is_mandatory` -> default False
  - StandardField docs missing `system_mandatory` -> default False
  - StandardField docs with `field_key: null` -> default ""
  - All docs missing `is_active` -> default True
  - All docs missing `sorting` -> default 0
  - All docs missing `options` -> default []

Safe to run multiple times (idempotent).

Usage:
    cd apps/backend
    python scripts/backfill_field_defaults.py
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient


async def main():
    from dotenv import load_dotenv
    load_dotenv()

    mongo_url = (
        os.environ.get("MONGODB_URL")
        or os.environ.get("MONGO_URL")
        or "mongodb://localhost:27017"
    )
    db_name = (
        os.environ.get("MONGODB_DB_NAME")
        or os.environ.get("DB_NAME")
        or "tutterfly_crm"
    )

    print(f"Connecting to {db_name} ...")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    # ── 1. Consolidated field_registry collection ──────────────────────
    coll = db["field_registry"]
    total = await coll.count_documents({})
    print(f"\n[field_registry] Total documents: {total}")

    # 1a. is_mandatory missing → False
    res = await coll.update_many(
        {"is_mandatory": {"$exists": False}},
        {"$set": {"is_mandatory": False}},
    )
    print(f"  is_mandatory backfilled: {res.modified_count}")

    # 1b. system_mandatory missing → False (only matters for standard fields,
    #     but harmless to set on all docs in the same collection)
    res = await coll.update_many(
        {"system_mandatory": {"$exists": False}},
        {"$set": {"system_mandatory": False}},
    )
    print(f"  system_mandatory backfilled: {res.modified_count}")

    # 1c. field_key is null → ""
    res = await coll.update_many(
        {"field_key": None},
        {"$set": {"field_key": ""}},
    )
    print(f"  field_key null->'': {res.modified_count}")

    # 1d. is_active missing → True
    res = await coll.update_many(
        {"is_active": {"$exists": False}},
        {"$set": {"is_active": True}},
    )
    print(f"  is_active backfilled: {res.modified_count}")

    # 1e. sorting missing → 0
    res = await coll.update_many(
        {"sorting": {"$exists": False}},
        {"$set": {"sorting": 0}},
    )
    print(f"  sorting backfilled: {res.modified_count}")

    # 1f. options missing → []
    res = await coll.update_many(
        {"options": {"$exists": False}},
        {"$set": {"options": []}},
    )
    print(f"  options backfilled: {res.modified_count}")

    # ── 2. Legacy per-entity additional field collections ──────────────
    legacy_additional = [
        "additional_field_leads",
        "additional_field_opportunities",
        "additional_field_suppliers",
        "additional_field_personal_accounts",
        "additional_field_tasks",
        "additional_field_accounts",
        "additional_field_contacts",
    ]

    for coll_name in legacy_additional:
        coll = db[coll_name]
        count = await coll.count_documents({})
        if count == 0:
            continue

        print(f"\n[{coll_name}] Total documents: {count}")

        res = await coll.update_many(
            {"is_mandatory": {"$exists": False}},
            {"$set": {"is_mandatory": False}},
        )
        print(f"  is_mandatory backfilled: {res.modified_count}")

        res = await coll.update_many(
            {"is_active": {"$exists": False}},
            {"$set": {"is_active": True}},
        )
        print(f"  is_active backfilled: {res.modified_count}")

        res = await coll.update_many(
            {"sorting": {"$exists": False}},
            {"$set": {"sorting": 0}},
        )
        print(f"  sorting backfilled: {res.modified_count}")

        res = await coll.update_many(
            {"options": {"$exists": False}},
            {"$set": {"options": []}},
        )
        print(f"  options backfilled: {res.modified_count}")

    # ── 3. Legacy standard_fields collection ───────────────────────────
    coll = db["standard_fields"]
    count = await coll.count_documents({})
    if count > 0:
        print(f"\n[standard_fields] Total documents: {count}")

        res = await coll.update_many(
            {"is_mandatory": {"$exists": False}},
            {"$set": {"is_mandatory": False}},
        )
        print(f"  is_mandatory backfilled: {res.modified_count}")

        res = await coll.update_many(
            {"system_mandatory": {"$exists": False}},
            {"$set": {"system_mandatory": False}},
        )
        print(f"  system_mandatory backfilled: {res.modified_count}")

        res = await coll.update_many(
            {"field_key": None},
            {"$set": {"field_key": ""}},
        )
        print(f"  field_key null->'': {res.modified_count}")

        res = await coll.update_many(
            {"is_active": {"$exists": False}},
            {"$set": {"is_active": True}},
        )
        print(f"  is_active backfilled: {res.modified_count}")

        res = await coll.update_many(
            {"sorting": {"$exists": False}},
            {"$set": {"sorting": 0}},
        )
        print(f"  sorting backfilled: {res.modified_count}")

    print("\n[OK] Backfill complete!")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
