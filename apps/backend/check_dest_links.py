"""Check if destinations are actively linked."""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    op_links = await db.destination_opportunities.count_documents({})
    lead_links = await db.destination_leads.count_documents({})
    
    print(f"DestinationOpportunity links: {op_links}")
    print(f"DestinationLead links: {lead_links}")
    
    client.close()

asyncio.run(main())
