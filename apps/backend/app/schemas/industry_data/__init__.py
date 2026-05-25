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

from app.schemas.industry_data.travel import (
    TravelLeadData, TravelOpportunityData, TravelQuoteData,
    TravelAccountData, TravelContactData
)
from app.schemas.industry_data.healthcare import (
    HealthcareLeadData, HealthcareOpportunityData, HealthcareQuoteData,
    HealthcareAccountData, HealthcareContactData
)
from app.schemas.industry_data.education import (
    EducationLeadData, EducationOpportunityData, EducationQuoteData,
    EducationAccountData, EducationContactData
)
from app.schemas.industry_data.manufacturing import (
    ManufacturingLeadData, ManufacturingOpportunityData, ManufacturingQuoteData,
    ManufacturingAccountData, ManufacturingContactData
)


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

ACCOUNT_VALIDATORS: Dict[str, Type[BaseModel]] = {
    "travel": TravelAccountData,
    "healthcare": HealthcareAccountData,
    "education": EducationAccountData,
    "manufacturing": ManufacturingAccountData,
}

CONTACT_VALIDATORS: Dict[str, Type[BaseModel]] = {
    "travel": TravelContactData,
    "healthcare": HealthcareContactData,
    "education": EducationContactData,
    "manufacturing": ManufacturingContactData,
}

# Map mode strings to their registries
_REGISTRY_MAP = {
    "lead": LEAD_VALIDATORS,
    "opportunity": OPPORTUNITY_VALIDATORS,
    "quote": QUOTE_VALIDATORS,
    "account": ACCOUNT_VALIDATORS,
    "contact": CONTACT_VALIDATORS,
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
        mode: "lead", "opportunity", "quote", "account", or "contact".

    Returns:
        Validated and cleaned dict (None values excluded).

    Raises:
        ValueError on unknown `mode` or `industry` (was previously a silent
        pass-through, which masked configuration drift — a misspelled industry
        like "healtcare" would write unvalidated data to the DB).
        pydantic.ValidationError on invalid field values.
    """
    registry = _REGISTRY_MAP.get(mode)
    if registry is None:
        raise ValueError(
            f"validate_industry_data: unknown mode '{mode}'. "
            f"Supported modes: {sorted(_REGISTRY_MAP.keys())}"
        )

    schema_cls = registry.get(industry)
    if schema_cls is None:
        raise ValueError(
            f"validate_industry_data: no {mode} validator for industry '{industry}'. "
            f"Supported industries: {sorted(registry.keys())}"
        )

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
