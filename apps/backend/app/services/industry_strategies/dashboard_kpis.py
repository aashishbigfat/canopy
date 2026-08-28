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

        # Today's checkouts — must compute in-app because checkout date is
        # (travel_date + no_of_nights) and Mongo can't do that arithmetic on
        # a string field without an aggregation pipeline.
        today_checkout = 0
        try:
            checkout_candidates = await Opportunity.find(
                {**base_query, "industry_data.travel_date": {"$exists": True}}
            ).to_list()
            for opp in checkout_candidates:
                industry_data = opp.industry_data or {}
                td = industry_data.get("travel_date")
                nights = industry_data.get("no_of_nights", 0) or 0
                if not td or not nights:
                    continue
                try:
                    if isinstance(td, str):
                        td_dt = datetime.fromisoformat(td.replace("Z", "+00:00")).replace(tzinfo=None)
                    elif isinstance(td, datetime):
                        td_dt = td
                    else:
                        continue
                    checkout_dt = td_dt + timedelta(days=int(nights))
                    if today_start <= checkout_dt < today_end:
                        today_checkout += 1
                except (ValueError, TypeError):
                    continue
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
