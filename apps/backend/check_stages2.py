import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def main():
    from app.db.mongodb import init_db
    from app.models.opportunity_picklists import SalesStage
    from app.models.tenant import Tenant

    await init_db()

    # Get all tenants
    tenants = await Tenant.find().to_list()
    print(f"\n=== Tenants ({len(tenants)}) ===")
    for t in tenants:
        industry = getattr(t, 'industry', 'N/A')
        print(f"  Tenant: {t.name!r} | id: {t.id} | industry: {industry}")

    print()

    # Global stages (tenant_id is null in MongoDB)
    # Use raw MongoDB query to be sure
    from beanie import Document
    raw = await SalesStage.get_motor_collection().find(
        {"tenant_id": {"$exists": False}}
    ).to_list(length=100)
    print(f"Global stages (tenant_id field missing): {len(raw)}")
    for s in raw:
        print(f"  {s.get('name')} | active: {s.get('is_active')}")

    raw2 = await SalesStage.get_motor_collection().find(
        {"tenant_id": None}
    ).to_list(length=100)
    print(f"\nGlobal stages (tenant_id=null): {len(raw2)}")
    for s in raw2:
        print(f"  {s.get('name')} | active: {s.get('is_active')}")

asyncio.run(main())
