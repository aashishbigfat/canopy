"""
Migration script to update Opportunity sales_stage_ids.

The CRM was recently refactored to use a consolidated `picklists` collection
instead of a standalone `sales_stages` collection, AND stages are now scoped
by `tenant_id`.

Existing Opportunity documents are pointing to old, global `sales_stage_id`s in
the old `sales_stages` collection. This script maps them to the new, tenant-scoped
stages in the `picklists` collection.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def main():
    from dotenv import load_dotenv
    load_dotenv()
    
    mongo_url = os.environ.get('MONGODB_URL') or os.environ.get('MONGO_URL') or 'mongodb://localhost:27017'
    db_name = os.environ.get('MONGODB_DB_NAME') or os.environ.get('DB_NAME') or 'tutterfly'
    
    print(f"Connecting to DB: {db_name}")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Get all old stages to map by ID
    old_stages_cursor = db.sales_stages.find({})
    old_stages = await old_stages_cursor.to_list(length=None)
    old_stage_map = {str(stage['_id']): stage['name'] for stage in old_stages}
    print(f"Loaded {len(old_stages)} old stages from 'sales_stages' collection")
    
    # Get all opportunities
    opps_cursor = db.opportunities.find({})
    opps = await opps_cursor.to_list(length=None)
    print(f"Found {len(opps)} opportunities to check")
    
    updated_count = 0
    not_found_count = 0
    
    for opp in opps:
        old_id = str(opp.get('sales_stage_id'))
        tenant_id = opp.get('tenant_id')
        
        # What is the name of the stage this opp was in?
        stage_name = old_stage_map.get(old_id)
        
        if not stage_name:
            # Maybe it already points to a picklist stage?
            new_stage_check = await db.picklists.find_one({'_id': ObjectId(old_id), 'picklist_type': 'sales_stage'})
            if new_stage_check:
                continue # Already valid
            else:
                print(f"  [WARN] Opp {opp.get('name')} points to unknown stage ID {old_id}")
                continue
                
        # Find the matching stage in the new picklists collection for this tenant
        new_stage = await db.picklists.find_one({
            'tenant_id': tenant_id,
            'picklist_type': 'sales_stage',
            'name': stage_name
        })
        
        if new_stage:
            # Update the opportunity
            await db.opportunities.update_one(
                {'_id': opp['_id']},
                {'$set': {'sales_stage_id': new_stage['_id']}}
            )
            updated_count += 1
            print(f"  [OK] Updated Opp {opp.get('name')} -> {stage_name} (New ID: {new_stage['_id']})")
        else:
            # If the tenant doesn't have this stage by name (e.g. travel stage on healthcare opp)
            # Find the default stage for this tenant
            default_stage = await db.picklists.find_one({
                'tenant_id': tenant_id,
                'picklist_type': 'sales_stage',
                'is_default': True
            })
            if default_stage:
                 await db.opportunities.update_one(
                    {'_id': opp['_id']},
                    {'$set': {'sales_stage_id': default_stage['_id']}}
                )
                 updated_count += 1
                 print(f"  [FIXED] Opp {opp.get('name')} -> forced to {default_stage['name']} (New ID: {default_stage['_id']})")
            else:
                 not_found_count += 1
                 print(f"  [FAIL] Opp {opp.get('name')} - no matching stage and no default found!")

    print(f"\\nMigration complete! Updated {updated_count} opportunities. {not_found_count} failed.")
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
