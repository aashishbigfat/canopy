"""
Seed data for Manufacturing industry tenants.
"""

from typing import Dict, List


MANUFACTURING_SEED: Dict[str, List[str]] = {
    "lead_statuses": [
        "New RFQ",
        "Quote Requested",
        "Sample Required",
        "Negotiation",
        "PO Received",
        "Lost",
    ],
    "sales_stages": [
        "RFQ Received",
        "Quote Sent",
        "Sample Approved",
        "PO Received",
        "In Production",
        "Delivered",
        "Lost",
    ],
    "sources": [
        "Trade Show",
        "Website",
        "Distributor",
        "Direct Sales",
        "Tender",
        "Referral",
        "Online Marketplace",
    ],
}


async def seed_manufacturing_tenant(tenant_id, db=None):
    """Seed default picklist data for a manufacturing tenant."""
    from motor.motor_asyncio import AsyncIOMotorClient
    from app.core.config import settings
    from bson import ObjectId
    from datetime import datetime

    client = AsyncIOMotorClient(settings.MONGODB_URL)
    database = client[settings.MONGODB_DB_NAME]
    tid = ObjectId(str(tenant_id))
    now = datetime.utcnow()

    colors = ["#3B82F6", "#F59E0B", "#8B5CF6", "#F97316", "#10B981", "#6B7280"]
    for i, name in enumerate(MANUFACTURING_SEED["lead_statuses"]):
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

    for i, name in enumerate(MANUFACTURING_SEED["sources"]):
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

    for i, name in enumerate(MANUFACTURING_SEED["sales_stages"]):
        existing = await database["sales_stages"].find_one({"name": name, "tenant_id": tid})
        if not existing:
            await database["sales_stages"].insert_one({
                "name": name,
                "probability": (i + 1) * 12,
                "sorting": i,
                "is_active": True,
                "is_default": i == 0,
                "is_won": name == "Delivered",
                "is_lost": name == "Lost",
                "tenant_id": tid,
                "created_at": now,
                "updated_at": now,
            })

    client.close()
    print(f"  [SEED] Manufacturing picklists seeded for tenant {tenant_id}")
