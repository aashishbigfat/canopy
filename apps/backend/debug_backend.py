import asyncio
import sys
import os
from bson import ObjectId

# Add project root to path
sys.path.append(os.getcwd())

from app.db.mongodb import init_db
from app.models.user import User
from app.models.role import Role
from app.models.dashboard import Dashboard

async def debug_backend():
    print("🔍 Backend Debugging Script")
    print("=" * 40)
    
    try:
        await init_db()
    except Exception as e:
        print(f"❌ Error connecting to DB: {e}")
        return

    email = "admin@tutterfly.com"
    user = await User.find_one(User.email == email)
    
    if not user:
        print(f"❌ User {email} not found.")
        return
    
    print(f"User: {user.name} ({user.email})")
    print(f"ID: {user.id}")
    print(f"Tenant ID: {user.tenant_id}")
    print(f"Role IDs: {user.role_ids}")
    
    print("\n--- Roles ---")
    for rid in user.role_ids:
        role = await Role.get(rid)
        if role:
            print(f"Role: {role.name}")
            print(f"Permissions: {len(role.permissions)} permissions total.")
            print(f"Has 'view_task': {'view_task' in role.permissions}")
        else:
            print(f"❌ Role ID {rid} NOT FOUND in DB!")

    print("\n--- Permission Test ---")
    has_view_task = await user.has_permission("view_task")
    print(f"user.has_permission('view_task'): {has_view_task}")

    print("\n--- Dashboards ---")
    dashboards = await Dashboard.find(Dashboard.owner_id == str(user.id)).to_list()
    if not dashboards:
        dashboards = await Dashboard.find(Dashboard.created_by == str(user.id)).to_list()
    
    print(f"Total dashboards for user: {len(dashboards)}")
    for d in dashboards:
        print(f"- {d.name} (ID: {d.id}, Default: {d.is_default}, Tenant: {d.tenant_id})")

    default_dash = await Dashboard.find_one(
        Dashboard.owner_id == str(user.id),
        Dashboard.is_default == True
    )
    if not default_dash:
        default_dash = await Dashboard.find_one(
            Dashboard.tenant_id == user.tenant_id,
            Dashboard.is_default == True
        )
    print(f"\nDefault dashboard found: {default_dash.name if default_dash else 'NONE'}")

if __name__ == "__main__":
    asyncio.run(debug_backend())
