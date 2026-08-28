"""
Per-industry strategies for converting a Lead into an Opportunity.

The shared lead-conversion flow needs to:
  1. Pick an Opportunity name when none is supplied.
  2. Pull a small set of industry-specific fields into the Opportunity's
     `industry_data` dict.

Today only Travel has bespoke logic (destination resolution, pax-aware
naming). Other industries fall back to the Default strategy: name = lead's
full name; industry_data passed through unchanged from the conversion
payload.

Adding a new industry: subclass OpportunityConversionStrategy, implement
build_opportunity_name + build_opportunity_data, and register it in
_STRATEGIES below.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, Protocol

from bson import ObjectId

_logger = logging.getLogger(__name__)


class OpportunityConversionStrategy(Protocol):
    """Per-industry hooks for the lead → opportunity conversion."""

    async def build_opportunity_name(self, lead, conversion_data) -> str:
        """Return the Opportunity.name when none is supplied by the user."""
        ...

    async def build_opportunity_data(self, lead, conversion_data) -> Dict[str, Any]:
        """Return the opportunity's industry_data dict."""
        ...


# ---------------------------------------------------------------------------
# Default strategy — used by all non-travel industries today.
# ---------------------------------------------------------------------------

class DefaultOpportunityConversionStrategy:
    async def build_opportunity_name(self, lead, conversion_data) -> str:
        if conversion_data.opportunity_name:
            return conversion_data.opportunity_name
        full_name = getattr(lead, "full_name", None) or "Opportunity"
        return f"{full_name} - Opportunity"

    async def build_opportunity_data(self, lead, conversion_data) -> Dict[str, Any]:
        # Pass conversion_data.industry_data through unchanged. The shared
        # validate_industry_data call in the API layer already validated it
        # against the tenant's industry schema.
        return getattr(conversion_data, "industry_data", {}) or {}


# ---------------------------------------------------------------------------
# Travel strategy — bespoke naming + destination resolution.
# ---------------------------------------------------------------------------

def _parse_travel_date(raw) -> datetime | None:
    """Parse the various forms travel_date arrives in (datetime, ISO string, YYYY-MM-DD)."""
    if not raw:
        return None
    if isinstance(raw, datetime):
        return raw
    if isinstance(raw, str) and raw.strip():
        try:
            return datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            try:
                return datetime.strptime(raw[:10], "%Y-%m-%d")
            except (ValueError, TypeError):
                _logger.warning("Could not parse travel_date: %r", raw)
    return None


class TravelOpportunityConversionStrategy:
    async def build_opportunity_data(self, lead, conversion_data) -> Dict[str, Any]:
        lead_industry = lead.industry_data or {}
        conv_industry = getattr(conversion_data, "industry_data", {}) or {}

        travel_date = _parse_travel_date(
            conv_industry.get("travel_date") or lead_industry.get("travel_date")
        )

        # Coerce destination_ids to ObjectId and resolve names — tenant-scoped
        # so a forged destination_id cannot leak another tenant's data into
        # this opportunity.
        dest_ids: list[ObjectId] = []
        for d in (conv_industry.get("destination_ids") or lead_industry.get("destination_ids") or []):
            try:
                dest_ids.append(ObjectId(str(d)))
            except Exception:  # noqa: BLE001
                continue

        dest_names: list[str] = []
        if dest_ids:
            from app.models.destination import Destination
            destinations_objs = await Destination.find(
                {"_id": {"$in": dest_ids}, "tenant_id": lead.tenant_id, "deleted_at": None}
            ).to_list()
            dest_names = [d.name for d in destinations_objs]

        data: Dict[str, Any] = {
            "travel_date": travel_date.isoformat() if travel_date else None,
            "no_of_pax": conv_industry.get("no_of_pax") or lead_industry.get("no_of_pax") or 0,
            "no_of_adults": conv_industry.get("no_of_adults") or lead_industry.get("no_of_adults"),
            "no_of_childs": (
                conv_industry.get("no_of_childs")
                if conv_industry.get("no_of_childs") is not None
                else lead_industry.get("no_of_childs")
            ),
            "no_of_infants": (
                conv_industry.get("no_of_infants")
                if conv_industry.get("no_of_infants") is not None
                else lead_industry.get("no_of_infants")
            ),
            "no_of_nights": conv_industry.get("no_of_nights") or lead_industry.get("no_of_nights"),
            "destination_ids": [str(d) for d in dest_ids],
            "destination_names": dest_names,
        }

        experience_id = conv_industry.get("experience_id") or lead_industry.get("experience_id")
        if experience_id:
            data["experience_id"] = str(experience_id)

        return data

    async def build_opportunity_name(self, lead, conversion_data) -> str:
        if conversion_data.opportunity_name:
            return conversion_data.opportunity_name

        # Need the resolved travel data to construct the name
        data = await self.build_opportunity_data(lead, conversion_data)

        dest_names = data.get("destination_names") or []
        dest_str = dest_names[0] if dest_names else (
            getattr(lead, "company", None)
            or getattr(lead, "full_name", None)
            or "Opportunity"
        )

        no_of_pax = data.get("no_of_pax") or 0
        date_str = ""
        raw_date = data.get("travel_date")
        if raw_date:
            try:
                date_str = f"_{datetime.fromisoformat(raw_date).strftime('%d%b')}"
            except (ValueError, TypeError):
                date_str = ""

        return f"{dest_str}_{no_of_pax}Pax{date_str}"


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

_DEFAULT_STRATEGY = DefaultOpportunityConversionStrategy()
_STRATEGIES: Dict[str, OpportunityConversionStrategy] = {
    "travel": TravelOpportunityConversionStrategy(),
    "healthcare": _DEFAULT_STRATEGY,
    "education": _DEFAULT_STRATEGY,
    "manufacturing": _DEFAULT_STRATEGY,
}


def get_opportunity_conversion_strategy(industry: str) -> OpportunityConversionStrategy:
    """Return the conversion strategy for the given industry.

    Falls back to the Default strategy for unknown industries — converting a
    lead must never fail just because someone added a new industry without
    a corresponding strategy. The Phase 5 resolver already raises if the
    industry isn't supported at the tenant level, so unknown values here are
    rare.
    """
    return _STRATEGIES.get(industry, _DEFAULT_STRATEGY)


__all__ = [
    "OpportunityConversionStrategy",
    "DefaultOpportunityConversionStrategy",
    "TravelOpportunityConversionStrategy",
    "get_opportunity_conversion_strategy",
]
