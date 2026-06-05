"""
Backfill the Beanie `_class_id` discriminator on picklist documents that are
missing it.

Background
----------
`BasePicklist` is a root-discriminated Beanie model (`is_root = True`), so every
query through a subclass (e.g. `DestinationPicklist.find(...)`) is implicitly
filtered by `_class_id`. Documents inserted into the shared `picklists`
collection WITHOUT this field (e.g. via a raw `insert_one` / external import)
are therefore silently invisible to all Beanie subclass queries — even though
they exist and carry the correct `picklist_type`.

This surfaced as tenant-created destinations (e.g. "Shimla") not resolving:
the opportunity detail view showed "No destinations specified", the edit form
showed the raw ObjectId, and the Costing/Transaction destination dropdowns were
empty — all because `DestinationPicklist` queries skipped the `_class_id`-less
docs.

This migration sets `_class_id` from `picklist_type` for any doc missing it.

It ALSO repairs `created_at` / `updated_at` that are stored as `None` (or
missing) on the same externally-imported docs — once a `_class_id`-less doc
becomes visible to Beanie, those null timestamps fail Pydantic validation
(`Input should be a valid datetime`) and break the whole list query.

Run:
    python -m app.scripts.backfill_picklist_class_id
"""
import asyncio
from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

# MUST match the class names in app/models/consolidated_picklists.py
_PICKLIST_CLASS_ID_MAP = {
    "account_type": "BasePicklist.AccountType",
    "industry": "BasePicklist.Industry",
    "account_source": "BasePicklist.AccountSource",
    "account_category": "BasePicklist.AccountCategory",
    "lead_status": "BasePicklist.LeadStatus",
    "source": "BasePicklist.Source",
    "source_medium": "BasePicklist.SourceMedium",
    "experience": "BasePicklist.Experience",
    "sales_stage": "BasePicklist.SalesStage",
    "opportunity_type": "BasePicklist.OpportunityType",
    "opportunity_tag": "BasePicklist.OpportunityTag",
    "supplier_service": "BasePicklist.SupplierServicePicklist",
    "salutation": "BasePicklist.Salutation",
    "task_status": "BasePicklist.TaskStatus",
    "task_priority": "BasePicklist.TaskPriority",
    "inclusion": "BasePicklist.Inclusion",
    "itinerary_inclusion": "BasePicklist.ItineraryInclusion",
    "supplier_type": "BasePicklist.SupplierType",
    "destination": "BasePicklist.DestinationPicklist",
    "bd_activity_type": "BasePicklist.BDActivityType",
    "expense_category": "BasePicklist.ExpenseCategory",
}


async def main() -> None:
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    coll = db["picklists"]

    missing_filter = {"$or": [{"_class_id": {"$exists": False}}, {"_class_id": None}]}
    total_missing = await coll.count_documents(missing_filter)
    print(f"Picklist docs missing _class_id: {total_missing}")

    grand_total = 0
    for picklist_type, class_id in _PICKLIST_CLASS_ID_MAP.items():
        res = await coll.update_many(
            {"picklist_type": picklist_type, **missing_filter},
            {"$set": {"_class_id": class_id}},
        )
        if res.modified_count:
            print(f"  {picklist_type:18s} -> {class_id:38s} updated={res.modified_count}")
            grand_total += res.modified_count

    # Report any leftovers whose picklist_type isn't in the map
    leftover = await coll.count_documents(missing_filter)
    print(f"Backfilled {grand_total} docs. Remaining without _class_id: {leftover}")
    if leftover:
        cur = coll.find(missing_filter, {"picklist_type": 1, "name": 1})
        async for d in cur:
            print(f"  UNMAPPED picklist_type={d.get('picklist_type')!r} name={d.get('name')!r}")

    # ── Repair null/missing timestamps ──
    # BasePicklist requires non-null datetimes; externally-imported docs sometimes
    # carry created_at/updated_at = None, which crashes the read-time Pydantic parse.
    now = datetime.utcnow()
    null_ts_filter = {
        "$or": [
            {"created_at": None},
            {"created_at": {"$exists": False}},
            {"updated_at": None},
            {"updated_at": {"$exists": False}},
        ]
    }
    ts_missing = await coll.count_documents(null_ts_filter)
    if ts_missing:
        res_created = await coll.update_many(
            {"$or": [{"created_at": None}, {"created_at": {"$exists": False}}]},
            {"$set": {"created_at": now}},
        )
        res_updated = await coll.update_many(
            {"$or": [{"updated_at": None}, {"updated_at": {"$exists": False}}]},
            {"$set": {"updated_at": now}},
        )
        print(
            f"Repaired timestamps: created_at={res_created.modified_count}, "
            f"updated_at={res_updated.modified_count} (docs affected: {ts_missing})"
        )
    else:
        print("No null/missing timestamps to repair.")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
