"""
Industry Module Guard — FastAPI dependency that enforces module-level access control.

Usage in route:
    @router.get("/patients", dependencies=[Depends(require_module("patients"))])
    async def list_patients(...): ...
"""

from fastapi import Depends, HTTPException, status
from app.models.user import User
from app.models.tenant import Tenant
from app.api.deps import get_current_user
from app.constants.industry_registry import INDUSTRY_MODULE_DEFAULTS


async def get_current_tenant(current_user: User = Depends(get_current_user)) -> Tenant:
    """Resolve the tenant document from the current authenticated user."""
    tenant = await Tenant.get(current_user.tenant_id)
    if not tenant or not tenant.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant not found or inactive",
        )
    return tenant


def require_module(module_name: str):
    """Return a FastAPI dependency that blocks access unless the tenant
    has the specified module enabled.

    Lazy backfill: if the module key is absent from the tenant's stored
    modules dict (because it was added to INDUSTRY_MODULE_DEFAULTS after
    the tenant was created), we check the industry defaults and auto-enable
    it rather than blocking the tenant. This keeps existing tenants working
    without manual database migrations every time a new module ships.

    Explicit False (admin deliberately disabled the module) is still
    respected — only missing keys are backfilled.

    Example:
        dependencies=[Depends(require_module("departures"))]
    """
    async def _guard(tenant: Tenant = Depends(get_current_tenant)):
        # Key is present and set to True — allow
        if tenant.modules.get(module_name) is True:
            return tenant

        # Key is present and explicitly False — deny (admin disabled it)
        if module_name in tenant.modules:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Module '{module_name}' is disabled for your organisation. "
                       f"Contact your administrator to enable it.",
            )

        # Key is missing — check if it is a default for this tenant's industry.
        # This handles modules added to INDUSTRY_MODULE_DEFAULTS after the tenant
        # was created (lazy backfill instead of a database migration).
        industry_defaults = INDUSTRY_MODULE_DEFAULTS.get(tenant.industry, {})
        if industry_defaults.get(module_name, False):
            # Persist the backfilled flag so future requests skip this branch.
            tenant.modules[module_name] = True
            await tenant.save()
            return tenant

        # Not a default for this industry and not explicitly enabled — deny.
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Module '{module_name}' is not available for your organisation. "
                   f"Contact your administrator to enable it.",
        )

    return _guard
