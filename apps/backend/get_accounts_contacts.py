"""
Get accounts and contacts for opportunity testing
"""
import asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.models.account import Account
from app.models.contact import Contact
from app.models.tenant import Tenant

async def get_accounts_contacts():
    """Get accounts and contacts for opportunity testing"""
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    
    # Initialize Beanie
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[Account, Contact, Tenant]
    )
    
    # Get the first tenant
    tenant = await Tenant.find_one({})
    if not tenant:
        print("No tenant found.")
        return
    
    print(f"Accounts and Contacts for tenant: {tenant.company_name}")
    print("=" * 50)
    
    # Get Accounts
    print("\n🏢 ACCOUNTS:")
    accounts = await Account.find({"tenant_id": tenant.id}).to_list()
    for account in accounts:
        print(f"  {account.name}: {account.id}")
    
    # Get Contacts
    print("\n👤 CONTACTS:")
    contacts = await Contact.find({"tenant_id": tenant.id}).to_list()
    for contact in contacts:
        print(f"  {contact.first_name} {contact.last_name}: {contact.id}")
    
    print("\n" + "=" * 50)
    print("✅ Accounts and contacts retrieved!")

if __name__ == "__main__":
    asyncio.run(get_accounts_contacts())
