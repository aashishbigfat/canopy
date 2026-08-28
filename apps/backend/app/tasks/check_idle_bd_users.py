"""
Periodic background task — detect BDs who appear stationary during an active
visit for too long and alert their manager.

Run this every 15 minutes from your scheduler (the existing reminder cron or
similar). It's pure read + notification, so safe to run repeatedly.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, List
import logging

from bson import ObjectId

from app.models.bd_visit import BDVisit
from app.models.location_ping import LocationPing
from app.services.notification_service import NotificationService
from math import asin, cos, radians, sin, sqrt

logger = logging.getLogger(__name__)

EARTH_RADIUS_KM = 6371.0
IDLE_MINUTES_THRESHOLD = 120  # alert after 2h
IDLE_RADIUS_METRES = 100


def _haversine_m(a: tuple, b: tuple) -> float:
    lat1, lon1 = radians(a[0]), radians(a[1])
    lat2, lon2 = radians(b[0]), radians(b[1])
    h = sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin((lon2 - lon1) / 2) ** 2
    return 2 * EARTH_RADIUS_KM * asin(sqrt(h)) * 1000.0


async def scan_for_idle_bds() -> Dict[str, int]:
    """Scan all in-progress visits across tenants for idle BDs.

    Returns counts for observability. Caller logs / surfaces as needed.
    """
    notif = NotificationService()
    alerts = 0
    checked = 0
    cutoff = datetime.utcnow() - timedelta(minutes=IDLE_MINUTES_THRESHOLD)

    in_progress_visits = await BDVisit.find(
        {"status": "in_progress", "deleted_at": None}
    ).to_list()

    for visit in in_progress_visits:
        checked += 1
        try:
            # Pings since the cutoff
            recent_pings = await LocationPing.find(
                {
                    "tenant_id": visit.tenant_id,
                    "bd_visit_id": visit.id,
                    "recorded_at": {"$gte": cutoff},
                }
            ).sort("+recorded_at").to_list()
            if len(recent_pings) < 2:
                continue  # not enough data
            first = (recent_pings[0].lat, recent_pings[0].lng)
            stationary = True
            for p in recent_pings[1:]:
                if _haversine_m(first, (p.lat, p.lng)) > IDLE_RADIUS_METRES:
                    stationary = False
                    break
            if stationary and visit.reporting_manager_id:
                await notif.notify_user(
                    user_id=visit.reporting_manager_id,
                    tenant_id=visit.tenant_id,
                    title="BD appears idle",
                    message=f"{visit.title}: BD has not moved for {IDLE_MINUTES_THRESHOLD}+ minutes.",
                    type="warning",
                    entity_type="bd_visit",
                    entity_id=visit.id,
                    action_url=f"/bd/visits/{visit.id}",
                )
                alerts += 1
        except Exception:
            logger.exception("Idle check failed for visit %s", visit.id)

    logger.info("Idle BD scan: %d visits checked, %d alerts sent", checked, alerts)
    return {"checked": checked, "alerts": alerts}
