"""
Per-industry dashboard KPI strategies.

The shared dashboard endpoint computes a generic set of KPIs (accounts, leads,
opportunities, this month's revenue) that apply to every industry. Each
industry can additionally surface a few vertical-specific KPIs — for travel
that's "tomorrow's departures" and "today's checkouts". Healthcare might add
"today's appointments"; manufacturing might add "production orders in progress".

Adding a new industry: subclass IndustryDashboardKPIs, implement compute(),
and register it in _STRATEGIES.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Protocol

_logger = logging.getLogger(__name__)

# Trips longer than this many nights are not counted as checkouts; it keeps the
# scan to the travel dates of the last year (index on tenant + travel_date).
_MAX_NIGHTS = 366


class IndustryDashboardKPIs(Protocol):
    """Compute industry-specific KPI fields to merge into the dashboard response."""

    async def compute(
        self,
        *,
        base_query: Dict[str, Any],
        today_start: datetime,
        today_end: datetime,
        tomorrow_start: datetime,
        tomorrow_end: datetime,
    ) -> Dict[str, Any]:
        """Return a dict of {kpi_name: value} to merge into the dashboard payload."""
        ...


class DefaultDashboardKPIs:
    """No industry-specific KPIs — returns an empty dict."""

    async def compute(self, **_kwargs) -> Dict[str, Any]:
        return {}


class TravelDashboardKPIs:
    """Travel-specific KPIs: tomorrow's departures and today's checkouts.

    Both are derived from industry_data on Opportunity (travel_date string +
    no_of_nights). The query is intentionally scoped to base_query, which the
    caller has already constrained to a single tenant.
    """

    async def compute(
        self,
        *,
        base_query: Dict[str, Any],
        today_start: datetime,
        today_end: datetime,
        tomorrow_start: datetime,
        tomorrow_end: datetime,
    ) -> Dict[str, Any]:
        from app.models.opportunity import Opportunity

        # Tomorrow's departures — travel_date is stored as an ISO string in
        # industry_data, so a range comparison is a string comparison.
        # That's safe for ISO-8601 since those sort lexicographically by date.
        tomorrow_dep_query = {
            **base_query,
            "industry_data.travel_date": {
                "$gte": tomorrow_start.isoformat(),
                "$lt": tomorrow_end.isoformat(),
            },
        }
        tomorrow_departures = await Opportunity.find(tomorrow_dep_query).count()

        # Today's checkouts — checkout date is (travel_date + no_of_nights).
        # PERF: the database does the date arithmetic in an aggregation, so the
        # app never loads every opportunity of the tenant into memory. Only the
        # day part of travel_date counts (stored as an ISO string, or a date).
        today_checkout = 0
        try:
            window_start = today_start - timedelta(days=_MAX_NIGHTS)
            travel_day = {"$dateFromString": {
                "dateString": {"$cond": [
                    {"$eq": [{"$type": "$industry_data.travel_date"}, "date"]},
                    {"$dateToString": {"date": "$industry_data.travel_date", "format": "%Y-%m-%d"}},
                    {"$substrCP": [{"$toString": "$industry_data.travel_date"}, 0, 10]},
                ]},
                "format": "%Y-%m-%d", "onError": None, "onNull": None,
            }}
            nights = {"$convert": {"input": "$industry_data.no_of_nights", "to": "long", "onError": 0, "onNull": 0}}
            rows = await Opportunity.aggregate([
                {"$match": {"$or": [
                    {**base_query, "industry_data.travel_date": {"$gte": window_start.isoformat(), "$lt": today_end.isoformat()}},
                    {**base_query, "industry_data.travel_date": {"$gte": window_start, "$lt": today_end}},
                ]}},
                {"$project": {"_id": 0, "day": travel_day, "nights": nights}},
                {"$match": {"nights": {"$gte": 1, "$lte": _MAX_NIGHTS}}},
                {"$project": {"checkout": {"$add": ["$day", {"$multiply": ["$nights", 86400000]}]}}},
                {"$match": {"checkout": {"$gte": today_start, "$lt": today_end}}},
                {"$count": "n"},
            ]).to_list()
            today_checkout = rows[0]["n"] if rows else 0
        except Exception:  # noqa: BLE001
            _logger.warning("travel today_checkout computation failed", exc_info=True)

        return {
            "today_checkout": today_checkout,
            "tomorrow_departures": tomorrow_departures,
        }


_DEFAULT_STRATEGY = DefaultDashboardKPIs()
_STRATEGIES: Dict[str, IndustryDashboardKPIs] = {
    "travel": TravelDashboardKPIs(),
    "healthcare": _DEFAULT_STRATEGY,
    "education": _DEFAULT_STRATEGY,
    "manufacturing": _DEFAULT_STRATEGY,
}


def get_dashboard_kpis_strategy(industry: str) -> IndustryDashboardKPIs:
    """Return the dashboard-KPI strategy for the given industry."""
    return _STRATEGIES.get(industry, _DEFAULT_STRATEGY)


__all__ = [
    "IndustryDashboardKPIs",
    "DefaultDashboardKPIs",
    "TravelDashboardKPIs",
    "get_dashboard_kpis_strategy",
]
