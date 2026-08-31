"""
One-off fix: seed_locations.py inserted destination picklists via raw motor and
omitted Beanie's single-collection discriminator (`_class_id`), so
`DestinationPicklist.find()` (and therefore GET /picklists/destination) matched
nothing. This backfills the discriminator on any destination picklist missing it.

Run from apps/backend:
    python scripts/fix_destination_classid.py            # dry-run
    python scripts/fix_destination_classid.py --apply
"""
import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from bson import ObjectId
from app.core.config import settings
from app.core.picklist_query import build_picklist_query
import app.models.consolidated_picklists as cp

CLASS_ID = "BasePicklist.DestinationPicklist"


async def main(apply: bool):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    cli = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=10000)
    db = cli[settings.MONGODB_DB_NAME]
    models = [getattr(cp, n) for n in dir(cp)
              if isinstance(getattr(cp, n), type) and issubclass(getattr(cp, n), cp.BasePicklist)]
    await init_beanie(database=db, document_models=models)
    DP = cp.DestinationPicklist

    missing = await db.picklists.count_documents(
        {"picklist_type": "destination", "_class_id": {"$exists": False}})
    print(f"destination docs missing _class_id: {missing}")

    if not apply:
        print("DRY-RUN: would set _class_id =", CLASS_ID, "on those docs.")
        cli.close()
        return

    res = await db.picklists.update_many(
        {"picklist_type": "destination", "_class_id": {"$exists": False}},
        {"$set": {"_class_id": CLASS_ID}},
    )
    print(f"updated: {res.modified_count}")

    # Verify through the real model query the endpoint uses
    tid = (await db.tenants.find_one({"industry": "travel"}))["_id"]
    q = build_picklist_query(tid, industry="travel", active_only=False, picklist_type="destination")
    n = await DP.find(q).count()
    print(f"DestinationPicklist.find(endpoint query).count() AFTER fix: {n}")
    cli.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()
    asyncio.run(main(apply=args.apply))
