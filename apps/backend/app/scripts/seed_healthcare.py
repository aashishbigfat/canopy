"""
Seed data for Healthcare industry tenants.
"""

from typing import Dict, List


HEALTHCARE_SEED: Dict[str, List[str]] = {
    "lead_statuses": [
        "New Inquiry",
        "Insurance Check",
        "Consultation Scheduled",
        "Treatment Started",
        "Closed",
    ],
    "sales_stages": [
        "Patient Inquiry",
        "Referral Received",
        "Appointment Set",
        "Treatment Active",
        "Completed",
        "Lost",
    ],
    "sources": [
        "Doctor Referral",
        "Insurance Portal",
        "Walk-in",
        "Emergency",
        "Website",
        "Social Media",
        "Phone Call",
    ],
}


async def seed_healthcare_tenant(tenant_id, db=None):
    """Seed default picklist data for a healthcare tenant."""
    from motor.motor_asyncio import AsyncIOMotorClient
    from app.core.config import settings
    from bson import ObjectId
    from datetime import datetime

    client = AsyncIOMotorClient(settings.MONGODB_URL)
    database = client[settings.MONGODB_DB_NAME]
    tid = ObjectId(str(tenant_id))
    now = datetime.utcnow()

    # Seed Lead Statuses — now tenant-scoped
    colors = ["#3B82F6", "#F59E0B", "#8B5CF6", "#10B981", "#6B7280"]
    for i, name in enumerate(HEALTHCARE_SEED["lead_statuses"]):
        existing = await database["lead_statuses"].find_one({"name": name, "tenant_id": tid})
        if not existing:
            await database["lead_statuses"].insert_one({
                "name": name,
                "color": colors[i % len(colors)],
                "sorting": i * 10,
                "is_active": True,
                "is_default": i == 0,
                "tenant_id": tid,
                "created_at": now,
                "updated_at": now,
            })

    # Seed Sources (has tenant_id)
    for i, name in enumerate(HEALTHCARE_SEED["sources"]):
        existing = await database["sources"].find_one({"name": name, "tenant_id": tid})
        if not existing:
            await database["sources"].insert_one({
                "name": name,
                "sorting": i,
                "is_active": True,
                "tenant_id": tid,
                "created_at": now,
                "updated_at": now,
            })

    # Seed Sales Stages (has tenant_id)
    for i, name in enumerate(HEALTHCARE_SEED["sales_stages"]):
        existing = await database["sales_stages"].find_one({"name": name, "tenant_id": tid})
        if not existing:
            await database["sales_stages"].insert_one({
                "name": name,
                "probability": (i + 1) * 15,
                "sorting": i,
                "is_active": True,
                "is_default": i == 0,
                "is_won": name == "Completed",
                "is_lost": name == "Lost",
                "tenant_id": tid,
                "created_at": now,
                "updated_at": now,
            })

    client.close()
    print(f"  [SEED] Healthcare picklists seeded for tenant {tenant_id}")
