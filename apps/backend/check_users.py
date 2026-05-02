
import asyncio
from app.models.user import User
from app.db.mongodb import init_db
from bson import ObjectId

async def check():
    await init_db()
    users = await User.find_all().to_list()
    print("USERS IN SYSTEM:")
    for u in users:
        print(f"{u.id}: {u.name} ({u.email})")
    
    # Also check a specific account mentioned in summary: 69ef969423b1cf15ab12584a
    from app.models.account import Account
    acc_id = "69ef969423b1cf15ab12584a"
    acc = await Account.get(ObjectId(acc_id))
    if acc:
        print(f"\nACCOUNT {acc_id}:")
        print(f"Name: {acc.name}")
        print(f"Owner ID: {acc.owner_id}")
        owner = await User.get(acc.owner_id)
        print(f"Owner Name from DB: {owner.name if owner else 'NOT FOUND'}")
    else:
        print(f"\nACCOUNT {acc_id} NOT FOUND")

if __name__ == "__main__":
    asyncio.run(check())
