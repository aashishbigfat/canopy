"""
Compute a BDVisitRoute summary from the raw LocationPing stream of a visit.

Algorithm:
1. Load all pings for the visit, sorted ascending.
2. Run Douglas-Peucker simplification to keep polylines small.
3. Compute total distance (Haversine) + duration + idle-minute estimate
   (gaps where the BD didn't move for > 5 minutes).
4. Upsert a BDVisitRoute doc keyed by bd_visit_id.

Called from `bd_visit_service.check_out` via `asyncio.create_task` so the
HTTP response isn't blocked. Failures only log; this is best-effort.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from math import asin, cos, radians, sin, sqrt
from typing import List, Tuple
import logging

from bson import ObjectId

from app.models.bd_visit import BDVisit
from app.models.bd_visit_route import BDVisitRoute
from app.models.location_ping import LocationPing

logger = logging.getLogger(__name__)

EARTH_RADIUS_KM = 6371.0
DEFAULT_DP_EPSILON_M = 25.0  # ~25 metres
IDLE_GAP_MINUTES = 5
IDLE_DISTANCE_M = 30  # treat <30m movement during the gap as idle


def haversine_km(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    lat1, lon1 = radians(a[0]), radians(a[1])
    lat2, lon2 = radians(b[0]), radians(b[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_KM * asin(sqrt(h))


def _perpendicular_distance_m(point, line_start, line_end) -> float:
    """Approximate perpendicular distance in metres from `point` to line."""
    if line_start == line_end:
        return haversine_km(point, line_start) * 1000.0
    # Equirectangular projection (good enough at small scales)
    lat0 = radians((line_start[0] + line_end[0]) / 2)
    sx, sy = line_start[1] * cos(lat0), line_start[0]
    ex, ey = line_end[1] * cos(lat0), line_end[0]
    px, py = point[1] * cos(lat0), point[0]
    dx, dy = ex - sx, ey - sy
    if dx == 0 and dy == 0:
        return haversine_km(point, line_start) * 1000.0
    t = ((px - sx) * dx + (py - sy) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    proj = (sy + t * dy, sx + t * dx)
    return haversine_km(point, (proj[0], proj[1] / cos(lat0))) * 1000.0


def douglas_peucker(points: List[Tuple[float, float]], epsilon_m: float) -> List[Tuple[float, float]]:
    if len(points) < 3:
        return list(points)
    dmax = 0.0
    idx = 0
    for i in range(1, len(points) - 1):
        d = _perpendicular_distance_m(points[i], points[0], points[-1])
        if d > dmax:
            idx = i
            dmax = d
    if dmax > epsilon_m:
        left = douglas_peucker(points[: idx + 1], epsilon_m)
        right = douglas_peucker(points[idx:], epsilon_m)
        return left[:-1] + right
    return [points[0], points[-1]]


async def compute_visit_route(tenant_id: ObjectId, visit_id: ObjectId) -> None:
    """Fire-and-forget summary build. Never raises."""
    try:
        visit = await BDVisit.find_one({"_id": visit_id, "tenant_id": tenant_id})
        if not visit:
            return
        pings = await LocationPing.find(
            {"tenant_id": tenant_id, "bd_visit_id": visit_id}
        ).sort("+recorded_at").to_list()

        if not pings:
            return

        raw_points: List[Tuple[float, float]] = [(p.lat, p.lng) for p in pings]
        simplified = douglas_peucker(raw_points, DEFAULT_DP_EPSILON_M)

        # Distance + duration over the raw stream (not simplified — accuracy matters)
        total_km = 0.0
        for i in range(1, len(raw_points)):
            total_km += haversine_km(raw_points[i - 1], raw_points[i])

        started = pings[0].recorded_at
        ended = pings[-1].recorded_at
        duration_min = int((ended - started).total_seconds() // 60)

        # Idle minute heuristic
        idle_min = 0
        for i in range(1, len(pings)):
            gap = (pings[i].recorded_at - pings[i - 1].recorded_at).total_seconds() / 60.0
            if gap >= IDLE_GAP_MINUTES:
                dist_m = haversine_km(
                    (pings[i - 1].lat, pings[i - 1].lng),
                    (pings[i].lat, pings[i].lng),
                ) * 1000.0
                if dist_m <= IDLE_DISTANCE_M:
                    idle_min += int(gap)

        date_bucket = datetime(started.year, started.month, started.day)

        existing = await BDVisitRoute.find_one({"bd_visit_id": visit_id, "tenant_id": tenant_id})
        if existing:
            existing.polyline = [[p[0], p[1]] for p in simplified]
            existing.point_count_original = len(raw_points)
            existing.point_count_simplified = len(simplified)
            existing.total_distance_km = round(total_km, 3)
            existing.total_duration_min = duration_min
            existing.idle_minutes = idle_min
            existing.started_at = started
            existing.ended_at = ended
            existing.date = date_bucket
            await existing.save()
        else:
            doc = BDVisitRoute(
                tenant_id=tenant_id,
                bd_visit_id=visit_id,
                user_id=visit.owner_id,
                date=date_bucket,
                polyline=[[p[0], p[1]] for p in simplified],
                point_count_original=len(raw_points),
                point_count_simplified=len(simplified),
                total_distance_km=round(total_km, 3),
                total_duration_min=duration_min,
                idle_minutes=idle_min,
                started_at=started,
                ended_at=ended,
            )
            await doc.insert()
    except Exception:
        logger.exception("compute_visit_route failed for visit %s", visit_id)
