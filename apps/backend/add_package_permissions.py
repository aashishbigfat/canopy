#!/usr/bin/env python3
"""
Add package permissions to admin role
"""
import asyncio
from app.models.role import Role
from app.db.mongodb import init_db

async def add_package_permissions():
    """Add package permissions to admin role"""
    
    # Initialize database
    await init_db()
    
    print("🔧 Adding package permissions to admin role...")
    
    # Get admin role
    admin_role = await Role.find_one({"name": "admin"})
    
    if not admin_role:
        print("❌ Admin role not found")
        return
    
    print(f"🎭 Current admin role permissions: {len(admin_role.permissions)}")
    
    # Package permissions to add
    package_permissions = [
        "create_package",
        "view_package", 
        "edit_package",
        "delete_package",
        "manage_package_pricing",
        "feature_package"
    ]
    
    # Add missing package permissions
    updated = False
    for perm in package_permissions:
        if perm not in admin_role.permissions:
            admin_role.permissions.append(perm)
            updated = True
            print(f"   ✅ Added: {perm}")
        else:
            print(f"   ✅ Already exists: {perm}")
    
    if updated:
        await admin_role.save()
        print(f"\n🎉 Admin role updated successfully!")
        print(f"   Total permissions: {len(admin_role.permissions)}")
    else:
        print(f"\n✅ All package permissions already exist")
    
    # Show final permissions
    print(f"\n📋 Final admin role permissions:")
    for perm in sorted(admin_role.permissions):
        print(f"   - {perm}")

if __name__ == "__main__":
    asyncio.run(add_package_permissions())
