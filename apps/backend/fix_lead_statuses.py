"""
Migrate LeadStatus collection to be tenant-isolated.

Steps:
1. Delete all existing global lead_statuses
2. Seed industry-specific lead statuses for each tenant
3. Verify isolation

Run: python fix_lead_statuses.py
"""
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Industry-specific lead status definitions
INDUSTRY_LEAD_STATUSES = {
    "travel": [
        {"name": "New",             "color": "#6366f1", "is_default": True,  "sorting": 10},
        {"name": "Contacted",       "color": "#8b5cf6", "is_default": False, "sorting": 20},
        {"name": "Quote Sent",      "color": "#06b6d4", "is_default": False, "sorting": 30},
        {"name": "Follow Up",       "color": "#f59e0b", "is_default": False, "sorting": 40},
        {"name": "Negotiating",     "color": "#f97316", "is_default": False, "sorting": 50},
        {"name": "Closed",          "color": "#10b981", "is_default": False, "sorting": 60},
        {"name": "Lost",            "color": "#ef4444", "is_default": False, "sorting": 70},
    ],
    "healthcare": [
        {"name": "New Inquiry",             "color": "#3b82f6", "is_default": True,  "sorting": 10},
        {"name": "Insurance Check",         "color": "#f59e0b", "is_default": False, "sorting": 20},
        {"name": "Consultation Scheduled",  "color": "#8b5cf6", "is_default": False, "sorting": 30},
        {"name": "Treatment Started",       "color": "#10b981", "is_default": False, "sorting": 40},
        {"name": "Closed",                  "color": "#6b7280", "is_default": False, "sorting": 50},
    ],
    "education": [
        {"name": "New Inquiry",         "color": "#6366f1", "is_default": True,  "sorting": 10},
        {"name": "Application Started", "color": "#8b5cf6", "is_default": False, "sorting": 20},
        {"name": "Docs Pending",        "color": "#f59e0b", "is_default": False, "sorting": 30},
        {"name": "Under Review",        "color": "#06b6d4", "is_default": False, "sorting": 40},
        {"name": "Offer Received",      "color": "#10b981", "is_default": False, "sorting": 50},
        {"name": "Enrolled",            "color": "#22c55e", "is_default": False, "sorting": 60},
        {"name": "Withdrawn",           "color": "#ef4444", "is_default": False, "sorting": 70},
    ],
    "manufacturing": [
        {"name": "New RFQ",             "color": "#f97316", "is_default": True,  "sorting": 10},
        {"name": "Contacted",           "color": "#8b5cf6", "is_default": False, "sorting": 20},
        {"name": "Quote Requested",     "color": "#06b6d4", "is_default": False, "sorting": 30},
        {"name": "Sample Sent",         "color": "#f59e0b", "is_default": False, "sorting": 40},
        {"name": "Negotiating",         "color": "#f97316", "is_default": False, "sorting": 50},
        {"name": "Order Placed",        "color": "#10b981", "is_default": False, "sorting": 60},
        {"name": "Closed",              "color": "#6b7280", "is_default": False, "sorting": 70},
    ],
}


async def main():
    from app.db.mongodb import init_db
    from app.models.tenant import Tenant
    from datetime import datetime

    await init_db()

    from motor.motor_asyncio import AsyncIOMotorClient
    from app.core.config import settings
    from bson import ObjectId

    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    col = db["lead_statuses"]
    now = datetime.utcnow()

    # Step 1: Delete all existing global lead statuses
    result = await col.delete_many({})
    print(f"[CLEAN] Deleted {result.deleted_count} existing lead_statuses")

    # Step 2: Get all real tenants
    tenants = await Tenant.find().to_list()
    real_tenants = [t for t in tenants if "Test" not in t.company_name]
    print(f"\n[INFO] Found {len(real_tenants)} tenants to seed:")
    for t in real_tenants:
        print(f"  - {t.company_name!r} ({t.industry})")

    # Step 3: Seed industry-specific statuses for each tenant
    total_inserted = 0
    for tenant in real_tenants:
        industry = tenant.industry or "travel"
        statuses = INDUSTRY_LEAD_STATUSES.get(industry, INDUSTRY_LEAD_STATUSES["travel"])
        tid = tenant.id

        for s in statuses:
            await col.insert_one({
                **s,
                "tenant_id": tid,
                "is_active": True,
                "description": None,
                "created_at": now,
                "updated_at": now,
            })
            total_inserted += 1

        print(f"  [SEEDED] {tenant.company_name!r} ({industry}) -> {len(statuses)} statuses")

    print(f"\n[OK] Total inserted: {total_inserted}")

    # Step 4: Verify
    print("\n=== Verification ===")
    for tenant in real_tenants:
        count = await col.count_documents({"tenant_id": tenant.id, "is_active": True})
        print(f"  {tenant.company_name!r} ({tenant.industry}) -> {count} active statuses")

    global_count = await col.count_documents({"$or": [{"tenant_id": {"$exists": False}}, {"tenant_id": None}]})
    print(f"\n  Global (unscoped) statuses remaining: {global_count}")

    client.close()
    print("\n[DONE] Restart uvicorn (auto-reload) and refresh browser.")


asyncio.run(main())
