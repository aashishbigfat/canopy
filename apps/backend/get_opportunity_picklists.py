"""
Get opportunity-specific picklist IDs
"""
import asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.models.opportunity_picklists import SalesStage, OpportunityType, Experience
from app.models.destination import Destination
from app.models.tenant import Tenant

async def get_opportunity_picklists():
    """Get opportunity-specific picklist IDs"""
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    
    # Initialize Beanie
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[SalesStage, OpportunityType, Experience, Destination, Tenant]
    )
    
    # Get the first tenant
    tenant = await Tenant.find_one({})
    if not tenant:
        print("No tenant found. Please create a tenant first.")
        return
    
    print(f"Opportunity Picklist IDs for tenant: {tenant.company_name}")
    print("=" * 60)
    
    # Get Sales Stages
    print("\n🎯 SALES STAGES:")
    sales_stages = await SalesStage.find({"tenant_id": tenant.id}).to_list()
    for stage in sales_stages:
        print(f"  {stage.name}: {stage.id} (Default: {stage.is_default})")
    
    # Get Opportunity Types
    print("\n📋 OPPORTUNITY TYPES:")
    opportunity_types = await OpportunityType.find({"tenant_id": tenant.id}).to_list()
    for opp_type in opportunity_types:
        print(f"  {opp_type.name}: {opp_type.id}")
    
    # Get Experiences
    print("\n🌟 EXPERIENCES:")
    experiences = await Experience.find({"tenant_id": tenant.id}).to_list()
    for exp in experiences:
        print(f"  {exp.name}: {exp.id}")
    
    # Get Destinations
    print("\n🌍 DESTINATIONS:")
    destinations = await Destination.find({"tenant_id": tenant.id}).to_list()
    for dest in destinations:
        print(f"  {dest.name}: {dest.id}")
    
    print("\n" + "=" * 60)
    print("✅ Opportunity picklist IDs retrieved successfully!")

if __name__ == "__main__":
    asyncio.run(get_opportunity_picklists())
