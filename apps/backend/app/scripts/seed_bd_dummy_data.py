"""
BD Panel — Dummy Data Seeder for Development & Testing

Seeds realistic BD visits, expenses, and BD activity types so the BD Panel
pages (/bd, /bd/visits, /bd/approvals, /bd/expenses) render with useful data.

Usage:
    cd apps/backend
    python -m app.scripts.seed_bd_dummy_data

Requirements:
    - At least one active user and one lead must exist for the tenant.
    - The script auto-detects the first tenant and user it can find.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
import asyncio
import random

from bson import ObjectId


async def seed_bd_data():
    """Insert dummy BD visits, expenses, and activity type picklists."""
    from motor.motor_asyncio import AsyncIOMotorClient
    from app.core.config import settings

    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]

    print("=" * 60)
    print("  BD PANEL — DUMMY DATA SEEDER")
    print("=" * 60)

    # ── 1. Discover tenant + users ──────────────────────────────────
    tenant = await db["tenants"].find_one({"is_active": True})
    if not tenant:
        print("  ✖ No active tenant found. Run initial setup first.")
        client.close()
        return

    tenant_id = tenant["_id"]
    print(f"\n  Tenant: {tenant.get('company_name', tenant_id)}")

    users = await db["users"].find(
        {"tenant_id": tenant_id, "is_active": True, "deleted_at": None}
    ).to_list(10)
    if not users:
        print("  ✖ No active users found for this tenant.")
        client.close()
        return

    bd_user = users[0]
    manager_user = users[1] if len(users) > 1 else users[0]
    bd_user_id = bd_user["_id"]
    manager_id = manager_user["_id"]
    print(f"  BD User:  {bd_user.get('name', bd_user_id)} ({bd_user.get('email')})")
    print(f"  Manager:  {manager_user.get('name', manager_id)} ({manager_user.get('email')})")

    # ── 2. Find or create leads as visit parents ──────────────────────
    leads = await db["leads"].find(
        {"tenant_id": tenant_id, "deleted_at": None}
    ).limit(5).to_list(5)

    if not leads:
        print("\n  Creating 5 dummy leads as visit parents...")
        now = datetime.now(timezone.utc)
        dummy_leads = [
            {
                "first_name": fn, "last_name": ln, "email": em,
                "phone": ph, "company": co,
                "city": ct, "state": st, "country": "India", "zip": zp,
                "tenant_id": tenant_id, "owner_id": bd_user_id, "created_by": bd_user_id,
                "bd_owner_id": bd_user_id, "reporting_manager_id": manager_id,
                "created_at": now, "updated_at": now, "deleted_at": None,
                "custom_fields": {}, "industry_data": {},
                "is_converted": False, "view_count": 0, "is_favorite": False,
                "segment": "B2C", "creation_type": "manual",
            }
            for fn, ln, em, ph, co, ct, st, zp in [
                ("Rahul",  "Sharma",  "rahul.sharma@example.com",  "+91-9876543210", "TechCorp Solutions",   "Mumbai",    "Maharashtra", "400001"),
                ("Priya",  "Patel",   "priya.patel@example.com",   "+91-9876543211", "GreenLeaf Exports",    "Ahmedabad", "Gujarat",     "380001"),
                ("Vikram", "Singh",   "vikram.singh@example.com",  "+91-9876543212", "Singh Enterprises",    "Delhi",     "Delhi",       "110001"),
                ("Anita",  "Reddy",   "anita.reddy@example.com",   "+91-9876543213", "Reddy Pharmaceuticals","Hyderabad", "Telangana",   "500001"),
                ("Karan",  "Mehta",   "karan.mehta@example.com",   "+91-9876543214", "Mehta Industries",     "Pune",      "Maharashtra", "411001"),
            ]
        ]
        result = await db["leads"].insert_many(dummy_leads)
        leads = await db["leads"].find({"_id": {"$in": result.inserted_ids}}).to_list(5)
        print(f"  ✔ Created {len(leads)} dummy leads.")
    else:
        print(f"\n  Found {len(leads)} existing leads to use as visit parents.")

    # ── 3. Seed BD Activity Type picklists ───────────────────────────
    activity_types = [
        {"name": "Site Visit",       "requires_approval": True},
        {"name": "Product Demo",     "requires_approval": True},
        {"name": "Follow-up Call",   "requires_approval": False},
        {"name": "Contract Review",  "requires_approval": True},
        {"name": "Quick Check-in",   "requires_approval": False},
    ]
    inserted_types = 0
    type_ids = []
    for at in activity_types:
        existing = await db["picklists"].find_one({
            "name": at["name"], "picklist_type": "bd_activity_type",
            "$or": [{"tenant_id": tenant_id}, {"tenant_id": None}],
        })
        if existing:
            type_ids.append(existing["_id"])
        else:
            doc = {
                "picklist_type": "bd_activity_type",
                "_class_id": "BasePicklist.BDActivityType",
                "name": at["name"],
                "requires_approval": at["requires_approval"],
                "is_active": True, "is_default": False,
                "tenant_id": tenant_id,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
            res = await db["picklists"].insert_one(doc)
            type_ids.append(res.inserted_id)
            inserted_types += 1
    print(f"\n  BD Activity Types: {inserted_types} new, {len(type_ids) - inserted_types} existing.")

    # ── 4. Seed BD Visits ────────────────────────────────────────────
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    visit_templates = [
        # Today's planned visits
        {"title": "Site inspection at TechCorp office",   "days_offset": 0, "hour": 10, "status": "planned",     "approval": "approved"},
        {"title": "Product demo for GreenLeaf team",      "days_offset": 0, "hour": 14, "status": "planned",     "approval": "pending"},
        {"title": "Follow-up meeting with Singh",         "days_offset": 0, "hour": 16, "status": "approved",    "approval": "approved"},
        # Yesterday completed
        {"title": "Contract negotiation at Reddy Pharma", "days_offset": -1, "hour": 11, "status": "completed",  "approval": "approved"},
        {"title": "Quick check-in with Mehta Industries", "days_offset": -1, "hour": 15, "status": "completed",  "approval": "not_required"},
        # Past week
        {"title": "Initial site survey — TechCorp",       "days_offset": -2, "hour": 10, "status": "completed",  "approval": "approved"},
        {"title": "Product showcase for Patel group",     "days_offset": -3, "hour": 11, "status": "completed",  "approval": "approved"},
        {"title": "Quarterly review at Singh HQ",         "days_offset": -4, "hour": 14, "status": "completed",  "approval": "approved"},
        {"title": "Compliance audit — Reddy",             "days_offset": -5, "hour": 10, "status": "completed",  "approval": "approved"},
        {"title": "Partnership discussion — Mehta",       "days_offset": -6, "hour": 13, "status": "completed",  "approval": "approved"},
        # Pending approval (for /bd/approvals tab)
        {"title": "New territory exploration — Jaipur",   "days_offset": 1,  "hour": 10, "status": "planned",    "approval": "pending"},
        {"title": "Client onboarding visit — Lucknow",   "days_offset": 2,  "hour": 11, "status": "planned",    "approval": "pending"},
    ]

    inserted_visits = 0
    visit_ids = []
    for i, tpl in enumerate(visit_templates):
        lead = leads[i % len(leads)]
        act_type_id = type_ids[i % len(type_ids)]
        act_type_name = activity_types[i % len(type_ids)]["name"]
        sched = today + timedelta(days=tpl["days_offset"], hours=tpl["hour"])

        visit_doc = {
            "bd_visitable_type": "Lead",
            "bd_visitable_id": lead["_id"],
            "activity_type_id": act_type_id,
            "activity_type_name": act_type_name,
            "title": tpl["title"],
            "description": f"Dummy visit for testing the BD Panel. Lead: {lead.get('first_name', '')} {lead.get('last_name', '')}",
            "scheduled_date": sched,
            "scheduled_duration_min": random.choice([30, 45, 60, 90]),
            "status": tpl["status"],
            "approval_status": tpl["approval"],
            "approved_by": manager_id if tpl["approval"] == "approved" else None,
            "approved_at": sched - timedelta(hours=2) if tpl["approval"] == "approved" else None,
            "check_in_at": sched + timedelta(minutes=5) if tpl["status"] in ("in_progress", "completed") else None,
            "check_in_lat": 19.076 + random.uniform(-0.05, 0.05) if tpl["status"] in ("in_progress", "completed") else None,
            "check_in_lng": 72.877 + random.uniform(-0.05, 0.05) if tpl["status"] in ("in_progress", "completed") else None,
            "check_out_at": sched + timedelta(hours=1, minutes=30) if tpl["status"] == "completed" else None,
            "check_out_lat": 19.076 + random.uniform(-0.05, 0.05) if tpl["status"] == "completed" else None,
            "check_out_lng": 72.877 + random.uniform(-0.05, 0.05) if tpl["status"] == "completed" else None,
            "outcome": random.choice(["successful", "deal_progressed", "rescheduled"]) if tpl["status"] == "completed" else None,
            "outcome_notes": "Good progress. Client interested in Phase 2." if tpl["status"] == "completed" else None,
            "address_snapshot": {
                "street": lead.get("street"), "city": lead.get("city"),
                "state": lead.get("state"), "zip": lead.get("zip"),
                "country": lead.get("country"),
            },
            "owner_id": bd_user_id,
            "reporting_manager_id": manager_id,
            "created_by": bd_user_id,
            "tenant_id": tenant_id,
            "expense_ids": [],
            "photo_file_ids": [],
            "industry_data": {},
            "created_at": sched - timedelta(days=1),
            "updated_at": sched,
            "deleted_at": None,
        }
        res = await db["bd_visits"].insert_one(visit_doc)
        visit_ids.append(res.inserted_id)
        inserted_visits += 1

    print(f"  BD Visits: {inserted_visits} created.")

    # ── 5. Seed Expenses ─────────────────────────────────────────────
    expense_templates = [
        {"title": "Uber to TechCorp office",     "amount": 450,  "cat": "Travel",      "status": "submitted"},
        {"title": "Client lunch — GreenLeaf",    "amount": 1200, "cat": "Meals",        "status": "submitted"},
        {"title": "Hotel stay — Delhi trip",      "amount": 3500, "cat": "Accommodation","status": "approved"},
        {"title": "Fuel for Pune drive",          "amount": 800,  "cat": "Travel",       "status": "draft"},
        {"title": "Office supplies for demo",     "amount": 350,  "cat": "Supplies",     "status": "reimbursed"},
        {"title": "Train ticket — Jaipur",        "amount": 1100, "cat": "Travel",       "status": "submitted"},
        {"title": "Dinner with prospect",         "amount": 1800, "cat": "Meals",        "status": "rejected"},
    ]

    inserted_expenses = 0
    for i, etpl in enumerate(expense_templates):
        visit_id = visit_ids[i % len(visit_ids)] if visit_ids else None
        lead = leads[i % len(leads)]
        incurred = now - timedelta(days=random.randint(0, 6), hours=random.randint(0, 12))

        exp_doc = {
            "title": etpl["title"],
            "description": f"Dummy expense for BD panel testing.",
            "amount": etpl["amount"],
            "currency": "INR",
            "incurred_at": incurred,
            "category_name": etpl["cat"],
            "bd_visit_id": visit_id,
            "bd_visitable_type": "Lead",
            "bd_visitable_id": lead["_id"],
            "status": etpl["status"],
            "submitted_at": incurred + timedelta(hours=1) if etpl["status"] != "draft" else None,
            "approved_by": manager_id if etpl["status"] in ("approved", "reimbursed") else None,
            "approved_at": incurred + timedelta(days=1) if etpl["status"] in ("approved", "reimbursed") else None,
            "rejection_reason": "Receipt missing" if etpl["status"] == "rejected" else None,
            "reimbursed_at": incurred + timedelta(days=3) if etpl["status"] == "reimbursed" else None,
            "reporting_manager_id": manager_id,
            "owner_id": bd_user_id,
            "created_by": bd_user_id,
            "tenant_id": tenant_id,
            "receipt_file_ids": [],
            "industry_data": {},
            "created_at": incurred,
            "updated_at": incurred,
            "deleted_at": None,
        }
        await db["expenses"].insert_one(exp_doc)
        inserted_expenses += 1

    print(f"  Expenses: {inserted_expenses} created.")

    # ── 6. Summary ────────────────────────────────────────────────────
    total_visits = await db["bd_visits"].count_documents({"tenant_id": tenant_id, "deleted_at": None})
    total_expenses = await db["expenses"].count_documents({"tenant_id": tenant_id, "deleted_at": None})

    print(f"\n{'=' * 60}")
    print(f"  DONE!")
    print(f"  Total BD Visits in DB:  {total_visits}")
    print(f"  Total Expenses in DB:   {total_expenses}")
    print(f"  Total BD Activity Types: {len(type_ids)}")
    print(f"{'=' * 60}")
    print(f"\n  You can now browse:")
    print(f"    /bd              — Dashboard KPIs & week chart")
    print(f"    /bd/visits       — Visit list with filters")
    print(f"    /bd/approvals    — Pending approval queue")
    print(f"    /bd/expenses     — Expense claims")
    print()

    client.close()


if __name__ == "__main__":
    asyncio.run(seed_bd_data())
