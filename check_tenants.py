import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def check_tenants():
    url = "mongodb+srv://bigfatailabs_db_user:pT8nQsJrBCrw6SFp@bigfat1.fun2kxb.mongodb.net/tutterfly_crm?retryWrites=true&w=majority&appName=BigFatAIProducts"
    client = AsyncIOMotorClient(url)
    db = client.get_default_database()
    
    acc_id = ObjectId("69902ee044d98e48c3b4f165")
    opp_id = ObjectId("69902ee044d98e48c3b4f168")
    
    acc = await db.accounts.find_one({"_id": acc_id})
    opp = await db.opportunities.find_one({"_id": opp_id})
    
    if acc and opp:
        print(f"Account Tenant: {acc.get('tenant_id')} ({type(acc.get('tenant_id'))})")
        print(f"Opportunity Tenant: {opp.get('tenant_id')} ({type(opp.get('tenant_id'))})")
        print(f"Account ID in Opp: {opp.get('account_id')} ({type(opp.get('account_id'))})")
        
        # Test the query manually
        query = {
            "account_id": acc_id,
            "tenant_id": acc.get('tenant_id'),
            "deleted_at": None
        }
        count = await db.opportunities.count_documents(query)
        print(f"Query match count: {count}")
    else:
        print(f"Acc found: {acc is not None}, Opp found: {opp is not None}")

if __name__ == "__main__":
    asyncio.run(check_tenants())
