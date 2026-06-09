"""
Industry-data validation helpers — every write path must use these instead of
storing raw ``industry_data`` dicts from the request body.
"""
from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import HTTPException

from app.schemas.industry_data import validate_industry_data
from app.services.industry_service import get_tenant_industry


async def resolve_industry_data(
    tenant_id,
    data: Optional[Dict[str, Any]],
    *,
    mode: str,
    require_for_travel: bool = False,
) -> Optional[Dict[str, Any]]:
    """
    Validate (and normalize) industry_data for the tenant's industry.

    Args:
        tenant_id: Current tenant.
        data: Raw industry_data from the request (may be None).
        mode: One of lead | opportunity | account | contact | quote.
        require_for_travel: When True, travel tenants must send industry_data.
    """
    industry = await get_tenant_industry(tenant_id)

    if require_for_travel and industry == "travel" and not data:
        raise HTTPException(status_code=422, detail="Travel details are required.")

    if data is None:
        return None

    if not data:
        return {}

    return validate_industry_data(industry=industry, data=data, mode=mode)
