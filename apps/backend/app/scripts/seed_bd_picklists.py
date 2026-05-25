"""
Seed BD panel picklists (BDActivityType, ExpenseCategory) as platform defaults.

These rows are tenant_id=None so they apply to all tenants of the given industry
(or globally when industry=None). Tenants override via copy-on-write in the
picklists API.

Usage:
    python -m app.scripts.seed_bd_picklists
"""
import asyncio
import logging
from typing import List, Dict, Any

from app.db.mongodb import init_db
from app.models.consolidated_picklists import BDActivityType, ExpenseCategory

logger = logging.getLogger("seed_bd_picklists")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


# Global activity types (any industry)
BD_ACTIVITY_TYPES_GLOBAL: List[Dict[str, Any]] = [
    {"name": "Cold Visit", "requires_approval": True, "expected_duration_min": 45},
    {"name": "Scheduled Meeting", "requires_approval": True, "expected_duration_min": 60},
    {"name": "Demo", "requires_approval": True, "expected_duration_min": 60},
    {"name": "Follow-up", "requires_approval": False, "expected_duration_min": 30},
    {"name": "Site Survey", "requires_approval": True, "expected_duration_min": 90},
    {"name": "Negotiation", "requires_approval": True, "expected_duration_min": 60},
    {"name": "Closure Visit", "requires_approval": True, "expected_duration_min": 60},
    {"name": "Document Pickup", "requires_approval": False, "requires_check_in": True, "expected_duration_min": 30},
]

# Industry-specific activity types
BD_ACTIVITY_TYPES_BY_INDUSTRY: Dict[str, List[Dict[str, Any]]] = {
    "travel": [
        {"name": "Hotel Site Inspection", "requires_approval": True, "expected_duration_min": 90},
        {"name": "Destination Recon", "requires_approval": True, "expected_duration_min": 120},
        {"name": "Agent Onboarding Visit", "requires_approval": True, "expected_duration_min": 60},
    ],
    "healthcare": [
        {"name": "Clinic Walkthrough", "requires_approval": True, "expected_duration_min": 60},
        {"name": "Provider Visit", "requires_approval": True, "expected_duration_min": 45},
        {"name": "Insurance Verification Visit", "requires_approval": True, "expected_duration_min": 30},
    ],
    "education": [
        {"name": "Campus Visit", "requires_approval": True, "expected_duration_min": 120},
        {"name": "Counselor Meeting", "requires_approval": True, "expected_duration_min": 60},
    ],
    "manufacturing": [
        {"name": "Plant Visit", "requires_approval": True, "expected_duration_min": 120},
        {"name": "Vendor Audit", "requires_approval": True, "expected_duration_min": 90},
    ],
}

# Global expense categories
EXPENSE_CATEGORIES: List[Dict[str, Any]] = [
    {"name": "Travel/Transport", "requires_receipt": True, "auto_approve_under": 500},
    {"name": "Meals", "requires_receipt": True, "auto_approve_under": 300},
    {"name": "Lodging", "requires_receipt": True, "max_amount": 10000},
    {"name": "Fuel", "requires_receipt": True, "auto_approve_under": 1000},
    {"name": "Tolls", "requires_receipt": False, "auto_approve_under": 500},
    {"name": "Parking", "requires_receipt": False, "auto_approve_under": 200},
    {"name": "Client Entertainment", "requires_receipt": True, "max_amount": 5000},
    {"name": "Communication", "requires_receipt": True, "auto_approve_under": 500},
    {"name": "Other", "requires_receipt": True},
]


async def upsert_bd_activity(name: str, industry: str | None, defaults: Dict[str, Any]) -> bool:
    """Insert a platform default if it doesn't already exist."""
    query = {
        "name": name,
        "tenant_id": None,
        "industry": industry,
        "picklist_type": "bd_activity_type",
    }
    existing = await BDActivityType.find_one(query)
    if existing:
        return False
    doc = BDActivityType(name=name, tenant_id=None, industry=industry, **defaults)
    await doc.insert()
    return True


async def upsert_expense_category(name: str, defaults: Dict[str, Any]) -> bool:
    query = {
        "name": name,
        "tenant_id": None,
        "industry": None,
        "picklist_type": "expense_category",
    }
    existing = await ExpenseCategory.find_one(query)
    if existing:
        return False
    doc = ExpenseCategory(name=name, tenant_id=None, industry=None, **defaults)
    await doc.insert()
    return True


async def run() -> None:
    await init_db()

    inserted_act = 0
    for item in BD_ACTIVITY_TYPES_GLOBAL:
        name = item.pop("name")
        if await upsert_bd_activity(name, None, item):
            inserted_act += 1
            logger.info("Inserted bd_activity_type (global): %s", name)

    for industry, items in BD_ACTIVITY_TYPES_BY_INDUSTRY.items():
        for item in items:
            name = item.pop("name")
            if await upsert_bd_activity(name, industry, item):
                inserted_act += 1
                logger.info("Inserted bd_activity_type (%s): %s", industry, name)

    inserted_exp = 0
    for item in EXPENSE_CATEGORIES:
        name = item.pop("name")
        if await upsert_expense_category(name, item):
            inserted_exp += 1
            logger.info("Inserted expense_category: %s", name)

    logger.info("Done. %d BD activity types, %d expense categories newly inserted.",
                inserted_act, inserted_exp)


if __name__ == "__main__":
    asyncio.run(run())
