import asyncio
import os
import sys

# Setup imports
sys.path.append('d:/tutterfly/apps/backend')

from app.db.mongodb import get_database
from beanie import init_beanie
from app.models.role import Role

async def fix():
    db = await get_database()
    models = [Role]
    await init_beanie(database=db, document_models=models)
    
    # Fix 'admin' and 'Super Admin'
    roles_fixed = 0
    roles = await Role.find({"name": {"$in": ["admin", "Super Admin"]}}).to_list()
    for r in roles:
        r.is_admin = True
        await r.save()
        print(f"Fixed Role: {r.name} -> is_admin=True")
        roles_fixed += 1
        
    print(f"Total fixed: {roles_fixed}")

if __name__ == "__main__":
    asyncio.run(fix())
