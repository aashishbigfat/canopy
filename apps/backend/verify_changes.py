import asyncio
import os
import sys
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Add current directory to path so 'app' can be found
sys.path.append(os.getcwd())

# Load .env
load_dotenv(".env")

from app.models.contact import Contact
from app.models.account import Account
from app.models.opportunity import Opportunity
from app.models.task import Task
from app.models.user import User
from app.models.dashboard import Dashboard, DashboardWidget, DashboardUserPreference
from app.services.dashboard_service import dashboard_service

async def verify():
    # Setup DB
    mongodb_url = os.getenv("MONGODB_URL")
    if not mongodb_url:
        print("MONGODB_URL not found in .env")
        return
        
    client = AsyncIOMotorClient(mongodb_url)
    db = client.get_database()
    await init_beanie(
        database=db,
        document_models=[
            Contact, Account, Opportunity, Task, User,
            Dashboard, DashboardWidget, DashboardUserPreference
        ]
    )
    
    # Get a tenant and user to test with
    user = await User.find_one({})
    if not user:
        print("No user found in DB")
        return
    
    tenant_id = str(user.tenant_id)
    user_id = str(user.id)
    
    print(f"Testing with User: {user.email}, Tenant: {tenant_id}")
    
    # 1. Verify Analytics Summary
    print("\n--- Analytics Summary ---")
    stats = await dashboard_service.get_analytics_summary(tenant_id, user_id)
    print(stats)
    
    # 2. Verify Key Deals
    print("\n--- Key Deals ---")
    key_deals = await dashboard_service.get_key_deals(tenant_id, user_id)
    print(f"Found {len(key_deals)} key deals")
    if key_deals:
        print(f"Sample deal: {key_deals[0]['name']} (Amount: {key_deals[0].get('amount')})")
        
    # 3. Verify Task Summary
    print("\n--- Task Summary ---")
    task_summary = await dashboard_service.get_task_summary(tenant_id, user_id)
    print(task_summary)
    
    # 4. Verify Contact Account Name population logic (service level check)
    print("\n--- Contact Account Check ---")
    contact = await Contact.find_one({"tenant_id": user.tenant_id, "account_id": {"$ne": None}})
    if contact and contact.account_id:
        account = await Account.get(contact.account_id)
        if account:
            print(f"Contact: {contact.full_name}, Account: {account.name}")
        else:
            print(f"Contact found, but Account {contact.account_id} not found")
    else:
        print("No contact with associated account found for test")

if __name__ == "__main__":
    asyncio.run(verify())
