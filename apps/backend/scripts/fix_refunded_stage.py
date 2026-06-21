"""
Fix the data bug where the 'Refunded' sales stage was flagged is_lost=True,
which made clicking it prompt for a Close-Lost reason. Refunded is a distinct
terminal state, not a lost deal -> set is_lost=False.

Only touches picklist rows with picklist_type='sales_stage' AND name matching
'Refunded'. No tenants, no other stages, no deletions.

Run from apps/backend:  python scripts/fix_refunded_stage.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


async def main():
    db = AsyncIOMotorClient(settings.MONGODB_URL)[settings.MONGODB_DB_NAME]

    flt = {
        "picklist_type": "sales_stage",
        "name": {"$regex": "^refund", "$options": "i"},
        "is_lost": True,
    }
    before = await db.picklists.find(flt).to_list(None)
    print(f"Refunded rows with is_lost=True: {len(before)}")
    for r in before:
        print(f"  _id={r['_id']} tenant_id={r.get('tenant_id')}")

    if not before:
        print("Nothing to fix.")
        return

    res = await db.picklists.update_many(flt, {"$set": {"is_lost": False}})
    print(f"matched={res.matched_count} modified={res.modified_count}")

    after = await db.picklists.find(
        {"picklist_type": "sales_stage", "name": {"$regex": "^refund", "$options": "i"}}
    ).to_list(None)
    print("AFTER:")
    for r in after:
        print(f"  _id={r['_id']} tenant_id={r.get('tenant_id')} is_lost={r.get('is_lost')} is_won={r.get('is_won')}")


if __name__ == "__main__":
    asyncio.run(main())
