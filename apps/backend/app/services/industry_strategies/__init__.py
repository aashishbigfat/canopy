"""
Industry-vertical behavior strategies.

Centralizes the per-industry differences that used to live as `if is_travel:`
branches inside lead_service / dashboard_service. New industries plug in by
defining a strategy class and registering it — no shared service code changes.

Available strategies:
  - OpportunityConversionStrategy: builds the opportunity name + industry_data
    when a lead is converted.
  - IndustryDashboardKPIs: returns industry-specific KPI fields for the dashboard.
"""
from app.services.industry_strategies.opportunity_conversion import (
    OpportunityConversionStrategy,
    get_opportunity_conversion_strategy,
)
from app.services.industry_strategies.dashboard_kpis import (
    IndustryDashboardKPIs,
    get_dashboard_kpis_strategy,
)

__all__ = [
    "OpportunityConversionStrategy",
    "get_opportunity_conversion_strategy",
    "IndustryDashboardKPIs",
    "get_dashboard_kpis_strategy",
]
