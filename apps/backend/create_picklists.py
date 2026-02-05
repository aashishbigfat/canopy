"""
Create sample picklist data for lead import testing
"""
import asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.models.picklists import AccountType, Industry, Rating, AccountSource
from app.models.lead_picklists import LeadStatus, Source, SourceMedium
from app.models.tenant import Tenant

async def create_picklists():
    """Create sample picklist data"""
    
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
    
    print(f"Creating picklists for tenant: {tenant.company_name}")
    
    # Lead Statuses
    lead_statuses = [
        {"name": "New", "description": "New lead - not contacted yet", "sorting": 1, "is_active": True, "tenant_id": tenant.id},
        {"name": "Contacted", "description": "Initial contact made", "sorting": 2, "is_active": True, "tenant_id": tenant.id},
        {"name": "Qualified", "description": "Lead qualified as potential customer", "sorting": 3, "is_active": True, "tenant_id": tenant.id},
        {"name": "Proposal", "description": "Proposal sent to lead", "sorting": 4, "is_active": True, "tenant_id": tenant.id},
        {"name": "Negotiation", "description": "In negotiation phase", "sorting": 5, "is_active": True, "tenant_id": tenant.id},
        {"name": "Converted", "description": "Lead converted to opportunity", "sorting": 6, "is_active": True, "tenant_id": tenant.id},
        {"name": "Lost", "description": "Lead lost - not interested", "sorting": 7, "is_active": True, "tenant_id": tenant.id},
    ]
    
    # Sources
    sources = [
        {"name": "Website", "description": "Company website inquiry", "sorting": 1, "is_active": True, "tenant_id": tenant.id},
        {"name": "LinkedIn", "description": "LinkedIn outreach", "sorting": 2, "is_active": True, "tenant_id": tenant.id},
        {"name": "Referral", "description": "Customer referral", "sorting": 3, "is_active": True, "tenant_id": tenant.id},
        {"name": "Cold Call", "description": "Cold call outreach", "sorting": 4, "is_active": True, "tenant_id": tenant.id},
        {"name": "Email Campaign", "description": "Email marketing campaign", "sorting": 5, "is_active": True, "tenant_id": tenant.id},
        {"name": "Trade Show", "description": "Trade show or event", "sorting": 6, "is_active": True, "tenant_id": tenant.id},
        {"name": "Social Media", "description": "Social media inquiry", "sorting": 7, "is_active": True, "tenant_id": tenant.id},
    ]
    
    # Source Mediums
    source_mediums = [
        {"name": "Organic", "description": "Organic search or direct", "sorting": 1, "is_active": True, "tenant_id": tenant.id},
        {"name": "Paid", "description": "Paid advertising", "sorting": 2, "is_active": True, "tenant_id": tenant.id},
        {"name": "Direct", "description": "Direct traffic", "sorting": 3, "is_active": True, "tenant_id": tenant.id},
        {"name": "Referral", "description": "Referral traffic", "sorting": 4, "is_active": True, "tenant_id": tenant.id},
        {"name": "Social", "description": "Social media traffic", "sorting": 5, "is_active": True, "tenant_id": tenant.id},
    ]
    
    # Industries
    industries = [
        {"name": "Technology", "description": "Software and technology companies", "sorting": 1, "is_active": True, "tenant_id": tenant.id},
        {"name": "Healthcare", "description": "Healthcare and medical services", "sorting": 2, "is_active": True, "tenant_id": tenant.id},
        {"name": "Finance", "description": "Banking and financial services", "sorting": 3, "is_active": True, "tenant_id": tenant.id},
        {"name": "Manufacturing", "description": "Manufacturing and production", "sorting": 4, "is_active": True, "tenant_id": tenant.id},
        {"name": "Retail", "description": "Retail and e-commerce", "sorting": 5, "is_active": True, "tenant_id": tenant.id},
        {"name": "Education", "description": "Education and training", "sorting": 6, "is_active": True, "tenant_id": tenant.id},
        {"name": "Consulting", "description": "Consulting services", "sorting": 7, "is_active": True, "tenant_id": tenant.id},
        {"name": "Real Estate", "description": "Real estate and construction", "sorting": 8, "is_active": True, "tenant_id": tenant.id},
    ]
    
    # Ratings
    ratings = [
        {"name": "Hot", "description": "High priority lead", "sorting": 1, "is_active": True, "tenant_id": tenant.id},
        {"name": "Warm", "description": "Medium priority lead", "sorting": 2, "is_active": True, "tenant_id": tenant.id},
        {"name": "Cold", "description": "Low priority lead", "sorting": 3, "is_active": True, "tenant_id": tenant.id},
        {"name": "Qualified", "description": "Qualified lead", "sorting": 4, "is_active": True, "tenant_id": tenant.id},
    ]
    
    # Account Types
    account_types = [
        {"name": "Prospect", "description": "Potential customer", "sorting": 1, "is_active": True, "tenant_id": tenant.id},
        {"name": "Customer", "description": "Active customer", "sorting": 2, "is_active": True, "tenant_id": tenant.id},
        {"name": "Partner", "description": "Business partner", "sorting": 3, "is_active": True, "tenant_id": tenant.id},
        {"name": "Vendor", "description": "Vendor or supplier", "sorting": 4, "is_active": True, "tenant_id": tenant.id},
    ]
    
    # Create all picklists
    created_count = 0
    
    for status_data in lead_statuses:
        existing = await LeadStatus.find_one({"name": status_data["name"], "tenant_id": tenant.id})
        if not existing:
            status = LeadStatus(**status_data)
            await status.insert()
            created_count += 1
            print(f"✅ Created Lead Status: {status.name}")
    
    for source_data in sources:
        existing = await Source.find_one({"name": source_data["name"], "tenant_id": tenant.id})
        if not existing:
            source = Source(**source_data)
            await source.insert()
            created_count += 1
            print(f"✅ Created Source: {source.name}")
    
    for medium_data in source_mediums:
        existing = await SourceMedium.find_one({"name": medium_data["name"], "tenant_id": tenant.id})
        if not existing:
            medium = SourceMedium(**medium_data)
            await medium.insert()
            created_count += 1
            print(f"✅ Created Source Medium: {medium.name}")
    
    for industry_data in industries:
        existing = await Industry.find_one({"name": industry_data["name"], "tenant_id": tenant.id})
        if not existing:
            industry = Industry(**industry_data)
            await industry.insert()
            created_count += 1
            print(f"✅ Created Industry: {industry.name}")
    
    for rating_data in ratings:
        existing = await Rating.find_one({"name": rating_data["name"], "tenant_id": tenant.id})
        if not existing:
            rating = Rating(**rating_data)
            await rating.insert()
            created_count += 1
            print(f"✅ Created Rating: {rating.name}")
    
    for acc_type_data in account_types:
        existing = await AccountType.find_one({"name": acc_type_data["name"], "tenant_id": tenant.id})
        if not existing:
            acc_type = AccountType(**acc_type_data)
            await acc_type.insert()
            created_count += 1
            print(f"✅ Created Account Type: {acc_type.name}")
    
    print(f"\n🎉 Successfully created {created_count} picklist items!")
    print("📋 Picklists are now ready for lead import!")

if __name__ == "__main__":
    asyncio.run(create_picklists())
