"""
Industry Data Validation Dispatcher.

Central entry point that routes industry_data validation to the correct
Pydantic schema based on the tenant's industry type.

Usage:
    from app.schemas.industry_data import validate_industry_data

    validated = validate_industry_data("healthcare", raw_dict, mode="lead")
"""

from typing import Any, Dict, Optional, Type
from pydantic import BaseModel

from app.schemas.industry_data.travel import TravelLeadData, TravelOpportunityData, TravelQuoteData
from app.schemas.industry_data.healthcare import HealthcareLeadData, HealthcareOpportunityData, HealthcareQuoteData
from app.schemas.industry_data.education import EducationLeadData, EducationOpportunityData, EducationQuoteData
from app.schemas.industry_data.manufacturing import ManufacturingLeadData, ManufacturingOpportunityData, ManufacturingQuoteData


# ---------------------------------------------------------------------------
# Validator Registries
# ---------------------------------------------------------------------------
LEAD_VALIDATORS: Dict[str, Type[BaseModel]] = {
    "travel": TravelLeadData,
    "healthcare": HealthcareLeadData,
    "education": EducationLeadData,
    "manufacturing": ManufacturingLeadData,
}

OPPORTUNITY_VALIDATORS: Dict[str, Type[BaseModel]] = {
    "travel": TravelOpportunityData,
    "healthcare": HealthcareOpportunityData,
    "education": EducationOpportunityData,
    "manufacturing": ManufacturingOpportunityData,
}

QUOTE_VALIDATORS: Dict[str, Type[BaseModel]] = {
    "travel": TravelQuoteData,
    "healthcare": HealthcareQuoteData,
    "education": EducationQuoteData,
    "manufacturing": ManufacturingQuoteData,
}

# Map mode strings to their registries
_REGISTRY_MAP = {
    "lead": LEAD_VALIDATORS,
    "opportunity": OPPORTUNITY_VALIDATORS,
    "quote": QUOTE_VALIDATORS,
}


def validate_industry_data(
    industry: str,
    data: Dict[str, Any],
    mode: str = "lead",
) -> Dict[str, Any]:
    """Validate industry_data against the correct Pydantic schema.

    Args:
        industry: The tenant's industry identifier (e.g. "travel").
        data: Raw industry_data dict from the API request.
        mode: "lead", "opportunity", or "quote" — selects the validator registry.

    Returns:
        Validated and cleaned dict (None values excluded).

    Raises:
        pydantic.ValidationError on invalid data.
    """
    registry = _REGISTRY_MAP.get(mode)
    if registry is None:
        # Unknown mode — pass through without validation
        return data

    schema_cls = registry.get(industry)

    if schema_cls is None:
        # Unknown industry — pass through without validation
        return data

    validated = schema_cls(**data)
    return validated.model_dump(exclude_none=True)


def get_industry_data_schema(
    industry: str,
    mode: str = "lead",
) -> Optional[Type[BaseModel]]:
    """Return the Pydantic schema class for a given industry + mode.
    Returns None if not found."""
    registry = _REGISTRY_MAP.get(mode, LEAD_VALIDATORS)
    return registry.get(industry)
