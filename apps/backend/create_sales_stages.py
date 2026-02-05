"""
Initialize sales stages for the CRM system
"""
import asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.models.opportunity_picklists import SalesStage
from app.models.tenant import Tenant

async def create_sales_stages():
    """Create basic sales stages for the CRM"""
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    
    # Initialize Beanie
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[SalesStage, Tenant]
    )
    
    # Get the first tenant
    tenant = await Tenant.find_one({})
    if not tenant:
        print("No tenant found. Please create a tenant first.")
        return
    
    print(f"Creating sales stages for tenant: {tenant.company_name}")
    
    # Define basic sales stages
    sales_stages = [
        {
            "name": "Prospecting",
            "description": "Initial stage - identifying potential opportunities",
            "probability": 10,
            "sorting": 1,
            "is_default": True,
            "is_active": True,
            "is_won": False,
            "is_lost": False,
            "tenant_id": tenant.id
        },
        {
            "name": "Qualification",
            "description": "Evaluating if opportunity is worth pursuing",
            "probability": 25,
            "sorting": 2,
            "is_default": False,
            "is_active": True,
            "is_won": False,
            "is_lost": False,
            "tenant_id": tenant.id
        },
        {
            "name": "Needs Analysis",
            "description": "Understanding customer requirements and pain points",
            "probability": 40,
            "sorting": 3,
            "is_default": False,
            "is_active": True,
            "is_won": False,
            "is_lost": False,
            "tenant_id": tenant.id
        },
        {
            "name": "Value Proposition",
            "description": "Presenting solution and value to customer",
            "probability": 60,
            "sorting": 4,
            "is_default": False,
            "is_active": True,
            "is_won": False,
            "is_lost": False,
            "tenant_id": tenant.id
        },
        {
            "name": "Proposal/Quote",
            "description": "Sending formal proposal or quote to customer",
            "probability": 75,
            "sorting": 5,
            "is_default": False,
            "is_active": True,
            "is_won": False,
            "is_lost": False,
            "tenant_id": tenant.id
        },
        {
            "name": "Negotiation",
            "description": "Discussing terms, pricing, and conditions",
            "probability": 90,
            "sorting": 6,
            "is_default": False,
            "is_active": True,
            "is_won": False,
            "is_lost": False,
            "tenant_id": tenant.id
        },
        {
            "name": "Closed Won",
            "description": "Deal successfully closed - customer won",
            "probability": 100,
            "sorting": 7,
            "is_default": False,
            "is_active": True,
            "is_won": True,
            "is_lost": False,
            "tenant_id": tenant.id
        },
        {
            "name": "Closed Lost",
            "description": "Deal lost - customer went with competitor or no longer interested",
            "probability": 0,
            "sorting": 8,
            "is_default": False,
            "is_active": True,
            "is_won": False,
            "is_lost": True,
            "tenant_id": tenant.id
        }
    ]
    
    # Create sales stages
    created_stages = []
    for stage_data in sales_stages:
        # Check if stage already exists
        existing = await SalesStage.find_one({
            "name": stage_data["name"],
            "tenant_id": tenant.id
        })
        
        if not existing:
            stage = SalesStage(**stage_data)
            await stage.insert()
            created_stages.append(stage)
            print(f"✅ Created: {stage.name} (Probability: {stage.probability}%)")
        else:
            print(f"⏭️  Already exists: {existing.name}")
    
    print(f"\n🎉 Successfully created {len(created_stages)} sales stages!")
    print("📋 Sales Pipeline is now ready for lead conversion!")

if __name__ == "__main__":
    asyncio.run(create_sales_stages())
