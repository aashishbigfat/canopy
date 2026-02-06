import asyncio
import sys
import os
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime

# Load env
from dotenv import load_dotenv
load_dotenv()

# Add project root to path
sys.path.append(os.getcwd())
from app.core.config import settings

async def final_fix():
    print("🚀 Final Backend Implementation & Fix")
    print("=" * 40)
    
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    # 1. Get Admin User
    user = await db.users.find_one({"email": "admin@tutterfly.com"})
    if not user:
        print("❌ Admin user not found!")
        return
    
    user_id = user["_id"]
    tenant_id = user["tenant_id"]
    print(f"✅ Found Admin User: {user_id}, Tenant: {tenant_id}")

    # 2. Ensure Super Admin Role exists with all permissions
    from app.services.role_service import ALL_PERMISSIONS
    
    role_name = "Super Admin"
    role = await db.roles.find_one({"name": role_name, "tenant_id": tenant_id})
    
    if not role:
        print("Creating Super Admin role...")
        role_doc = {
            "name": role_name,
            "display_name": "Super Administrator",
            "description": "Full access to all modules",
            "permissions": ALL_PERMISSIONS,
            "tenant_id": tenant_id,
            "is_system": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        res = await db.roles.insert_one(role_doc)
        role_id = res.inserted_id
        print(f"✅ Created Role: {role_id}")
    else:
        role_id = role["_id"]
        print(f"✅ Found Role: {role_id}")
        await db.roles.update_one(
            {"_id": role_id},
            {"$set": {"permissions": ALL_PERMISSIONS, "updated_at": datetime.utcnow()}}
        )

    # 3. Assign Role to User (Ensure it's an ObjectId)
    if role_id not in user.get("role_ids", []):
        print("Assigning role to user...")
        await db.users.update_one(
            {"_id": user_id},
            {"$addToSet": {"role_ids": role_id}}
        )
        print("✅ Role assigned.")
    else:
        print("✅ User already has the role.")

    # 4. Create Dashboard Widgets
    print("\n📦 Implementing Dashboard Widgets...")
    widgets_to_create = [
        {
            "widget_id": "revenue_widget",
            "name": "Revenue Overview",
            "widget_type": "chart",
            "entity_type": "opportunities",
            "chart_type": "line",
            "time_range": "this_year"
        },
        {
            "widget_id": "sales_pipeline_widget",
            "name": "Sales Pipeline",
            "widget_type": "chart",
            "entity_type": "opportunities",
            "group_by": "stage",
            "chart_type": "funnel"
        },
        {
            "widget_id": "recent_activities_widget",
            "name": "Recent Activities",
            "widget_type": "list",
            "entity_type": "leads"
        }
    ]
    
    widget_ids_map = {}
    for w_def in widgets_to_create:
        w_id_slug = w_def.pop("widget_id")
        existing_w = await db.dashboard_widgets.find_one({"name": w_def["name"], "tenant_id": tenant_id})
        if not existing_w:
            w_def.update({
                "tenant_id": tenant_id,
                "created_by": str(user_id),
                "owner_id": str(user_id),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
            res = await db.dashboard_widgets.insert_one(w_def)
            widget_ids_map[w_id_slug] = str(res.inserted_id)
            print(f"✅ Created Widget: {w_def['name']}")
        else:
            widget_ids_map[w_id_slug] = str(existing_w["_id"])
            print(f"✅ Found Widget: {existing_w['name']}")

    # 5. Create Default Dashboard
    print("\n🌍 Implementing Default Dashboard...")
    dashboard_name = "Default Dashboard"
    
    # Remove old default dashboards to be safe
    await db.dashboards.delete_many({"tenant_id": tenant_id, "name": dashboard_name})
    
    dashboard_doc = {
        "name": dashboard_name,
        "description": "Standard overview for Tutterfly CRM",
        "layout": "grid",
        "columns": 3,
        "widgets": [
            {"widget_id": widget_ids_map["revenue_widget"], "position": {"x": 0, "y": 0, "w": 2, "h": 1}},
            {"widget_id": widget_ids_map["sales_pipeline_widget"], "position": {"x": 2, "y": 0, "w": 1, "h": 1}},
            {"widget_id": widget_ids_map["recent_activities_widget"], "position": {"x": 0, "y": 1, "w": 3, "h": 1}}
        ],
        "is_default": True,
        "is_public": False,
        "created_by": str(user_id),
        "owner_id": str(user_id),
        "tenant_id": tenant_id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    res = await db.dashboards.insert_one(dashboard_doc)
    print(f"✅ Created Default Dashboard: {res.inserted_id}")

    # 6. Create some dummy tasks to show
    print("\n📝 Creating Dummy Tasks...")
    tasks_to_create = [
        {"title": "Follow up with New Leads", "priority": "high", "status": "pending"},
        {"title": "Prepare Monthly Sales Report", "priority": "medium", "status": "pending"},
        {"title": "Client Meeting: Tutterfly HQ", "priority": "high", "status": "pending"}
    ]
    
    for t in tasks_to_create:
        existing_t = await db.tasks.find_one({"title": t["title"], "tenant_id": tenant_id})
        if not existing_t:
            t.update({
                "tenant_id": tenant_id,
                "created_by": user_id,
                "assigned_to": user_id,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
            await db.tasks.insert_one(t)
            print(f"✅ Created Task: {t['title']}")

    print("\n🎉 Backend Implementation Complete!")
    client.close()

if __name__ == "__main__":
    asyncio.run(final_fix())
