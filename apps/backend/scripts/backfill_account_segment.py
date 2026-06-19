"""
Fix: Re-backfill account segments using correct logic.
- is_person_account=True  -> always B2C
- is_person_account=False -> check opportunity for CORPORATE, else B2B

Note: the legacy "B2B_DIRECT" segment value was renamed to "CORPORATE".
Run scripts/migrate_segment_corporate.py first to rewrite stored values.
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGODB_URL", os.getenv("MONGO_URL", "mongodb://localhost:27017"))
DB_NAME = os.getenv("MONGODB_DB_NAME", os.getenv("MONGO_DB", "tutterfly"))


async def fix_segments():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    accounts_col = db["accounts"]
    opportunities_col = db["opportunities"]

    cursor = accounts_col.find({"deleted_at": None})
    updated = 0

    async for account in cursor:
        account_id = account["_id"]
        is_person = account.get("is_person_account", False)

        if is_person:
            # Person accounts are ALWAYS B2C
            segment = "B2C"
        else:
            # Company accounts: inherit CORPORATE if any linked opp is Corporate
            # (accepts the legacy "B2B_DIRECT" value too), else plain B2B.
            opp = await opportunities_col.find_one(
                {"account_id": account_id, "segment": {"$in": ["CORPORATE", "B2B_DIRECT"]}}
            )
            segment = "CORPORATE" if opp else "B2B"

        old_segment = account.get("segment")
        if old_segment != segment:
            await accounts_col.update_one(
                {"_id": account_id},
                {"$set": {"segment": segment}}
            )
            updated += 1
            print(f"  FIXED {account.get('name', '?')}: {old_segment} -> {segment}")
        else:
            print(f"  OK    {account.get('name', '?')}: {segment} (no change)")

    print(f"\nDone. Fixed: {updated}")
    client.close()


if __name__ == "__main__":
    asyncio.run(fix_segments())
