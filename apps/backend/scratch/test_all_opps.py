import asyncio
import os
import sys

# Setup imports
sys.path.append('d:/tutterfly/apps/backend')

from app.db.mongodb import get_database
from beanie import init_beanie
from app.models.opportunity import Opportunity

async def test_endpoint():
    db = await get_database()
    models = [Opportunity]
    await init_beanie(database=db, document_models=models)
    
    opportunities = await Opportunity.find({}).to_list()
    print(f"Total opportunities in DB: {len(opportunities)}")
    
    owner_set = set()
    for opp in opportunities:
        owner_set.add(str(opp.owner_id))
        
    print(f"Unique Owner IDs: {owner_set}")

if __name__ == "__main__":
    asyncio.run(test_endpoint())
