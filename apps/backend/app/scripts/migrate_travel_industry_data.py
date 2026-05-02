"""
Migration script: Move hardcoded travel fields into industry_data block.

This script reads every Lead and Opportunity in the database and moves
travel-specific fields into the `industry_data` JSON block.

Usage:
    python -m app.scripts.migrate_travel_industry_data

    Or from Python:
        from app.scripts.migrate_travel_industry_data import migrate
        await migrate(dry_run=True)  # Preview only
        await migrate(dry_run=False)  # Execute migration
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


LEAD_TRAVEL_FIELDS = [
    "travel_date", "no_of_nights", "no_of_adults", "no_of_pax",
    "no_of_childs", "no_of_infants", "destinations", "destination_ids",
    "experience_id", "is_fixed",
]

OPPORTUNITY_TRAVEL_FIELDS = [
    "travel_date", "no_of_pax", "no_of_nights", "no_of_adults",
    "no_of_childs", "no_of_infants", "destination_ids", "origin_ids",
    "inclusions", "country_of_origin", "experience_id", "departure_id",
]


async def migrate(dry_run: bool = True):
    """Migrate travel fields from root level to industry_data block.
    
    Args:
        dry_run: If True, only prints what would change without modifying data.
    """
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]

    # --- Migrate Leads ---
    leads_collection = db["leads"]
    lead_cursor = leads_collection.find({"deleted_at": None})
    lead_count = 0
    lead_migrated = 0

    async for lead in lead_cursor:
        lead_count += 1
        industry_data = lead.get("industry_data", {})
        
        # Check if any travel fields exist at root level
        has_travel_fields = any(lead.get(f) is not None for f in LEAD_TRAVEL_FIELDS)
        
        if not has_travel_fields:
            continue

        # Build industry_data from root fields
        for field in LEAD_TRAVEL_FIELDS:
            value = lead.get(field)
            if value is not None and field not in industry_data:
                industry_data[field] = value

        if dry_run:
            print(f"[DRY RUN] Lead {lead['_id']}: would migrate {list(industry_data.keys())}")
        else:
            # Set industry_data and unset root travel fields
            unset_fields = {f: "" for f in LEAD_TRAVEL_FIELDS if lead.get(f) is not None}
            await leads_collection.update_one(
                {"_id": lead["_id"]},
                {
                    "$set": {"industry_data": industry_data},
                    "$unset": unset_fields,
                },
            )
        lead_migrated += 1

    print(f"\n{'[DRY RUN] ' if dry_run else ''}Leads: {lead_migrated}/{lead_count} migrated")

    # --- Migrate Opportunities ---
    opps_collection = db["opportunities"]
    opp_cursor = opps_collection.find({"deleted_at": None})
    opp_count = 0
    opp_migrated = 0

    async for opp in opp_cursor:
        opp_count += 1
        industry_data = opp.get("industry_data", {})

        has_travel_fields = any(opp.get(f) is not None for f in OPPORTUNITY_TRAVEL_FIELDS)

        if not has_travel_fields:
            continue

        for field in OPPORTUNITY_TRAVEL_FIELDS:
            value = opp.get(field)
            if value is not None and field not in industry_data:
                industry_data[field] = value

        if dry_run:
            print(f"[DRY RUN] Opportunity {opp['_id']}: would migrate {list(industry_data.keys())}")
        else:
            unset_fields = {f: "" for f in OPPORTUNITY_TRAVEL_FIELDS if opp.get(f) is not None}
            await opps_collection.update_one(
                {"_id": opp["_id"]},
                {
                    "$set": {"industry_data": industry_data},
                    "$unset": unset_fields,
                },
            )
        opp_migrated += 1

    print(f"{'[DRY RUN] ' if dry_run else ''}Opportunities: {opp_migrated}/{opp_count} migrated")

    # --- Set all existing tenants to industry="travel" ---
    tenants_collection = db["tenants"]
    if not dry_run:
        result = await tenants_collection.update_many(
            {"industry": {"$exists": False}},
            {"$set": {
                "industry": "travel",
                "modules": {
                    "destinations": True,
                    "itineraries": True,
                    "packages": True,
                    "suppliers": True,
                },
            }},
        )
        print(f"Tenants updated: {result.modified_count}")
    else:
        count = await tenants_collection.count_documents({"industry": {"$exists": False}})
        print(f"[DRY RUN] Would update {count} tenants with industry='travel'")

    client.close()
    print("\nMigration complete!" if not dry_run else "\n[DRY RUN] Preview complete — no data was modified.")


if __name__ == "__main__":
    asyncio.run(migrate(dry_run=True))
