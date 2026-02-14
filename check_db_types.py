import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import json

async def check_types():
    # Use the Atlas URL from .env
    url = "mongodb+srv://bigfatailabs_db_user:pT8nQsJrBCrw6SFp@bigfat1.fun2kxb.mongodb.net/tutterfly_crm?retryWrites=true&w=majority&appName=BigFatAIProducts"
    client = AsyncIOMotorClient(url)
    db = client.get_default_database()
    
    print(f"Connected to database: {db.name}")
    
    account_id_str = "69902ee044d98e48c3b4f165"
    opportunity_id_str = "69902ee044d98e48c3b4f168"
    
    print(f"\n--- Checking Account {account_id_str} ---")
    account = await db.accounts.find_one({"_id": ObjectId(account_id_str)})
    if account:
        print(f"Account found: {account.get('name')}")
        print(f"ID Type: {type(account['_id'])}")
    else:
        print("Account not found")
        
    print(f"\n--- Checking Opportunity {opportunity_id_str} ---")
    opportunity = await db.opportunities.find_one({"_id": ObjectId(opportunity_id_str)})
    if opportunity:
        print(f"Opportunity found: {opportunity.get('name')}")
        print(f"ID Type: {type(opportunity['_id'])}")
        print(f"account_id value: {opportunity.get('account_id')}")
        print(f"account_id Type: {type(opportunity.get('account_id'))}")
        print(f"contact_id value: {opportunity.get('contact_id')}")
        print(f"contact_id Type: {type(opportunity.get('contact_id'))}")
        print(f"lead_id value: {opportunity.get('lead_id')}")
        print(f"lead_id Type: {type(opportunity.get('lead_id'))}")
    else:
        # Try searching by string ID just in case
        opportunity = await db.opportunities.find_one({"_id": opportunity_id_str})
        if opportunity:
            print("Opportunity found via STRING ID!")
        else:
            print("Opportunity not found even via string ID")

    print("\n--- Searching for opportunities by account_id (ObjectId) ---")
    count = await db.opportunities.count_documents({"account_id": ObjectId(account_id_str)})
    print(f"Count (ObjectId): {count}")
    
    print("\n--- Searching for opportunities by account_id (String) ---")
    count = await db.opportunities.count_documents({"account_id": account_id_str})
    print(f"Count (String): {count}")

if __name__ == "__main__":
    asyncio.run(check_types())
