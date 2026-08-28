from beanie import Document, Indexed
from beanie import PydanticObjectId
from pymongo import ReturnDocument
from bson import ObjectId


class TenantCounter(Document):
    """Atomic per-tenant sequence counters for human-readable display IDs."""
    tenant_id: Indexed(PydanticObjectId)
    module: str  # e.g. "opportunity"
    last_value: int = 0

    class Settings:
        name = "tenant_counters"
        indexes = [
            [("tenant_id", 1), ("module", 1)],
        ]


async def next_opportunity_number(tenant_id: ObjectId) -> int:
    """Atomically increment and return the next opportunity number for this tenant."""
    col = TenantCounter.get_motor_collection()
    doc = await col.find_one_and_update(
        {"tenant_id": tenant_id, "module": "opportunity"},
        {"$inc": {"last_value": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return doc["last_value"]
