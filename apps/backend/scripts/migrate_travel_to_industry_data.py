"""
Migration Script: Move travel fields from top-level to industry_data dict.

Target DB: tutterfly_crm (from .env MONGODB_URL)
Collections: leads, opportunities

This script:
  1. COPIES top-level travel field values into the industry_data dict
  2. Does NOT delete old fields (that's a separate step after verification)

Safe to run multiple times (idempotent).

Usage:
  cd apps/backend
  python -m scripts.migrate_travel_to_industry_data
"""

import asyncio
import os
import sys
from pathlib import Path

# Add backend root to path so we can import app modules
BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from dotenv import load_dotenv
load_dotenv(BACKEND_ROOT / ".env", override=False)

from motor.motor_asyncio import AsyncIOMotorClient
import certifi


# --------------------------------------------------------------------------
# Configuration — read from .env
# --------------------------------------------------------------------------
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017/tutterfly_crm")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "tutterfly_crm")

# Safety: confirm we are targeting the correct DB
assert MONGODB_DB_NAME == "tutterfly_crm", (
    f"ABORT: Expected DB 'tutterfly_crm', got '{MONGODB_DB_NAME}'. "
    "This script must only touch the Tutterfly database."
)


# --------------------------------------------------------------------------
# Lead travel fields to migrate
# --------------------------------------------------------------------------
LEAD_TRAVEL_FIELDS = [
    "travel_date",
    "no_of_nights",
    "no_of_adults",
    "no_of_pax",
    "no_of_childs",
    "no_of_infants",
    "is_fixed",
    "destinations",
    "destination_ids",
    "experience_id",
]

# --------------------------------------------------------------------------
# Opportunity travel fields to migrate
# --------------------------------------------------------------------------
OPP_TRAVEL_FIELDS = [
    "travel_date",
    "no_of_pax",
    "no_of_nights",
    "no_of_adults",
    "no_of_childs",
    "no_of_infants",
    "destination_ids",
    "origin_ids",
    "inclusions",
    "experience_id",
    "is_fixed",
    "country_of_origin",
    "departure_id",
    "custom_departure",
]


async def migrate_collection(db, collection_name: str, fields: list[str]):
    """
    For every document in `collection_name` that has at least one non-null
    travel field at top level, copy those values into `industry_data`.

    Skips documents where industry_data already has the field populated
    (idempotent).
    """
    coll = db[collection_name]
    total = await coll.count_documents({})
    print(f"\n{'='*60}")
    print(f"Collection: {collection_name}  (total docs: {total})")
    print(f"{'='*60}")

    # Find docs that have ANY of the travel fields set (not null)
    or_conditions = [{f: {"$exists": True, "$ne": None}} for f in fields]
    cursor = coll.find({"$or": or_conditions})

    migrated = 0
    skipped = 0
    errors = 0

    async for doc in cursor:
        doc_id = doc["_id"]
        existing_industry_data = doc.get("industry_data") or {}

        # Build the $set payload — only copy fields that have a value
        # and are NOT already in industry_data
        set_payload = {}
        for field in fields:
            top_level_value = doc.get(field)
            if top_level_value is None:
                continue
            # Skip empty lists/strings
            if isinstance(top_level_value, (list, str)) and len(top_level_value) == 0:
                continue
            # Don't overwrite if industry_data already has this field
            if field in existing_industry_data and existing_industry_data[field] is not None:
                continue
            set_payload[f"industry_data.{field}"] = top_level_value

        if not set_payload:
            skipped += 1
            continue

        try:
            await coll.update_one(
                {"_id": doc_id},
                {"$set": set_payload}
            )
            migrated += 1
        except Exception as e:
            print(f"  ERROR on doc {doc_id}: {e}")
            errors += 1

    print(f"  Migrated: {migrated}")
    print(f"  Skipped (already migrated or no data): {skipped}")
    print(f"  Errors: {errors}")
    return migrated, skipped, errors


async def verify_migration(db, collection_name: str, fields: list[str]):
    """
    Verify that industry_data was populated correctly by sampling
    a few documents and comparing top-level vs industry_data values.
    """
    coll = db[collection_name]
    print(f"\n--- Verification: {collection_name} ---")

    # Sample up to 5 docs that have travel_date
    sample = await coll.find(
        {"travel_date": {"$exists": True, "$ne": None}}
    ).limit(5).to_list(length=5)

    if not sample:
        print("  No documents with travel_date found (may be already cleaned).")
        return True

    all_ok = True
    for doc in sample:
        doc_id = doc["_id"]
        ind = doc.get("industry_data", {})
        for field in fields:
            top_val = doc.get(field)
            ind_val = ind.get(field)
            # Skip empty lists/strings/False — they are default values, not real data
            if top_val is None:
                continue
            if isinstance(top_val, (list, str)) and len(top_val) == 0:
                continue
            if top_val is False:
                continue
            if ind_val is None:
                print(f"  MISMATCH: doc {doc_id}, field '{field}': "
                      f"top-level={top_val}, industry_data={ind_val}")
                all_ok = False

    if all_ok:
        print(f"  [OK] All sampled documents look correct.")
    else:
        print(f"  [FAIL] Some mismatches found -- investigate before proceeding.")
    return all_ok


async def main():
    print("=" * 60)
    print("Tutterfly CRM -- Travel Field Migration")
    print(f"Database: {MONGODB_DB_NAME}")
    print("=" * 60)

    # Connect
    client = AsyncIOMotorClient(
        MONGODB_URL,
        ssl=True,
        tls=True,
        tlsCAFile=certifi.where(),
        tlsAllowInvalidCertificates=False,
    )
    db = client[MONGODB_DB_NAME]

    # Verify connection
    try:
        await client.admin.command("ismaster")
        print("[OK] Connected to MongoDB Atlas")
    except Exception as e:
        print(f"[FAIL] Connection failed: {e}")
        return

    # Step 1: Migrate leads
    lead_m, lead_s, lead_e = await migrate_collection(db, "leads", LEAD_TRAVEL_FIELDS)

    # Step 2: Migrate opportunities
    opp_m, opp_s, opp_e = await migrate_collection(db, "opportunities", OPP_TRAVEL_FIELDS)

    # Step 3: Verify
    leads_ok = await verify_migration(db, "leads", LEAD_TRAVEL_FIELDS)
    opps_ok = await verify_migration(db, "opportunities", OPP_TRAVEL_FIELDS)

    # Summary
    print(f"\n{'='*60}")
    print("MIGRATION SUMMARY")
    print(f"{'='*60}")
    print(f"Leads:         {lead_m} migrated, {lead_s} skipped, {lead_e} errors")
    print(f"Opportunities: {opp_m} migrated, {opp_s} skipped, {opp_e} errors")
    print(f"Verification:  Leads={'OK' if leads_ok else 'FAIL'}  "
          f"Opportunities={'OK' if opps_ok else 'FAIL'}")

    if lead_e > 0 or opp_e > 0:
        print("\n[WARNING] There were errors. DO NOT proceed with field removal.")
    elif not leads_ok or not opps_ok:
        print("\n[WARNING] Verification failed. DO NOT proceed with field removal.")
    else:
        print("\n[OK] Migration complete. Safe to proceed with code changes.")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
