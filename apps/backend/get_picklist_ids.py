"""
Get picklist IDs from database for CSV import
"""
import asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.models.picklists import AccountType, Industry, Rating, AccountSource
from app.models.lead_picklists import LeadStatus, Source, SourceMedium
from app.models.tenant import Tenant

async def get_picklist_ids():
    """Get all picklist items with their IDs"""
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    
    # Initialize Beanie
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[
            AccountType, Industry, Rating, AccountSource,
            LeadStatus, Source, SourceMedium, Tenant
        ]
    )
    
    # Get the first tenant
    tenant = await Tenant.find_one({})
    if not tenant:
        print("No tenant found. Please create a tenant first.")
        return
    
    print(f"Picklist IDs for tenant: {tenant.company_name}")
    print("=" * 50)
    
    # Get Lead Statuses
    print("\n📋 LEAD STATUSES:")
    lead_statuses = await LeadStatus.find({"tenant_id": tenant.id}).to_list()
    for status in lead_statuses:
        print(f"  {status.name}: {status.id}")
    
    # Get Sources
    print("\n📋 SOURCES:")
    sources = await Source.find({"tenant_id": tenant.id}).to_list()
    for source in sources:
        print(f"  {source.name}: {source.id}")
    
    # Get Source Mediums
    print("\n📋 SOURCE MEDIUMS:")
    source_mediums = await SourceMedium.find({"tenant_id": tenant.id}).to_list()
    for medium in source_mediums:
        print(f"  {medium.name}: {medium.id}")
    
    # Get Industries
    print("\n📋 INDUSTRIES:")
    industries = await Industry.find({"tenant_id": tenant.id}).to_list()
    for industry in industries:
        print(f"  {industry.name}: {industry.id}")
    
    # Get Ratings
    print("\n📋 RATINGS:")
    ratings = await Rating.find({"tenant_id": tenant.id}).to_list()
    for rating in ratings:
        print(f"  {rating.name}: {rating.id}")
    
    # Get Account Types
    print("\n📋 ACCOUNT TYPES:")
    account_types = await AccountType.find({"tenant_id": tenant.id}).to_list()
    for acc_type in account_types:
        print(f"  {acc_type.name}: {acc_type.id}")
    
    print("\n" + "=" * 50)
    print("✅ Picklist IDs retrieved successfully!")
    print("\n💡 Use these IDs in your CSV file for lead import")

if __name__ == "__main__":
    asyncio.run(get_picklist_ids())
