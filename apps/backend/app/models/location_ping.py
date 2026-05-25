"""
LocationPing — raw GPS samples streamed from a BD's device during a visit.

Storage strategy (Phase 7 hot store):
- Every ping is persisted with a 30-day TTL index so the collection
  doesn't grow unboundedly. The TTL handles cleanup automatically.
- Phase 8 will collapse pings into a BDVisitRoute polyline summary at
  check-out time; pings remain for dispute resolution within 30 days.
"""
from datetime import datetime
from typing import Optional

from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import IndexModel


class LocationPing(Document):
    tenant_id: PydanticObjectId  # indexed via Settings
    user_id: PydanticObjectId    # indexed via Settings
    bd_visit_id: Optional[PydanticObjectId] = None  # may be None if "tracking without active visit"

    lat: float
    lng: float
    accuracy_m: Optional[float] = None
    speed_mps: Optional[float] = None
    heading_deg: Optional[float] = None
    altitude_m: Optional[float] = None
    battery_pct: Optional[int] = None

    recorded_at: datetime          # device clock — when the reading was taken
    server_received_at: datetime = Field(default_factory=datetime.utcnow)
    source: str = "device"         # device | manual | imported

    class Settings:
        name = "location_pings"
        indexes = [
            [("tenant_id", 1), ("user_id", 1), ("recorded_at", -1)],
            [("bd_visit_id", 1), ("recorded_at", 1)],
            # TTL — auto-delete after 30 days. Cleanup is silent and unstoppable
            # so any audit-window changes must update this number.
            IndexModel(
                [("server_received_at", 1)],
                expireAfterSeconds=30 * 24 * 3600,
                name="location_pings_ttl",
            ),
        ]
