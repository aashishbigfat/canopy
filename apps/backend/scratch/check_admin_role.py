import asyncio
import os
import sys

# Setup imports
sys.path.append('d:/tutterfly/apps/backend')

from app.db.mongodb import get_database
from beanie import init_beanie
from app.models.opportunity import Opportunity
from app.models.user import User
from app.models.role import Role

async def check():
    db = await get_database()
    models = [Opportunity, User, Role]
    await init_beanie(database=db, document_models=models)
    
    admin = await User.find_one({"email": 'admin@tutterfly.com'})
    print(f"Admin User ID: {admin.id}")
    print(f"Admin User role_ids: {admin.role_ids}")
    
    for rid in admin.role_ids:
        r = await Role.get(rid)
        if r:
            print(f"Role {r.name}: is_admin={r.is_admin}")
        else:
            print(f"Role {rid} NOT FOUND in DB!")

if __name__ == "__main__":
    asyncio.run(check())
