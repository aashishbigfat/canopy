"""
Fix travel CRM stages: assign the travel tenant's tenant_id to all global
sales stages so they are no longer "global" (tenant_id=None/missing) but
properly owned by the travel tenant.
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

    # 1. Find the travel tenant
    travel_tenant = await Tenant.find_one({"industry": "travel"})
    if not travel_tenant:
        print("ERROR: No travel tenant found.")
        return

    travel_tenant_id = travel_tenant.id
    print(f"[OK] Travel tenant: {travel_tenant.company_name!r}  id={travel_tenant_id}")

    # 2. Find all global stages (tenant_id missing OR null)
    collection = SalesStage.get_motor_collection()
    global_stages = await collection.find(
        {
            "$or": [
                {"tenant_id": {"$exists": False}},
                {"tenant_id": None},
            ]
        }
    ).to_list(length=500)

    if not global_stages:
        print("INFO: No global stages to migrate.")
        return

    print(f"\nFound {len(global_stages)} global stages to migrate:")
    for s in global_stages:
        print(f"  - {s['name']}")

    # 3. Assign travel tenant_id
    ids_to_update = [s["_id"] for s in global_stages]
    result = await collection.update_many(
        {"_id": {"$in": ids_to_update}},
        {"$set": {"tenant_id": travel_tenant_id}}
    )
    print(f"\n[OK] Updated {result.modified_count} stages -> tenant_id={travel_tenant_id}")

    # 4. Verify travel pipeline
    travel_stages = await collection.find(
        {"tenant_id": travel_tenant_id, "is_active": True}
    ).sort("sorting", 1).to_list(length=200)

    print(f"\nTravel now has {len(travel_stages)} active stages:")
    for s in travel_stages:
        print(f"  [{s.get('sorting', 0):>3}] {s['name']}  won={s.get('is_won', False)}  lost={s.get('is_lost', False)}")

    # 5. Other tenants sanity check
    print("\nOther tenants:")
    other_tenants = await Tenant.find({"industry": {"$ne": "travel"}}).to_list()
    for t in other_tenants:
        count = await collection.count_documents({"tenant_id": t.id, "is_active": True})
        print(f"  {t.company_name} ({getattr(t, 'industry', '?')}) -> {count} stages")

    print("\n[DONE] Refresh browser now.")


asyncio.run(main())
