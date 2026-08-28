"""
One-time migration: rename the legacy segment value "B2B_DIRECT" -> "CORPORATE".

Background
----------
The segment model was cleaned up to three canonical values:

    B2C        individual / person account
    B2B        business / organisation account  (was labelled "B2B (Corporate)")
    CORPORATE  corporate / key accounts          (was the value "B2B_DIRECT")

Only the old "B2B_DIRECT" value moves; "B2C" and "B2B" are left untouched.
The ``segment`` field lives on leads, accounts and opportunities.

Usage
-----
    python -m scripts.migrate_segment_corporate
        (from apps/backend, with the same env/.env used by the app)

Safe to re-run: it only matches documents that still hold "B2B_DIRECT".
"""
import asyncio
import os

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGODB_URL", os.getenv("MONGO_URL", "mongodb://localhost:27017"))
DB_NAME = os.getenv("MONGODB_DB_NAME", os.getenv("MONGO_DB", "tutterfly"))

LEGACY_VALUE = "B2B_DIRECT"
NEW_VALUE = "CORPORATE"
COLLECTIONS = ["leads", "accounts", "opportunities"]


async def migrate() -> None:
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print(f"DB: {DB_NAME}  —  {LEGACY_VALUE} -> {NEW_VALUE}\n")
    total = 0
    try:
        for name in COLLECTIONS:
            col = db[name]
            pending = await col.count_documents({"segment": LEGACY_VALUE})
            if not pending:
                print(f"  {name:<14} no documents to migrate")
                continue
            result = await col.update_many(
                {"segment": LEGACY_VALUE},
                {"$set": {"segment": NEW_VALUE}},
            )
            total += result.modified_count
            print(f"  {name:<14} migrated {result.modified_count} / {pending}")
    finally:
        client.close()

    print(f"\nDone. Total migrated: {total}")


if __name__ == "__main__":
    asyncio.run(migrate())
