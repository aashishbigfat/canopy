import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
import sys
import os

# Add the current directory to sys.path to allow imports from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.models.picklists import AccountType
from app.models.tenant import Tenant

async def run():
    client = AsyncIOMotorClient(
        settings.MONGODB_URL,
        ssl=True,
        tls=True,
        tlsAllowInvalidCertificates=False
    )
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[AccountType, Tenant],
        allow_index_dropping=False
    )
    
    tenants = await Tenant.find_all().to_list()
    if not tenants:
        print("No tenants found.")
        return
        
    for tenant in tenants:
        print(f"Fixing account types for tenant: {tenant.company_name} ({tenant.id})")
        
        # Delete existing account types for this tenant
        deleted_result = await AccountType.find({"tenant_id": tenant.id}).delete()
        print(f"Deleted old account types for {tenant.company_name}.")
        
        types = [
            'Travel Agent', 'Travel Enterprise', 'Corporate Client', 
            'Clubs And Ngos', 'Supplier', 'Event Management Company', 
            'Travel Leaders', 'Others'
        ]
        
        for i, t in enumerate(types):
            acc = AccountType(
                name=t,
                tenant_id=tenant.id,
                sorting=i,
                is_active=True
            )
            await acc.insert()
            print(f"Inserted: {t}")
            
    print("Account Types successfully patched for ALL tenants in MongoDB!")

if __name__ == "__main__":
    asyncio.run(run())
