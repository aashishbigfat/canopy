"""
Create opportunity-specific picklists
"""
import asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.models.opportunity_picklists import SalesStage, OpportunityType, Experience
from app.models.destination import Destination
from app.models.tenant import Tenant

async def create_opportunity_picklists():
    """Create opportunity-specific picklists"""
    
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
    
    print(f"Creating opportunity picklists for tenant: {tenant.company_name}")
    
    # Opportunity Types
    opportunity_types = [
        {"name": "New Business", "description": "New business opportunity", "sorting": 1, "is_active": True, "tenant_id": tenant.id},
        {"name": "Existing Business", "description": "Existing customer opportunity", "sorting": 2, "is_active": True, "tenant_id": tenant.id},
        {"name": "Renewal", "description": "Contract renewal opportunity", "sorting": 3, "is_active": True, "tenant_id": tenant.id},
        {"name": "Upsell", "description": "Upsell opportunity", "sorting": 4, "is_active": True, "tenant_id": tenant.id},
        {"name": "Cross-sell", "description": "Cross-sell opportunity", "sorting": 5, "is_active": True, "tenant_id": tenant.id},
    ]
    
    # Experiences
    experiences = [
        {"name": "Adventure", "description": "Adventure travel experiences", "sorting": 1, "is_active": True, "tenant_id": tenant.id},
        {"name": "Luxury", "description": "Luxury travel experiences", "sorting": 2, "is_active": True, "tenant_id": tenant.id},
        {"name": "Cultural", "description": "Cultural experiences", "sorting": 3, "is_active": True, "tenant_id": tenant.id},
        {"name": "Wellness", "description": "Wellness and spa experiences", "sorting": 4, "is_active": True, "tenant_id": tenant.id},
        {"name": "Business", "description": "Business travel experiences", "sorting": 5, "is_active": True, "tenant_id": tenant.id},
        {"name": "Family", "description": "Family-friendly experiences", "sorting": 6, "is_active": True, "tenant_id": tenant.id},
    ]
    
    # Destinations
    destinations = [
        {"name": "Paris", "description": "Paris, France", "country_id": "FRA", "destination_type": "City", "is_active": True, "is_popular": True, "tenant_id": tenant.id, "created_by": tenant.id},
        {"name": "New York", "description": "New York, USA", "country_id": "USA", "destination_type": "City", "is_active": True, "is_popular": True, "tenant_id": tenant.id, "created_by": tenant.id},
        {"name": "Tokyo", "description": "Tokyo, Japan", "country_id": "JPN", "destination_type": "City", "is_active": True, "is_popular": True, "tenant_id": tenant.id, "created_by": tenant.id},
        {"name": "Dubai", "description": "Dubai, UAE", "country_id": "ARE", "destination_type": "City", "is_active": True, "is_popular": True, "tenant_id": tenant.id, "created_by": tenant.id},
        {"name": "London", "description": "London, UK", "country_id": "GBR", "destination_type": "City", "is_active": True, "is_popular": True, "tenant_id": tenant.id, "created_by": tenant.id},
        {"name": "Singapore", "description": "Singapore", "country_id": "SGP", "destination_type": "City", "is_active": True, "is_popular": True, "tenant_id": tenant.id, "created_by": tenant.id},
    ]
    
    # Create all picklists
    created_count = 0
    
    for opp_type_data in opportunity_types:
        existing = await OpportunityType.find_one({"name": opp_type_data["name"], "tenant_id": tenant.id})
        if not existing:
            opp_type = OpportunityType(**opp_type_data)
            await opp_type.insert()
            created_count += 1
            print(f"✅ Created Opportunity Type: {opp_type.name}")
    
    for exp_data in experiences:
        existing = await Experience.find_one({"name": exp_data["name"], "tenant_id": tenant.id})
        if not existing:
            exp = Experience(**exp_data)
            await exp.insert()
            created_count += 1
            print(f"✅ Created Experience: {exp.name}")
    
    for dest_data in destinations:
        existing = await Destination.find_one({"name": dest_data["name"], "tenant_id": tenant.id})
        if not existing:
            dest = Destination(**dest_data)
            await dest.insert()
            created_count += 1
            print(f"✅ Created Destination: {dest.name}")
    
    print(f"\n🎉 Successfully created {created_count} opportunity picklist items!")
    print("📋 Opportunity picklists are now ready!")

if __name__ == "__main__":
    asyncio.run(create_opportunity_picklists())
