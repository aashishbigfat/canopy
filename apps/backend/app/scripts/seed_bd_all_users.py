"""Seed BD visits for ALL active users in the tenant, not just admin."""
import asyncio
import random
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def seed():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]

    tenant = await db["tenants"].find_one({"is_active": True})
    if not tenant:
        print("No active tenant")
        return
    tenant_id = tenant["_id"]

    # Get all active users
    users = await db["users"].find(
        {"tenant_id": tenant_id, "is_active": True, "deleted_at": None}
    ).to_list(50)

    # Get leads as parents
    leads = await db["leads"].find(
        {"tenant_id": tenant_id, "deleted_at": None}
    ).limit(5).to_list(5)

    if not leads:
        print("No leads found - run seed_bd_dummy_data.py first")
        return

    # Get activity types
    types = await db["picklists"].find(
        {"picklist_type": "bd_activity_type", "is_active": True}
    ).to_list(10)

    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    admin_id = ObjectId("69695c5bf4e00c00af79d14a")  # admin user (manager)
    
    total_inserted = 0
    for user in users:
        uid = user["_id"]
        if uid == admin_id:
            # Admin already has 12 visits
            continue

        # Check if user already has visits
        existing = await db["bd_visits"].count_documents(
            {"owner_id": uid, "tenant_id": tenant_id, "deleted_at": None}
        )
        if existing > 0:
            print(f"  {user.get('email')} already has {existing} visits, skipping.")
            continue

        # Create 6 visits per user
        templates = [
            {"title": f"Site visit - {user.get('name','BD')}", "days": 0, "hour": 10, "status": "planned", "approval": "approved"},
            {"title": f"Follow-up call - {user.get('name','BD')}", "days": 0, "hour": 14, "status": "approved", "approval": "not_required"},
            {"title": f"Product demo - {user.get('name','BD')}", "days": -1, "hour": 11, "status": "completed", "approval": "approved"},
            {"title": f"Client meeting - {user.get('name','BD')}", "days": -2, "hour": 10, "status": "completed", "approval": "approved"},
            {"title": f"Territory exploration - {user.get('name','BD')}", "days": 1, "hour": 10, "status": "planned", "approval": "pending"},
            {"title": f"Quarterly review - {user.get('name','BD')}", "days": -3, "hour": 14, "status": "completed", "approval": "approved"},
        ]

        for i, tpl in enumerate(templates):
            lead = leads[i % len(leads)]
            act_type = types[i % len(types)] if types else None
            sched = today + timedelta(days=tpl["days"], hours=tpl["hour"])

            doc = {
                "bd_visitable_type": "Lead",
                "bd_visitable_id": lead["_id"],
                "activity_type_id": act_type["_id"] if act_type else None,
                "activity_type_name": act_type["name"] if act_type else None,
                "title": tpl["title"],
                "description": f"Seeded visit for {user.get('email')}",
                "scheduled_date": sched,
                "scheduled_duration_min": random.choice([30, 45, 60]),
                "status": tpl["status"],
                "approval_status": tpl["approval"],
                "approved_by": admin_id if tpl["approval"] == "approved" else None,
                "approved_at": sched - timedelta(hours=2) if tpl["approval"] == "approved" else None,
                "check_in_at": sched + timedelta(minutes=5) if tpl["status"] in ("in_progress", "completed") else None,
                "check_in_lat": 19.076 + random.uniform(-0.05, 0.05) if tpl["status"] in ("in_progress", "completed") else None,
                "check_in_lng": 72.877 + random.uniform(-0.05, 0.05) if tpl["status"] in ("in_progress", "completed") else None,
                "check_out_at": sched + timedelta(hours=1, minutes=30) if tpl["status"] == "completed" else None,
                "outcome": random.choice(["successful", "deal_progressed"]) if tpl["status"] == "completed" else None,
                "outcome_notes": "Progress made." if tpl["status"] == "completed" else None,
                "address_snapshot": {"city": lead.get("city"), "state": lead.get("state"), "country": lead.get("country")},
                "owner_id": uid,
                "reporting_manager_id": admin_id,
                "created_by": uid,
                "tenant_id": tenant_id,
                "expense_ids": [],
                "photo_file_ids": [],
                "industry_data": {},
                "created_at": sched - timedelta(days=1),
                "updated_at": sched,
                "deleted_at": None,
            }
            await db["bd_visits"].insert_one(doc)
            total_inserted += 1

        # Also seed 3 expenses per user
        for j, etpl in enumerate([
            {"title": f"Cab fare - {user.get('name','BD')}", "amount": 350, "cat": "Travel", "status": "submitted"},
            {"title": f"Client lunch - {user.get('name','BD')}", "amount": 900, "cat": "Meals", "status": "draft"},
            {"title": f"Hotel stay - {user.get('name','BD')}", "amount": 2500, "cat": "Accommodation", "status": "approved"},
        ]):
            incurred = now - timedelta(days=random.randint(0, 4))
            await db["expenses"].insert_one({
                "title": etpl["title"],
                "description": f"Seeded expense for {user.get('email')}",
                "amount": etpl["amount"],
                "currency": "INR",
                "incurred_at": incurred,
                "category_name": etpl["cat"],
                "status": etpl["status"],
                "submitted_at": incurred + timedelta(hours=1) if etpl["status"] != "draft" else None,
                "approved_by": admin_id if etpl["status"] == "approved" else None,
                "approved_at": incurred + timedelta(days=1) if etpl["status"] == "approved" else None,
                "reporting_manager_id": admin_id,
                "owner_id": uid,
                "created_by": uid,
                "tenant_id": tenant_id,
                "receipt_file_ids": [],
                "industry_data": {},
                "created_at": incurred,
                "updated_at": incurred,
                "deleted_at": None,
            })

        print(f"  ✔ Seeded 6 visits + 3 expenses for {user.get('email')}")

    total_visits = await db["bd_visits"].count_documents({"tenant_id": tenant_id, "deleted_at": None})
    total_expenses = await db["expenses"].count_documents({"tenant_id": tenant_id, "deleted_at": None})
    print(f"\nTotal visits: {total_visits}, Total expenses: {total_expenses}")
    client.close()

asyncio.run(seed())
