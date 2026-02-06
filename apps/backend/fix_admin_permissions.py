import asyncio
import sys
import os
from bson import ObjectId

# Add project root to path
sys.path.append(os.getcwd())

from app.db.mongodb import init_db
from app.models.user import User
from app.models.role import Role
from app.services.role_service import RoleService, ALL_PERMISSIONS
from app.services.dashboard_service import dashboard_service
from app.schemas.dashboard import DashboardCreate

async def fix_admin():
    print("🚀 Starting Backend Fix Script")
    print("=" * 40)
    
    try:
        await init_db()
    except Exception as e:
        print(f"❌ Error connecting to DB: {e}")
        return

    email = "admin@tutterfly.com"
    user = await User.find_one(User.email == email)
    
    if not user:
        print(f"❌ User {email} not found. Please run create_admin.py first.")
        return
    
    print(f"✅ Found user: {user.name} ({user.email})")
    
    # 1. Create Super Admin Role
    role_name = "Super Admin"
    existing_role = await Role.find_one(
        Role.name == role_name, 
        Role.tenant_id == user.tenant_id
    )
    
    if not existing_role:
        print(f"Creating '{role_name}' role...")
        new_role = Role(
            name=role_name,
            display_name="Super Administrator",
            description="Full access to all modules and settings",
            permissions=ALL_PERMISSIONS,
            tenant_id=user.tenant_id,
            is_system=True
        )
        await new_role.insert()
        role_id = new_role.id
        print(f"✅ Created Super Admin role: {role_id}")
    else:
        role_id = existing_role.id
        print(f"✅ Using existing Super Admin role: {role_id}")
        # Ensure all permissions are present
        if set(existing_role.permissions) != set(ALL_PERMISSIONS):
            print("Updating permissions for Super Admin role...")
            existing_role.permissions = list(set(existing_role.permissions) | set(ALL_PERMISSIONS))
            await existing_role.save()
            print("✅ Permissions updated.")

    # 2. Assign Role to User
    if role_id not in user.role_ids:
        print(f"Assigning '{role_name}' role to {user.email}...")
        user.role_ids.append(role_id)
        await user.save()
        print("✅ Role assigned successfully!")
    else:
        print(f"✅ User already has '{role_name}' role.")

    # 3. Create Default Dashboard
    print("\n🌍 Checking Default Dashboard")
    existing_dashboard = await dashboard_service.get_default_dashboard(
        user_id=str(user.id),
        tenant_id=str(user.tenant_id)
    )
    
    if not existing_dashboard:
        print("Creating default dashboard...")
        default_dashboard_data = DashboardCreate(
            name="Default Dashboard",
            description="Overview of your business activities",
            layout="grid",
            columns=3,
            widgets=[
                {
                    "widget_id": "revenue_widget",
                    "position": {"x": 0, "y": 0, "w": 2, "h": 1}
                },
                {
                    "widget_id": "sales_pipeline_widget",
                    "position": {"x": 2, "y": 0, "w": 1, "h": 1}
                },
                {
                    "widget_id": "recent_activities_widget",
                    "position": {"x": 0, "y": 1, "w": 3, "h": 1}
                }
            ],
            is_public=False
        )
        
        dashboard = await dashboard_service.create_dashboard(
            data=default_dashboard_data,
            user_id=str(user.id),
            tenant_id=str(user.tenant_id)
        )
        dashboard.is_default = True
        await dashboard.save()
        print(f"✅ Created default dashboard: {dashboard.id}")
    else:
        print(f"✅ User already has a default dashboard: {existing_dashboard.id}")

    print("\n🎉 All fixes applied successfully!")

if __name__ == "__main__":
    asyncio.run(fix_admin())
