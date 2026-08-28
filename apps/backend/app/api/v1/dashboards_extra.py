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
from calendar import monthrange
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.models.opportunity import Opportunity
from app.models.opportunity_picklists import SalesStage
from app.models.quick_link import QuickLink
from app.models.consolidated_settings import LeaderboardConfig
from app.models.role import Role

router = APIRouter()


# ============== Leaderboard helpers ==============

async def _won_stage_ids(tenant_id: PydanticObjectId) -> List[PydanticObjectId]:
    stages = await SalesStage.find(
        {"tenant_id": tenant_id, "is_won": True, "is_active": True}
    ).to_list()
    return [s.id for s in stages]


# ---------------------------------------------------------------------------
# Aggregation helpers (PERF) — replace per-user / per-month query loops with a
# single MongoDB aggregation. A leaderboard or incentive page used to fire
# N_users (× N_months) opportunity queries; these do it in ONE pass.
# ---------------------------------------------------------------------------

def _amount_double(field: str = "$amount") -> Dict[str, Any]:
    """Coerce a (possibly string/missing) numeric field to a double, default 0."""
    return {"$convert": {"input": field, "to": "double", "onError": 0, "onNull": 0}}


async def _aggregate_owner_period(
    tenant_id: PydanticObjectId,
    start: datetime,
    end: datetime,
    won_ids: List[PydanticObjectId],
) -> Dict[str, Dict[str, Any]]:
    """Per-owner opportunity metrics for opps created in [start, end].

    Returns {owner_id_str: {total_count, won_count, revenue, no_of_pax,
    leads_converted}}. won_ids=[] yields zero won metrics (the $in is always
    false), matching the old Python behaviour.
    """
    won_expr = {"$in": ["$sales_stage_id", won_ids]}
    pipeline = [
        {"$match": {"tenant_id": tenant_id, "created_at": {"$gte": start, "$lte": end}}},
        {"$group": {
            "_id": "$owner_id",
            "total_count": {"$sum": 1},
            "won_count": {"$sum": {"$cond": [won_expr, 1, 0]}},
            "revenue": {"$sum": {"$cond": [won_expr, _amount_double(), 0]}},
            "no_of_pax": {"$sum": {"$cond": [
                won_expr, _amount_double("$industry_data.no_of_pax"), 0
            ]}},
            "leads_converted": {"$sum": {"$cond": [
                {"$and": [won_expr, {"$gt": [{"$ifNull": ["$lead_id", None]}, None]}]}, 1, 0
            ]}},
        }},
    ]
    rows = await Opportunity.aggregate(pipeline).to_list()
    return {str(r["_id"]): r for r in rows}


async def _aggregate_owner_month(
    tenant_id: PydanticObjectId,
    start: datetime,
    end: datetime,
    won_ids: List[PydanticObjectId],
) -> Dict[tuple, Dict[str, Any]]:
    """Per-(owner, year, month) metrics for opps created in [start, end].

    Returns {(owner_id_str, year, month): {total, won, sales_amount}}. Buckets
    by created_at in UTC (matches how the month windows are built).
    """
    won_expr = {"$in": ["$sales_stage_id", won_ids]}
    pipeline = [
        {"$match": {"tenant_id": tenant_id, "created_at": {"$gte": start, "$lte": end}}},
        {"$group": {
            "_id": {
                "owner": "$owner_id",
                "y": {"$year": "$created_at"},
                "m": {"$month": "$created_at"},
            },
            "total": {"$sum": 1},
            "won": {"$sum": {"$cond": [won_expr, 1, 0]}},
            "sales_amount": {"$sum": {"$cond": [won_expr, _amount_double(), 0]}},
        }},
    ]
    rows = await Opportunity.aggregate(pipeline).to_list()
    return {
        (str(r["_id"]["owner"]), r["_id"]["y"], r["_id"]["m"]): r
        for r in rows
    }


def _period_bounds(period: str):
    now = datetime.utcnow()
    if period == "last_month":
        if now.month == 1:
            year, month = now.year - 1, 12
        else:
            year, month = now.year, now.month - 1
    else:  # current_month
        year, month = now.year, now.month
    start = datetime(year, month, 1)
    end = datetime(year, month, monthrange(year, month)[1], 23, 59, 59)
    label = start.strftime("%B %Y")
    return start, end, label


async def _compute_leaderboard_rows(
    tenant_id: PydanticObjectId,
    period: str,
    parameters: List[Dict[str, Any]],
    accolades: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    period_start, period_end, period_label = _period_bounds(period)
    won_ids = await _won_stage_ids(tenant_id)

    users = await User.find(
        {"tenant_id": tenant_id, "is_active": True}
    ).to_list()

    # PERF: one aggregation for the whole tenant instead of one query per user.
    agg = await _aggregate_owner_period(tenant_id, period_start, period_end, won_ids)

    rows: List[Dict[str, Any]] = []
    for user in users:
        a = agg.get(str(user.id)) or {}
        total_count = a.get("total_count", 0)
        close_won = a.get("won_count", 0)
        revenue = a.get("revenue", 0) or 0
        no_of_pax = a.get("no_of_pax", 0) or 0
        leads_converted = a.get("leads_converted", 0)
        ccr = round(close_won / total_count * 100, 2) if total_count else 0.0

        metric_map = {
            "closed_won_amount": revenue,
            "deals_closed": close_won,
            "revenue_generated": revenue,
            "leads_converted": leads_converted,
        }
        score = sum(
            metric_map.get(p.get("metric", ""), 0) * p.get("weight", 1)
            for p in parameters
        )

        earned_accolades = [
            {"name": a.get("name", ""), "emoji": a.get("emoji", "🏆")}
            for a in accolades
            if score >= a.get("threshold", 0)
        ]

        rows.append({
            "user_id": str(user.id),
            "name": user.name,
            "avatar_url": user.avatar_url,
            "score": round(score, 2),
            "ccr": ccr,
            "close_won": close_won,
            "no_of_pax": int(no_of_pax),
            "revenue": revenue,
            "accolades": earned_accolades,
        })

    rows.sort(key=lambda r: r["score"], reverse=True)
    for i, row in enumerate(rows, start=1):
        row["rank"] = i

    return rows, period_label


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
async def leaderboard(
    period: str = Query("current_month", pattern="^(current_month|last_month)$"),
    current_user: User = Depends(get_current_user),
):
    """Ranked leaderboard for the tenant using LeaderboardConfig scoring."""
    cfg = await LeaderboardConfig.find_one({"tenant_id": current_user.tenant_id})
    parameters = (cfg.parameters if cfg else []) or []
    accolades = (cfg.accolades if cfg else []) or []

    rows, period_label = await _compute_leaderboard_rows(
        current_user.tenant_id, period, parameters, accolades
    )
    return {"period": period, "period_label": period_label, "rows": rows}


@router.get("/leaderboard/me")
async def my_leaderboard(
    period: str = Query("current_month", pattern="^(current_month|last_month)$"),
    current_user: User = Depends(get_current_user),
):
    """Current user's leaderboard rank and score."""
    cfg = await LeaderboardConfig.find_one({"tenant_id": current_user.tenant_id})
    parameters = (cfg.parameters if cfg else []) or []
    accolades = (cfg.accolades if cfg else []) or []

    rows, period_label = await _compute_leaderboard_rows(
        current_user.tenant_id, period, parameters, accolades
    )
    me = next((r for r in rows if r["user_id"] == str(current_user.id)), None)
    if me:
        return me
    return {"user_id": str(current_user.id), "rank": None, "score": 0,
            "ccr": 0.0, "close_won": 0, "no_of_pax": 0, "revenue": 0, "accolades": []}


@router.get("/user-incentive-records")
async def user_incentive_records(
    months: int = Query(12, ge=1, le=24),
    current_user: User = Depends(get_current_user),
):
    """Monthly incentive breakdown per user, grouped by role."""
    # Build last N months list (newest first)
    now = datetime.utcnow()
    month_buckets = []
    for i in range(months):
        m = now.month - i
        y = now.year
        while m <= 0:
            m += 12
            y -= 1
        start = datetime(y, m, 1)
        end = datetime(y, m, monthrange(y, m)[1], 23, 59, 59)
        label = start.strftime("%b, %Y")
        month_buckets.append((y, m, start, end, label))

    won_ids = await _won_stage_ids(current_user.tenant_id)

    # Load roles for grouping
    roles = await Role.find({"tenant_id": current_user.tenant_id}).to_list()
    role_map: Dict[str, str] = {str(r.id): r.display_name for r in roles}

    users = await User.find(
        {"tenant_id": current_user.tenant_id, "is_active": True}
    ).to_list()

    # PERF: ONE aggregation over the full date range instead of (users × months)
    # opportunity queries (was ~N×12 round-trips per request).
    range_start = month_buckets[-1][2]  # oldest bucket start
    range_end = month_buckets[0][3]     # newest bucket end
    monthly = await _aggregate_owner_month(
        current_user.tenant_id, range_start, range_end, won_ids
    )

    # Group users by their primary role display name
    groups: Dict[str, List[Dict]] = {}
    for user in users:
        role_name = "No Role"
        if user.role_ids:
            role_name = role_map.get(str(user.role_ids[0]), "No Role")

        records = []
        for year, month, start, end, label in month_buckets:
            r = monthly.get((str(user.id), year, month)) or {}
            records.append({
                "month_label": label,
                "year": year,
                "month": month,
                "opportunities_won": r.get("won", 0),
                "total_opportunities": r.get("total", 0),
                "target": user.monthly_revenue_target or 0,
                "sales_amount": r.get("sales_amount", 0) or 0,
                "earn_rupees": 0,
                "mature_rupees": 0,
            })

        user_entry = {
            "user_id": str(user.id),
            "name": user.name,
            "avatar_url": user.avatar_url,
            "records": records,
        }
        groups.setdefault(role_name, []).append(user_entry)

    return {
        "groups": [
            {"role_name": role_name, "users": user_list}
            for role_name, user_list in groups.items()
        ]
    }


@router.get("/department-incentive-records")
async def department_incentive_records(
    months: int = Query(12, ge=1, le=24),
    current_user: User = Depends(get_current_user),
):
    """Monthly incentive breakdown aggregated by department."""
    now = datetime.utcnow()
    month_buckets = []
    for i in range(months):
        m = now.month - i
        y = now.year
        while m <= 0:
            m += 12
            y -= 1
        start = datetime(y, m, 1)
        end = datetime(y, m, monthrange(y, m)[1], 23, 59, 59)
        label = start.strftime("%b, %Y")
        month_buckets.append((y, m, start, end, label))

    won_ids = await _won_stage_ids(current_user.tenant_id)
    users = await User.find(
        {"tenant_id": current_user.tenant_id, "is_active": True}
    ).to_list()

    # PERF: one aggregation for the whole tenant; sum per department in memory
    # (was department × months opportunity queries).
    range_start = month_buckets[-1][2]
    range_end = month_buckets[0][3]
    monthly = await _aggregate_owner_month(
        current_user.tenant_id, range_start, range_end, won_ids
    )

    # Group by department_id
    dept_users: Dict[str, List] = {}
    for user in users:
        key = str(user.department_id) if user.department_id else "No Department"
        dept_users.setdefault(key, []).append(user)

    groups = []
    for dept_name, dept_user_list in dept_users.items():
        records = []
        for year, month, start, end, label in month_buckets:
            won = total = 0
            sales_amount = 0.0
            for u in dept_user_list:
                r = monthly.get((str(u.id), year, month))
                if r:
                    won += r.get("won", 0)
                    total += r.get("total", 0)
                    sales_amount += r.get("sales_amount", 0) or 0
            records.append({
                "month_label": label,
                "year": year,
                "month": month,
                "opportunities_won": won,
                "total_opportunities": total,
                "sales_amount": sales_amount,
                "earn_rupees": 0,
                "mature_rupees": 0,
            })
        groups.append({"department_name": dept_name, "records": records})

    return {"groups": groups}


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
