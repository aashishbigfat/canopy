#!/usr/bin/env python3
"""
Add supplier permissions to admin role
"""
import asyncio
from app.models.role import Role
from app.db.mongodb import init_db

async def add_supplier_permissions():
    """Add supplier permissions to admin role"""
    
    # Initialize database
    await init_db()
    
    print("🔧 Adding supplier permissions to admin role...")
    
    # Get admin role
    admin_role = await Role.find_one({"name": "admin"})
    
    if not admin_role:
        print("❌ Admin role not found")
        return
    
    print(f"🎭 Current admin role permissions: {len(admin_role.permissions)}")
    
    # Supplier permissions to add
    supplier_permissions = [
        "create_supplier",
        "view_supplier", 
        "edit_supplier",
        "delete_supplier"
    ]
    
    # Add missing supplier permissions
    updated = False
    for perm in supplier_permissions:
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
        print(f"\n✅ All supplier permissions already exist")
    
    # Show final permissions
    print(f"\n📋 Final admin role permissions:")
    for perm in sorted(admin_role.permissions):
        print(f"   - {perm}")

if __name__ == "__main__":
    asyncio.run(add_supplier_permissions())
