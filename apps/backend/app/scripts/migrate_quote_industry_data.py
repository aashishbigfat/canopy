"""
Migration script: Move hardcoded travel fields from Quote root into industry_data block.

This is the Quote equivalent of migrate_travel_industry_data.py. It moves
travel-specific fields from the root level of Quote documents into the
`industry_data` JSON block, ensuring backward compatibility.

Usage (dry run):
    python -m app.scripts.migrate_quote_industry_data --dry-run

Usage (live):
    python -m app.scripts.migrate_quote_industry_data

Or from Python:
    from app.scripts.migrate_quote_industry_data import migrate
    asyncio.run(migrate(dry_run=False))
"""

import asyncio
import sys
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

logger = logging.getLogger(__name__)

# Fields that should be moved from root → industry_data
QUOTE_TRAVEL_FIELDS = [
    "travel_date",
    "return_date",
    "num_adults",
    "num_children",
    "num_infants",
    "destinations",
]


async def migrate(dry_run: bool = True):
    """Migrate travel fields from root level to industry_data block for Quotes.

    Only migrates quotes that belong to travel tenants (or all if tenant
    industry is not set, since travel was the original default).
    """
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]

    quotes_coll = db["quotes"]
    tenants_coll = db["tenants"]

    # Build a set of travel tenant IDs (including tenants with no industry field)
    all_tenants = await tenants_coll.find({}).to_list(length=10000)
    travel_tenant_ids = set()
    for t in all_tenants:
        industry = t.get("industry", "travel")
        if industry == "travel":
            travel_tenant_ids.add(t["_id"])

    logger.info(f"Found {len(travel_tenant_ids)} travel tenant(s)")

    # Find quotes that still have root-level travel fields
    query = {
        "tenant_id": {"$in": list(travel_tenant_ids)},
        "$or": [
            {field: {"$exists": True}} for field in QUOTE_TRAVEL_FIELDS
        ],
    }

    quotes = await quotes_coll.find(query).to_list(length=100000)
    logger.info(f"Found {len(quotes)} quote(s) to migrate")

    migrated = 0
    skipped = 0

    for quote in quotes:
        industry_data = quote.get("industry_data", {})
        if not isinstance(industry_data, dict):
            industry_data = {}

        # Build industry_data from root fields
        fields_to_unset = {}
        for field in QUOTE_TRAVEL_FIELDS:
            value = quote.get(field)
            if value is not None and field not in industry_data:
                industry_data[field] = value
                fields_to_unset[field] = ""

        if not fields_to_unset:
            skipped += 1
            continue

        if dry_run:
            logger.info(
                f"[DRY RUN] Quote {quote['_id']}: would migrate "
                f"{list(fields_to_unset.keys())} → industry_data"
            )
        else:
            # Set industry_data and unset root travel fields atomically
            await quotes_coll.update_one(
                {"_id": quote["_id"]},
                {
                    "$set": {"industry_data": industry_data},
                    "$unset": fields_to_unset,
                },
            )
        migrated += 1

    action = "would migrate" if dry_run else "migrated"
    logger.info(
        f"Done. {action} {migrated} quote(s), skipped {skipped} already clean."
    )

    client.close()
    return {"migrated": migrated, "skipped": skipped}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    dry = "--dry-run" in sys.argv
    if dry:
        logger.info("Running in DRY-RUN mode (no writes)")
    else:
        logger.info("Running in LIVE mode (will modify database)")
    asyncio.run(migrate(dry_run=dry))
