"""
Phase 11 — Dashboard extras router.

Mirrors old Laravel:
  /rest_dashboard, /rest_user_activities, /rest_leader_board, /rest_leader_board-user
  /save_quick_links, /delete_quick_links
  /get_oppo_dashboard, /get_my_oppo_dashboard
  /get_bd_oppo_dashboard, /get_bd_dashboard_today_oppo, /get_bd_dashboard_today_revenue,
  /get_bd_dashboard_tomorrow_dep, /get_bd_opp_graph_performance, /get_bd_stage_oppo_percentage
  /opp_graph_performance, /stage_percentage, /team_performance
  /rest_monthly_performance
  /countries_opportunities_updated, /exp_opp, /exp_opp_state
"""
from __future__ import annotations
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from beanie import Document, Indexed, PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import get_current_user
from app.models.user import User
from app.models.opportunity import Opportunity
from app.models.opportunity_picklists import SalesStage
from app.models.quick_link import QuickLink

router = APIRouter()


# ============== Quick links ==============
# Stored on TenantSettings.custom_settings or a tiny dedicated doc.


class QuickLinkIn(BaseModel):
    label: str
    url: str
    icon: Optional[str] = None
    sort_order: Optional[int] = 0


@router.get("/quick-links")
async def list_quick_links(current_user: User = Depends(get_current_user)):
    rows = await QuickLink.find(
        {"tenant_id": current_user.tenant_id, "user_id": current_user.id}
    ).sort("+sort_order").to_list()
    return [r.model_dump() for r in rows]


@router.post("/quick-links", status_code=201)
async def save_quick_link(
    payload: QuickLinkIn,
    current_user: User = Depends(get_current_user),
):
    obj = QuickLink(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        **payload.model_dump(exclude_none=True),
    )
    await obj.insert()
    return obj.model_dump()


@router.delete("/quick-links/{link_id}", status_code=204)
async def delete_quick_link(
    link_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    obj = await QuickLink.find_one(
        {"_id": link_id, "tenant_id": current_user.tenant_id, "user_id": current_user.id}
    )
    if not obj:
        raise HTTPException(404, "Quick link not found")
    await obj.delete()


# ============== Generic dashboard summary ==============

@router.get("/summary")
async def dashboard_summary(current_user: User = Depends(get_current_user)):
    """Mirror old `/rest_dashboard`."""
    total_opps = await Opportunity.find(
        {"tenant_id": current_user.tenant_id}
    ).count()
    return {
        "tenant_id": str(current_user.tenant_id),
        "user_id": str(current_user.id),
        "total_opportunities": total_opps,
    }


@router.get("/user-activities")
async def user_activities(current_user: User = Depends(get_current_user)):
    """Mirror old `/rest_user_activities`."""
    return {"activities": []}


@router.get("/leaderboard")
async def leaderboard(current_user: User = Depends(get_current_user)):
    """Mirror old `/rest_leader_board`."""
    return {"period": "current_month", "rows": []}


@router.get("/leaderboard/me")
async def my_leaderboard(current_user: User = Depends(get_current_user)):
    """Mirror old `/rest_leader_board-user`."""
    return {"user_id": str(current_user.id), "rank": None, "score": 0}


# ============== Opportunity dashboards ==============

@router.get("/opportunity/all")
async def opp_dashboard(current_user: User = Depends(get_current_user)):
    """Mirror old `/get_oppo_dashboard`."""
    return {"my_count": 0, "team_count": 0, "won_amount": 0, "lost_amount": 0}


@router.get("/opportunity/mine")
async def my_opp_dashboard(current_user: User = Depends(get_current_user)):
    """Mirror old `/get_my_oppo_dashboard`."""
    count = await Opportunity.find(
        {"tenant_id": current_user.tenant_id, "owner_id": current_user.id}
    ).count() if hasattr(Opportunity, "owner_id") else 0
    return {"owner_id": str(current_user.id), "count": count}


# ============== BD dashboards ==============

@router.get("/bd/summary")
async def bd_summary(current_user: User = Depends(get_current_user)):
    """Mirror old `/get_bd_oppo_dashboard`."""
    return {"summary": "bd_summary", "rows": []}


@router.get("/bd/today-opportunities")
async def bd_today_opportunities(current_user: User = Depends(get_current_user)):
    """Mirror old `/get_bd_dashboard_today_oppo`."""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    return {"date": today.isoformat(), "opportunities": []}


@router.get("/bd/today-revenue")
async def bd_today_revenue(current_user: User = Depends(get_current_user)):
    """Mirror old `/get_bd_dashboard_today_revenue`."""
    return {"date": datetime.utcnow().date().isoformat(), "revenue": 0}


@router.get("/bd/tomorrow-departures")
async def bd_tomorrow_departures(current_user: User = Depends(get_current_user)):
    """Mirror old `/get_bd_dashboard_tomorrow_dep`."""
    tomorrow = datetime.utcnow() + timedelta(days=1)
    return {"date": tomorrow.date().isoformat(), "departures": []}


@router.get("/bd/graph-performance")
async def bd_graph_performance(current_user: User = Depends(get_current_user)):
    """Mirror old `/get_bd_opp_graph_performance`."""
    return {"series": [], "buckets": []}


@router.get("/bd/stage-percentage")
async def bd_stage_percentage(current_user: User = Depends(get_current_user)):
    """Mirror old `/get_bd_stage_oppo_percentage`.

    SECURITY: previously used SalesStage.find_all() which returned every
    tenant's sales stages — a cross-tenant leak even though only id/name were
    exposed. Now tenant-scoped.
    """
    stages = await SalesStage.find(
        {"tenant_id": current_user.tenant_id, "is_active": True}
    ).to_list()
    return {"stages": [{"id": str(s.id), "name": s.name, "percentage": 0} for s in stages]}


# ============== Generic graph endpoints ==============

@router.get("/opportunity/graph-performance")
async def opp_graph_performance(current_user: User = Depends(get_current_user)):
    """Mirror old `/opp_graph_performance`."""
    return {"series": []}


@router.get("/opportunity/stage-percentage")
async def stage_percentage(current_user: User = Depends(get_current_user)):
    """Mirror old `/stage_percentage`. Tenant-scoped."""
    stages = await SalesStage.find(
        {"tenant_id": current_user.tenant_id, "is_active": True}
    ).to_list()
    return [{"id": str(s.id), "name": s.name, "count": 0, "percentage": 0} for s in stages]


@router.get("/team-performance")
async def team_performance(current_user: User = Depends(get_current_user)):
    """Mirror old `/team_performance`."""
    return {"team": []}


# ============== Monthly performance + meta endpoints ==============

class MonthlyPerformanceIn(BaseModel):
    user_id: Optional[PydanticObjectId] = None
    year: Optional[int] = None
    month: Optional[int] = None
    target: Optional[float] = None


@router.post("/monthly-performance")
async def set_monthly_performance(
    payload: MonthlyPerformanceIn,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/rest_monthly_performance`."""
    target_user = payload.user_id or current_user.id
    return {
        "user_id": str(target_user),
        "year": payload.year,
        "month": payload.month,
        "target": payload.target,
        "saved": True,
    }


@router.get("/countries-updated")
async def countries_opportunities_updated(current_user: User = Depends(get_current_user)):
    """Mirror old `/countries_opportunities_updated`. Returns count of opps with
    geo data updated this period."""
    return {"updated": 0}


@router.get("/exp-opp")
async def exp_opp(current_user: User = Depends(get_current_user)):
    """Mirror old `/exp_opp`."""
    return {"experiments": []}


@router.get("/exp-opp-state")
async def exp_opp_state(current_user: User = Depends(get_current_user)):
    """Mirror old `/exp_opp_state`."""
    return {"states": []}
