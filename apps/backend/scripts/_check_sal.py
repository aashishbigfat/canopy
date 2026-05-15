"""Deep audit: Check every picklist type in the DB and the PICKLIST_MAP aliases"""
import asyncio, certifi
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def run():
    client = AsyncIOMotorClient(settings.MONGODB_URL, ssl=True, tls=True, tlsCAFile=certifi.where())
    db = client[settings.MONGODB_DB_NAME]
    
    # 1. Count documents per picklist_type
    pipeline = [
        {"$group": {"_id": "$picklist_type", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    counts = await db.picklists.aggregate(pipeline).to_list(50)
    
    print("=== Documents per picklist_type in 'picklists' collection ===")
    for c in counts:
        print(f"  {str(c['_id']):25s}  count={c['count']}")
    
    # 2. Check for separate legacy collections that might have data
    legacy_collections = [
        "destinations", "inclusions", "itinerary_inclusions",
        "supplier_types", "supplier_services", "opportunity_types",
        "opportunity_tags", "salutations", "ratings", "categories"
    ]
    print("\n=== Legacy standalone collections ===")
    all_collections = await db.list_collection_names()
    for lc in legacy_collections:
        if lc in all_collections:
            count = await db[lc].count_documents({})
            print(f"  {lc:30s}  exists=True  count={count}")
        else:
            print(f"  {lc:30s}  exists=False")
    
    # 3. Check Destination model specifically (it has its own API router)
    print("\n=== Destinations collection check ===")
    if "destinations" in all_collections:
        docs = await db.destinations.find({}).to_list(5)
        for d in docs:
            print(f"  name={d.get('name')}  tenant_id={d.get('tenant_id')}  picklist_type={d.get('picklist_type')}")
    
    # 4. Check what's actually in picklists for our tenant
    from bson import ObjectId
    tenant_id = ObjectId("69695c5af4e00c00af79d149")
    
    print(f"\n=== Picklist items for tenant {tenant_id} ===")
    tenant_docs = await db.picklists.find({"tenant_id": tenant_id}).to_list(100)
    types = {}
    for d in tenant_docs:
        pt = d.get('picklist_type', 'MISSING')
        types.setdefault(pt, []).append(d.get('name'))
    for pt, names in sorted(types.items()):
        print(f"  {pt}: {names}")
    
    client.close()

asyncio.run(run())
