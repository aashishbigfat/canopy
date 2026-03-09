import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.models.account import Account
from app.models.contact import Contact
from app.models.user import User

async def main():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["tutterfly"]
    await init_beanie(database=db, document_models=[Account, Contact, User])
    
    domain = "bigfatailabs.com"
    account = await Account.find_one({
        "deleted_at": None,
        "website": {"$regex": domain, "$options": "i"}
    })
    
    print(f"Finding by regex: {account.name if account else None}")
    
    all_accounts = await Account.find_all().to_list()
    for acc in all_accounts:
        print(f"Account: {acc.name}, Website: {acc.website}, ID: {acc.id}")

if __name__ == "__main__":
    asyncio.run(main())
