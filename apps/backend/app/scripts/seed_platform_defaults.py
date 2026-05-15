"""
Platform-Wide Default Seeder for Multi-Tenant SaaS CRM.

Seeds ALL picklist types as platform defaults (tenant_id=None, industry=<specific>).
These defaults are inherited by ALL tenants of a given industry automatically.

Usage:
    python -m app.scripts.seed_platform_defaults

Architecture:
    Platform Default  (tenant_id=None)  -> visible to ALL tenants of that industry
    Tenant Override   (tenant_id=<OID>) -> visible to ONLY that tenant

This script is IDEMPOTENT — safe to run multiple times.
It only inserts records that don't already exist as platform defaults.
"""
from datetime import datetime
from typing import Dict, List, Optional


# ============================================================================
# TRAVEL INDUSTRY DEFAULTS
# ============================================================================
TRAVEL_DEFAULTS: Dict[str, List] = {
    "account_type": [
        "Travel Agent", "Travel Enterprise", "Corporate Client",
        "Clubs And Ngos", "Supplier", "Event Management Company",
        "Travel Leaders", "Others",
    ],
    "lead_status": [
        {"name": "Open", "color": "#3B82F6", "is_default": True},
        {"name": "Contacted", "color": "#10B981"},
        {"name": "Qualified", "color": "#8B5CF6"},
        {"name": "Unqualified", "color": "#EF4444"},
    ],
    "source": [
        "Instagram", "Facebook", "Google", "Get a Call", "Enquire no",
        "Organic", "Manual", "Gmail", "Landline", "Whatsapp", "EMT",
        "Double Click Whatsapp", "TIYA", "Website Chatbot", "Visa", "AC",
    ],
    "source_medium": [
        "Phone Call", "WhatsApp", "Email", "Walk-in",
        "Website Chat", "Social Media DM", "Travel Fair", "Agency Referral",
    ],
    "experience": [
        "Budget", "Standard", "Luxury", "Ultra-Luxury",
        "Adventure", "Honeymoon", "Family",
    ],
    "industry": [
        "Agriculture", "Apparel", "Banking", "Chemicals", "Communications",
        "Construction", "Consulting", "Education", "Electronics", "Energy",
        "Engineering", "Environmental", "Finance", "Food & Beverage", "Government",
        "Healthcare", "Hospitality", "Insurance", "Machinery", "Manufacturing",
        "Media", "Not For Profit", "Other", "Recreation", "Retail", "Shipping",
        "Technology", "Telecommunications", "Transportation", "Travel", "Utilities",
        "Law Firm", "Event Management",
    ],
    "inclusion": [
        "Breakfast", "Lunch", "Dinner", "Airport Transfer", "Sightseeing",
        "Travel Insurance", "Visa Assistance", "Hotel Stay", "Local Transport",
        "Guide", "Entry Tickets",
    ],
    "itinerary_inclusion": [
        "Hotel Stay", "Meals", "Local Transport", "Guide",
        "Entry Tickets", "Activities", "Airport Transfers",
    ],
    "supplier_type": [
        "Hotel", "Airline", "Ground Transport", "Cruise Line",
        "Activity Provider", "DMC", "Visa Agent", "Travel Insurance",
        "Restaurant", "Tour Operator",
    ],
    "destination": [
        "Paris", "London", "Dubai", "Singapore", "Tokyo",
        "Bali", "Maldives", "Bangkok", "New York", "Rome",
        "Goa", "Kashmir", "Manali", "Ladakh", "Kerala",
        "Rajasthan", "Andaman", "Himachal", "Uttarakhand", "Mauritius",
    ],
    "opportunity_tag": [
        "Honeymoon", "Family Trip", "Corporate Event", "Group Tour",
        "Solo Travel", "MICE", "Pilgrimage", "Weekend Getaway",
    ],
}

# ============================================================================
# HEALTHCARE INDUSTRY DEFAULTS
# ============================================================================
HEALTHCARE_DEFAULTS: Dict[str, List] = {
    "account_type": [
        "Hospital", "Clinic", "Diagnostic Center", "Pharmacy",
        "Insurance Provider", "Medical Device Company", "Others",
    ],
    "lead_status": [
        {"name": "New Inquiry", "color": "#3B82F6", "is_default": True},
        {"name": "Insurance Check", "color": "#F59E0B"},
        {"name": "Consultation Scheduled", "color": "#8B5CF6"},
        {"name": "Treatment Started", "color": "#10B981"},
        {"name": "Closed", "color": "#6B7280"},
    ],
    "source": [
        "Doctor Referral", "Insurance Portal", "Walk-in", "Emergency",
        "Website", "Social Media", "Phone Call",
    ],
    "source_medium": [
        "Phone Call", "Email", "Patient Portal", "Walk-in",
        "Doctor Referral", "Insurance Portal", "WhatsApp",
    ],
}

# ============================================================================
# EDUCATION INDUSTRY DEFAULTS
# ============================================================================
EDUCATION_DEFAULTS: Dict[str, List] = {
    "account_type": [
        "University", "College", "School", "Coaching Center",
        "Ed-Tech Platform", "Testing Agency", "Others",
    ],
    "lead_status": [
        {"name": "New Inquiry", "color": "#3B82F6", "is_default": True},
        {"name": "Application Started", "color": "#F59E0B"},
        {"name": "Documents Pending", "color": "#EF4444"},
        {"name": "Under Review", "color": "#8B5CF6"},
        {"name": "Decision Pending", "color": "#F97316"},
        {"name": "Enrolled", "color": "#10B981"},
        {"name": "Rejected", "color": "#6B7280"},
    ],
    "source": [
        "Campus Visit", "Education Fair", "Website", "Social Media",
        "Alumni Referral", "Agent / Counselor", "Advertisement", "Phone Call",
    ],
    "source_medium": [
        "Phone Call", "Email", "Website Form", "WhatsApp",
        "Education Fair Booth", "Counselor Chat", "Social Media DM",
    ],
}

# ============================================================================
# MANUFACTURING INDUSTRY DEFAULTS
# ============================================================================
MANUFACTURING_DEFAULTS: Dict[str, List] = {
    "account_type": [
        "OEM", "Contract Manufacturer", "Raw Material Supplier",
        "Distributor", "End Customer", "Others",
    ],
    "lead_status": [
        {"name": "New RFQ", "color": "#3B82F6", "is_default": True},
        {"name": "Quote Requested", "color": "#F59E0B"},
        {"name": "Sample Required", "color": "#8B5CF6"},
        {"name": "Negotiation", "color": "#F97316"},
        {"name": "PO Received", "color": "#10B981"},
        {"name": "Lost", "color": "#6B7280"},
    ],
    "source": [
        "Trade Show", "Website", "Distributor", "Direct Sales",
        "Tender", "Referral", "Online Marketplace",
    ],
    "source_medium": [
        "Phone Call", "Email", "Trade Show Booth", "WhatsApp",
        "Online RFQ Form", "Distributor", "Direct Sales Rep",
    ],
}

# ============================================================================
# GLOBAL DEFAULTS (all industries)
# ============================================================================
GLOBAL_DEFAULTS: Dict[str, List[str]] = {
    "account_source": [
        "Web", "Phone Inquiry", "Partner Referral",
        "Purchased List", "Other",
    ],
    "opportunity_type": [
        "New Business", "Existing Business", "Renewal",
    ],
    "salutation": [
        "Mr.", "Mrs.", "Ms.", "Dr.", "Prof.",
    ],
    "task_status": [
        "Not Started", "In Progress", "Completed", "Deferred",
    ],
    "task_priority": [
        "Low", "Normal", "High", "Urgent",
    ],
}


# ============================================================================
# SEEDER ENGINE
# ============================================================================

INDUSTRY_MAP = {
    "travel": TRAVEL_DEFAULTS,
    "healthcare": HEALTHCARE_DEFAULTS,
    "education": EDUCATION_DEFAULTS,
    "manufacturing": MANUFACTURING_DEFAULTS,
}



# Beanie _class_id discriminator mapping — MUST match consolidated_picklists.py class names
_PICKLIST_CLASS_ID_MAP = {
    "account_type": "BasePicklist.AccountType",
    "industry": "BasePicklist.Industry",
    "account_source": "BasePicklist.AccountSource",
    "lead_status": "BasePicklist.LeadStatus",
    "source": "BasePicklist.Source",
    "source_medium": "BasePicklist.SourceMedium",
    "experience": "BasePicklist.Experience",
    "sales_stage": "BasePicklist.SalesStage",
    "opportunity_type": "BasePicklist.OpportunityType",
    "opportunity_tag": "BasePicklist.OpportunityTag",
    "supplier_service": "BasePicklist.SupplierServicePicklist",
    "salutation": "BasePicklist.Salutation",
    "task_status": "BasePicklist.TaskStatus",
    "task_priority": "BasePicklist.TaskPriority",
    "inclusion": "BasePicklist.Inclusion",
    "itinerary_inclusion": "BasePicklist.ItineraryInclusion",
    "supplier_type": "BasePicklist.SupplierType",
    "destination": "BasePicklist.DestinationPicklist",
}


async def _seed_picklist_type(
    db,
    picklist_type: str,
    values: list,
    industry: Optional[str],
):
    """Insert platform defaults for a single picklist type.
    
    Only inserts if a platform default (tenant_id=None) with the same
    name and picklist_type doesn't already exist.
    
    IMPORTANT: Each document MUST include the Beanie _class_id discriminator
    field so that Beanie ORM queries (which filter by _class_id) can find them.
    """
    now = datetime.utcnow()
    inserted = 0
    class_id = _PICKLIST_CLASS_ID_MAP.get(picklist_type, f"BasePicklist.{picklist_type}")

    for i, item in enumerate(values):
        # Items can be plain strings or dicts with extra fields
        if isinstance(item, str):
            name = item
            extra = {}
        else:
            name = item["name"]
            extra = {k: v for k, v in item.items() if k != "name"}

        # Check if platform default already exists
        existing = await db["picklists"].find_one({
            "name": name,
            "tenant_id": None,
            "picklist_type": picklist_type,
        })
        if existing:
            # Ensure existing docs also have _class_id (backfill safety)
            if not existing.get("_class_id"):
                await db["picklists"].update_one(
                    {"_id": existing["_id"]},
                    {"$set": {"_class_id": class_id}}
                )
            continue

        doc = {
            "picklist_type": picklist_type,
            "_class_id": class_id,   # <-- Beanie discriminator (REQUIRED)
            "name": name,
            "sorting": i * 10 if picklist_type == "lead_status" else i,
            "is_active": True,
            "is_default": extra.pop("is_default", False),
            "tenant_id": None,       # <-- PLATFORM DEFAULT
            "industry": industry,    # <-- Industry scoping (None = global)
            "created_at": now,
            "updated_at": now,
            **extra,
        }
        await db["picklists"].insert_one(doc)
        inserted += 1

    return inserted


async def seed_platform_defaults():
    """Seed all platform defaults across all industries."""
    from motor.motor_asyncio import AsyncIOMotorClient
    from app.core.config import settings

    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]

    total = 0
    print("=" * 60)
    print("  PLATFORM DEFAULT SEEDER - Multi-Tenant SaaS CRM")
    print("=" * 60)

    # 1. Industry-specific defaults
    for industry, defaults in INDUSTRY_MAP.items():
        print(f"\n  [{industry.upper()}]")
        for picklist_type, values in defaults.items():
            count = await _seed_picklist_type(db, picklist_type, values, industry)
            total += count
            status = f"  + {picklist_type}: {count} new" if count else f"  - {picklist_type}: already seeded"
            print(status)

    # 2. Global defaults (no industry)
    print(f"\n  [GLOBAL]")
    for picklist_type, values in GLOBAL_DEFAULTS.items():
        count = await _seed_picklist_type(db, picklist_type, values, None)
        total += count
        status = f"  + {picklist_type}: {count} new" if count else f"  - {picklist_type}: already seeded"
        print(status)

    # 3. Clean up tenant-scoped duplicates
    #    If a platform default (tenant_id=None) now exists for a given
    #    (picklist_type, name), remove old tenant-scoped copies.
    platform_all = await db["picklists"].find({"tenant_id": None}).to_list(None)
    default_keys = {(p["picklist_type"], p["name"]) for p in platform_all}

    tenant_scoped = await db["picklists"].find(
        {"tenant_id": {"$ne": None}}
    ).to_list(None)
    dup_ids = [
        r["_id"] for r in tenant_scoped
        if (r["picklist_type"], r["name"]) in default_keys
    ]
    if dup_ids:
        result = await db["picklists"].delete_many({"_id": {"$in": dup_ids}})
        print(f"\n  [CLEANUP] Removed {result.deleted_count} tenant-scoped duplicates")
    else:
        print(f"\n  [CLEANUP] No duplicates found")

    # 4. Summary
    platform_count = await db["picklists"].count_documents({"tenant_id": None})
    tenant_count = await db["picklists"].count_documents({"tenant_id": {"$ne": None}})
    print(f"\n{'=' * 60}")
    print(f"  DONE: {total} new platform defaults inserted")
    print(f"  Platform defaults: {platform_count}")
    print(f"  Tenant-specific:   {tenant_count}")
    print(f"  Total:             {platform_count + tenant_count}")
    print(f"{'=' * 60}")

    client.close()


# Allow running as standalone script
if __name__ == "__main__":
    import asyncio
    asyncio.run(seed_platform_defaults())
