"""
Seed all 6 travel stages for the travel tenant.
Run this AFTER fix_travel_stages.py if stages are missing.
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


async def main():
    from app.db.mongodb import init_db
    from app.models.opportunity_picklists import SalesStage
    from app.models.tenant import Tenant

    await init_db()

    # Find travel tenant
    travel_tenant = await Tenant.find_one({"industry": "travel"})
    if not travel_tenant:
        print("ERROR: No travel tenant found.")
        return

    travel_tenant_id = travel_tenant.id
    print(f"[OK] Travel tenant: {travel_tenant.company_name!r}  id={travel_tenant_id}")

    collection = SalesStage.get_motor_collection()

    # Full travel pipeline definition
    travel_stages = [
        {"name": "Received",    "probability": 10,  "sorting": 10, "is_default": True,  "is_won": False, "is_lost": False, "color": "#6366f1"},
        {"name": "Qualified",   "probability": 20,  "sorting": 20, "is_default": False, "is_won": False, "is_lost": False, "color": "#8b5cf6"},
        {"name": "Proposal",    "probability": 30,  "sorting": 30, "is_default": False, "is_won": False, "is_lost": False, "color": "#06b6d4"},
        {"name": "Closed Won",  "probability": 100, "sorting": 40, "is_default": False, "is_won": True,  "is_lost": False, "color": "#10b981"},
        {"name": "Closed Lost", "probability": 0,   "sorting": 50, "is_default": False, "is_won": False, "is_lost": True,  "color": "#ef4444"},
        {"name": "Refunded",    "probability": 0,   "sorting": 60, "is_default": False, "is_won": False, "is_lost": False, "color": "#9ca3af"},
    ]

    inserted = 0
    updated = 0
    for stage_data in travel_stages:
        # Check if already exists for this tenant
        existing = await collection.find_one({
            "name": stage_data["name"],
            "tenant_id": travel_tenant_id
        })
        if existing:
            await collection.update_one(
                {"_id": existing["_id"]},
                {"$set": {**stage_data, "is_active": True, "tenant_id": travel_tenant_id}}
            )
            print(f"  [UPDATED] {stage_data['name']}")
            updated += 1
        else:
            from datetime import datetime
            doc = {**stage_data, "is_active": True, "tenant_id": travel_tenant_id,
                   "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()}
            await collection.insert_one(doc)
            print(f"  [INSERTED] {stage_data['name']}")
            inserted += 1

    print(f"\n[OK] Inserted={inserted} Updated={updated}")

    # Final verification
    final = await collection.find(
        {"tenant_id": travel_tenant_id, "is_active": True}
    ).sort("sorting", 1).to_list(length=200)

    print(f"\nTravel pipeline ({len(final)} stages):")
    for s in final:
        print(f"  [{s.get('sorting', 0):>3}] {s['name']}  won={s.get('is_won')}  lost={s.get('is_lost')}  default={s.get('is_default')}")

    print("\n[DONE] Refresh the browser.")


asyncio.run(main())
