import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import json

async def list_opps():
    url = "mongodb+srv://bigfatailabs_db_user:pT8nQsJrBCrw6SFp@bigfat1.fun2kxb.mongodb.net/tutterfly_crm?retryWrites=true&w=majority&appName=BigFatAIProducts"
    client = AsyncIOMotorClient(url)
    db = client.get_default_database()
    
    print(f"Connected to: {db.name}")
    
    print("\nListing last 5 opportunities:")
    async for opp in db.opportunities.find().sort("created_at", -1).limit(5):
        opp_id = str(opp["_id"])
        name = opp.get("name")
        acc_id = opp.get("account_id")
        acc_id_type = str(type(acc_id))
        print(f"Opp: {name} ({opp_id}) | AccountID: {acc_id} | Type: {acc_id_type}")

    print("\nListing last 5 accounts:")
    async for acc in db.accounts.find().sort("created_at", -1).limit(5):
        acc_id = str(acc["_id"])
        name = acc.get("name")
        print(f"Acc: {name} ({acc_id})")

if __name__ == "__main__":
    asyncio.run(list_opps())
