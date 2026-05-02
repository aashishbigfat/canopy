import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.account import Account
from app.models.user import User
from app.core.config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    await init_beanie(
        database=db,
        document_models=[Account, User]
    )
    
    # Let's get all users
    users = await User.find().to_list()
    print(f"Users in DB: {len(users)}")
    for u in users:
        print(f" - {u.id}: {u.name} (Tenant: {u.tenant_id})")
        
    account_id = "69ef969423b1cf15ab12584a"
    try:
        from bson import ObjectId
        a = await Account.get(ObjectId(account_id))
        if a:
            owner = await User.get(a.owner_id)
            owner_name = owner.name if owner else "None"
            print(f"\nSpecific Account {a.id} ({a.name}): Owner ID {a.owner_id} -> {owner_name}")
        else:
            print(f"\nAccount {account_id} not found!")
    except Exception as e:
        print(f"\nError fetching specific account: {e}")

if __name__ == "__main__":
    asyncio.run(main())
