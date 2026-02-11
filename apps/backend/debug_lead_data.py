import asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
import os
from app.models.lead import Lead
from bson import ObjectId

async def main():
    # Connect to database
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    await init_beanie(database=client.tutterfly_crm, document_models=[Lead])

    # Find the lead "Mrs. pooja kapor" or just any lead
    leads = await Lead.find_all().to_list()
    
    print(f"Found {len(leads)} leads")
    
    for lead in leads:
        print(f"Lead: {lead.first_name} {lead.last_name}")
        print(f"  ID: {lead.id}")
        print(f"  Destinations (names): {lead.destinations}")
        print(f"  Destination IDs: {lead.destination_ids}")
        print("-" * 20)

if __name__ == "__main__":
    asyncio.run(main())
