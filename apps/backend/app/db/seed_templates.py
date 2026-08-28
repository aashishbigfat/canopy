import asyncio
import sys
import os

# Add the app directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.models.template import Template
from app.models.tenant import Tenant
from app.models.user import User
from app.core.config import settings
from app.db.mongodb import init_db

async def seed_templates():
    """Seed requested email templates for the first available tenant"""
    print("🚀 Initializing database for template seeding...")
    await init_db()
    
    # Get first tenant
    tenant = await Tenant.find_one()
    if not tenant:
        print("❌ No tenant found in database. Please create a tenant first.")
        return
    
    # Get first user of that tenant
    user = await User.find_one({"tenant_id": tenant.id, "is_active": True})
    if not user:
        # Fallback to any user
        user = await User.find_one()
        if not user:
            print("❌ No user found in database. Please create a user first.")
            return

    print(f"✅ Seeding templates for Tenant: {tenant.company_name} ({tenant.id}) and Owner: {user.email} ({user.id})")

    templates_to_seed = [
        "Proposal B2C",
        "First Response B2C",
        "First Response B2B",
        "Proposal B2B",
        "Booking Confirmation B2C",
        "Booking Confirmation B2B",
        "Document Collection B2C",
        "Documents Handover B2C",
        "Documents Handover B2B",
        "Document Collection B2B",
        "Visa Update B2C",
        "Visa Update B2B",
        "Payment Procedure And Terms B2C",
        "Payment Procedure And Terms B2B",
        "Website and Social Handles",
        "Account Manager Intro"
    ]

    for name in templates_to_seed:
        # Check if already exists
        existing = await Template.find_one({
            "name": name,
            "tenant_id": tenant.id,
            "deleted_at": None
        })
        
        if existing:
            print(f"⚠️ Template already exists: {name}")
            continue
            
        template = Template(
            name=name,
            body=f"<p>Hello, this is a placeholder for <strong>{name}</strong> template.</p>",
            subject=f"{name} - Tutterfly CRM",
            type="email",
            tenant_id=tenant.id,
            created_by=user.id,
            is_active=True
        )
        await template.insert()
        print(f"✅ Created template: {name}")

    print("🎉 Template seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_templates())
