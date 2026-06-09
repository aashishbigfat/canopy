import pytest
from fastapi import HTTPException

from app.core.industry_guard import resolve_industry_data


@pytest.mark.asyncio
async def test_travel_lead_requires_industry_data(monkeypatch):
    async def _fake_industry(_tid):
        return "travel"

    monkeypatch.setattr(
        "app.core.industry_guard.get_tenant_industry",
        _fake_industry,
    )

    with pytest.raises(HTTPException) as exc:
        await resolve_industry_data(
            "tenant",
            None,
            mode="lead",
            require_for_travel=True,
        )
    assert exc.value.status_code == 422


@pytest.mark.asyncio
async def test_healthcare_skips_travel_requirement(monkeypatch):
    async def _fake_industry(_tid):
        return "healthcare"

    monkeypatch.setattr(
        "app.core.industry_guard.get_tenant_industry",
        _fake_industry,
    )

    result = await resolve_industry_data(
        "tenant",
        None,
        mode="lead",
        require_for_travel=True,
    )
    assert result is None
