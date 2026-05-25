"""Live tracking API — GPS pings for BD field visits."""
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.api.deps import check_permission
from app.models.user import User
from app.services.tracking_service import tracking_service
from app.services.visibility_scope import get_visible_owner_ids

router = APIRouter()


class PingItem(BaseModel):
    lat: float
    lng: float
    recorded_at: str  # ISO datetime
    bd_visit_id: Optional[str] = None
    accuracy_m: Optional[float] = None
    speed_mps: Optional[float] = None
    heading_deg: Optional[float] = None
    altitude_m: Optional[float] = None
    battery_pct: Optional[int] = None
    source: Optional[str] = "device"


class PingBatch(BaseModel):
    pings: List[PingItem] = Field(..., max_length=500)


@router.post("/pings")
async def ingest_pings(
    payload: PingBatch,
    current_user: User = Depends(check_permission("check_in_bd_visit")),
):
    try:
        result = await tracking_service.ingest_pings(
            current_user,
            [p.model_dump() for p in payload.pings],
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    return result


@router.get("/pings/visit/{visit_id}")
async def pings_for_visit(
    visit_id: str,
    current_user: User = Depends(check_permission("view_live_tracking")),
):
    try:
        vid = ObjectId(visit_id)
    except Exception:
        raise HTTPException(400, "Invalid visit_id")
    pings = await tracking_service.pings_for_visit(current_user.tenant_id, vid)
    return [
        {
            "lat": p.lat, "lng": p.lng,
            "accuracy_m": p.accuracy_m, "speed_mps": p.speed_mps,
            "heading_deg": p.heading_deg, "battery_pct": p.battery_pct,
            "recorded_at": p.recorded_at.isoformat(),
        }
        for p in pings
    ]


@router.get("/live")
async def live_team_locations(
    max_age_minutes: int = Query(10, ge=1, le=60),
    current_user: User = Depends(check_permission("view_live_tracking")),
):
    """Latest ping per subordinate user (within max_age_minutes)."""
    visible = await get_visible_owner_ids(current_user)
    # If admin (None) we still need a concrete user_ids list; pull a reasonable cap.
    if visible is None:
        from app.models.user import User as UserModel
        users = await UserModel.find({"tenant_id": current_user.tenant_id, "is_active": True}).limit(500).to_list()
        user_ids = [u.id for u in users]
    else:
        user_ids = list(visible)
    return await tracking_service.live_team_locations(
        current_user.tenant_id, user_ids, max_age_minutes=max_age_minutes,
    )


@router.get("/route/visit/{visit_id}")
async def route_for_visit(
    visit_id: str,
    current_user: User = Depends(check_permission("view_live_tracking")),
):
    """Get the simplified polyline + metrics for a completed visit."""
    from app.models.bd_visit_route import BDVisitRoute
    try:
        vid = ObjectId(visit_id)
    except Exception:
        raise HTTPException(400, "Invalid visit_id")
    route = await BDVisitRoute.find_one({"bd_visit_id": vid, "tenant_id": current_user.tenant_id})
    if not route:
        return None
    return {
        "bd_visit_id": str(route.bd_visit_id),
        "user_id": str(route.user_id),
        "date": route.date.isoformat(),
        "polyline": route.polyline,
        "point_count_original": route.point_count_original,
        "point_count_simplified": route.point_count_simplified,
        "total_distance_km": route.total_distance_km,
        "total_duration_min": route.total_duration_min,
        "idle_minutes": route.idle_minutes,
        "started_at": route.started_at.isoformat() if route.started_at else None,
        "ended_at": route.ended_at.isoformat() if route.ended_at else None,
    }


@router.get("/users/{user_id}/latest")
async def latest_for_user(
    user_id: str,
    current_user: User = Depends(check_permission("view_live_tracking")),
):
    try:
        uid = ObjectId(user_id)
    except Exception:
        raise HTTPException(400, "Invalid user_id")
    visible = await get_visible_owner_ids(current_user)
    if visible is not None and uid not in visible:
        raise HTTPException(403, "Not in your visibility scope")
    ping = await tracking_service.latest_for_user(current_user.tenant_id, uid)
    if not ping:
        return None
    return {
        "lat": ping.lat, "lng": ping.lng,
        "accuracy_m": ping.accuracy_m, "battery_pct": ping.battery_pct,
        "bd_visit_id": str(ping.bd_visit_id) if ping.bd_visit_id else None,
        "recorded_at": ping.recorded_at.isoformat(),
    }
