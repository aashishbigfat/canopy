"""
BDVisitRoute — cold-store summary of a completed BD visit's GPS trail.

Written by `compute_visit_route` on check-out: collapses all LocationPing rows
for the visit into a Douglas-Peucker-simplified polyline plus distance/duration
metrics. Drives the route-map UI and analytics — pings live for 30 days, this
summary lives forever.
"""
from datetime import datetime
from typing import List, Optional

from beanie import Document, PydanticObjectId
from pydantic import Field


class BDVisitRoute(Document):
    tenant_id: PydanticObjectId
    bd_visit_id: PydanticObjectId
    user_id: PydanticObjectId
    date: datetime  # day bucket

    # Simplified polyline (Douglas-Peucker). Stored as [[lat, lng], ...]
    polyline: List[List[float]] = Field(default_factory=list)
    point_count_original: int = 0
    point_count_simplified: int = 0

    total_distance_km: float = 0.0
    total_duration_min: int = 0
    idle_minutes: int = 0  # time stopped > 5 min

    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "bd_visit_routes"
        indexes = [
            [("tenant_id", 1), ("user_id", 1), ("date", -1)],
            [("bd_visit_id", 1)],
        ]
