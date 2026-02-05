#!/usr/bin/env python3
"""
Add file permissions to admin role
"""
import asyncio
from app.models.role import Role
from app.db.mongodb import init_db

async def add_file_permissions():
    """Add file permissions to admin role"""
    
    # Initialize database
    await init_db()
    
    print("🔧 Adding file permissions to admin role...")
    
    # Get admin role
    admin_role = await Role.find_one({"name": "admin"})
    
    if not admin_role:
        print("❌ Admin role not found")
        return
    
    print(f"🎭 Current admin role permissions: {len(admin_role.permissions)}")
    
    # File permissions to add
    file_permissions = [
        "upload_file",
        "download_file",
        "delete_file"
    ]
    
    # Add missing file permissions
    updated = False
    for perm in file_permissions:
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
        print(f"\n✅ All file permissions already exist")
    
    # Show final permissions
    print(f"\n📋 Final admin role permissions:")
    for perm in sorted(admin_role.permissions):
        print(f"   - {perm}")

if __name__ == "__main__":
    asyncio.run(add_file_permissions())
