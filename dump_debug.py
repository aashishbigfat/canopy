import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import json
from datetime import datetime

async def dump_data():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["tutterfly_crm"] # Based on common pattern in this project
    
    # Account ID from screenshot
    account_id = "69902ee044d98e48c3b4f165"
    # Opportunity ID from screenshot 
    opportunity_id = "69902ee044d98e48c3b4f168"
    
    print(f"--- Account {account_id} ---")
    account = await db.accounts.find_one({"_id": ObjectId(account_id)})
    if account:
        account["_id"] = str(account["_id"])
        # Convert any other ObjectIds
        for k, v in account.items():
            if isinstance(v, ObjectId): account[k] = str(v)
            if isinstance(v, datetime): account[k] = v.isoformat()
        print(json.dumps(account, indent=2))
    else:
        print("Account not found")
        
    print(f"\n--- Opportunity {opportunity_id} ---")
    opportunity = await db.opportunities.find_one({"_id": ObjectId(opportunity_id)})
    if opportunity:
        opportunity["_id"] = str(opportunity["_id"])
        for k, v in opportunity.items():
            if isinstance(v, ObjectId): opportunity[k] = str(v)
            if isinstance(v, list):
                opportunity[k] = [str(x) if isinstance(x, ObjectId) else x for x in v]
            if isinstance(v, datetime): opportunity[k] = v.isoformat()
        print(json.dumps(opportunity, indent=2))
    else:
        print("Opportunity not found")
        
    print(f"\n--- Opportunities linked to account {account_id} ---")
    async for opp in db.opportunities.find({"account_id": ObjectId(account_id)}):
        opp["_id"] = str(opp["_id"])
        print(f"ID: {opp['_id']}, Name: {opp.get('name')}")

    print(f"\n--- AccountContact pivot for account {account_id} ---")
    async for pivot in db.account_contacts.find({"account_id": ObjectId(account_id)}):
        pivot["_id"] = str(pivot["_id"])
        for k, v in pivot.items():
            if isinstance(v, ObjectId): pivot[k] = str(v)
        print(json.dumps(pivot, indent=2))

if __name__ == "__main__":
    asyncio.run(dump_data())
