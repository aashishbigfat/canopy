"""
Tracking Service — GPS pings during BD field visits.

Ingest is bulk-friendly so devices can buffer when offline and flush in batches.
Reads honour visibility_scope so managers see their team's pings; ICs only see
their own.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
import logging

from bson import ObjectId

from app.models.bd_visit import BDVisit
from app.models.location_ping import LocationPing
from app.models.user import User

logger = logging.getLogger(__name__)

MAX_PINGS_PER_BATCH = 500
ACCEPT_PING_WINDOW = timedelta(hours=24)  # reject pings older than 24h


class TrackingService:
    async def ingest_pings(
        self,
        user: User,
        pings: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Persist a batch of pings. Returns counts."""
        if len(pings) > MAX_PINGS_PER_BATCH:
            raise ValueError(f"Batch too large; max {MAX_PINGS_PER_BATCH} pings per call")

        accepted = 0
        rejected = 0
        now = datetime.utcnow()
        docs: List[LocationPing] = []

        # Cache visit ownership checks
        visit_ok_cache: Dict[ObjectId, bool] = {}

        for p in pings:
            try:
                lat = float(p["lat"])
                lng = float(p["lng"])
                recorded_at_raw = p["recorded_at"]
                if isinstance(recorded_at_raw, str):
                    recorded = datetime.fromisoformat(recorded_at_raw.replace("Z", "+00:00")).replace(tzinfo=None)
                else:
                    recorded = recorded_at_raw
            except (KeyError, ValueError, TypeError):
                rejected += 1
                continue

            if now - recorded > ACCEPT_PING_WINDOW:
                rejected += 1
                continue

            visit_oid: Optional[ObjectId] = None
            if p.get("bd_visit_id"):
                try:
                    vid = ObjectId(p["bd_visit_id"])
                except Exception:
                    rejected += 1
                    continue
                if vid not in visit_ok_cache:
                    visit = await BDVisit.find_one(
                        {"_id": vid, "tenant_id": user.tenant_id, "owner_id": user.id}
                    )
                    visit_ok_cache[vid] = visit is not None
                if not visit_ok_cache[vid]:
                    rejected += 1
                    continue
                visit_oid = vid

            docs.append(LocationPing(
                tenant_id=user.tenant_id,
                user_id=user.id,
                bd_visit_id=visit_oid,
                lat=lat,
                lng=lng,
                accuracy_m=p.get("accuracy_m"),
                speed_mps=p.get("speed_mps"),
                heading_deg=p.get("heading_deg"),
                altitude_m=p.get("altitude_m"),
                battery_pct=p.get("battery_pct"),
                recorded_at=recorded,
                source=p.get("source", "device"),
            ))

        if docs:
            await LocationPing.insert_many(docs)
            accepted = len(docs)
        return {"accepted": accepted, "rejected": rejected}

    async def latest_for_user(
        self, tenant_id: ObjectId, user_id: ObjectId
    ) -> Optional[LocationPing]:
        return await LocationPing.find_one(
            {"tenant_id": tenant_id, "user_id": user_id},
            sort=[("recorded_at", -1)],
        )

    async def pings_for_visit(
        self, tenant_id: ObjectId, visit_id: ObjectId
    ) -> List[LocationPing]:
        return await LocationPing.find(
            {"tenant_id": tenant_id, "bd_visit_id": visit_id}
        ).sort("+recorded_at").to_list()

    async def live_team_locations(
        self,
        tenant_id: ObjectId,
        user_ids: List[ObjectId],
        *,
        max_age_minutes: int = 10,
    ) -> List[Dict[str, Any]]:
        """Return the most recent ping per user (within max_age_minutes)."""
        if not user_ids:
            return []
        cutoff = datetime.utcnow() - timedelta(minutes=max_age_minutes)
        pipeline = [
            {"$match": {
                "tenant_id": tenant_id,
                "user_id": {"$in": user_ids},
                "recorded_at": {"$gte": cutoff},
            }},
            {"$sort": {"user_id": 1, "recorded_at": -1}},
            {"$group": {
                "_id": "$user_id",
                "lat": {"$first": "$lat"},
                "lng": {"$first": "$lng"},
                "accuracy_m": {"$first": "$accuracy_m"},
                "speed_mps": {"$first": "$speed_mps"},
                "battery_pct": {"$first": "$battery_pct"},
                "bd_visit_id": {"$first": "$bd_visit_id"},
                "recorded_at": {"$first": "$recorded_at"},
            }},
        ]
        rows = await LocationPing.aggregate(pipeline).to_list()

        # Enrich with user/visit names
        users = await User.find({"_id": {"$in": [r["_id"] for r in rows]}, "tenant_id": tenant_id}).to_list()
        user_map = {u.id: u for u in users}
        visit_ids = [r["bd_visit_id"] for r in rows if r.get("bd_visit_id")]
        visit_map: Dict[ObjectId, BDVisit] = {}
        if visit_ids:
            visits = await BDVisit.find({"_id": {"$in": visit_ids}, "tenant_id": tenant_id}).to_list()
            visit_map = {v.id: v for v in visits}

        out: List[Dict[str, Any]] = []
        for r in rows:
            u = user_map.get(r["_id"])
            v = visit_map.get(r.get("bd_visit_id")) if r.get("bd_visit_id") else None
            out.append({
                "user_id": str(r["_id"]),
                "user_name": u.name if u else None,
                "lat": r["lat"],
                "lng": r["lng"],
                "accuracy_m": r.get("accuracy_m"),
                "speed_mps": r.get("speed_mps"),
                "battery_pct": r.get("battery_pct"),
                "bd_visit_id": str(r["bd_visit_id"]) if r.get("bd_visit_id") else None,
                "bd_visit_title": v.title if v else None,
                "recorded_at": r["recorded_at"].isoformat() if r["recorded_at"] else None,
            })
        return out


tracking_service = TrackingService()
