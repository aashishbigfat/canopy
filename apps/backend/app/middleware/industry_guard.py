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

    Example:
        dependencies=[Depends(require_module("patients"))]
    """
    async def _guard(tenant: Tenant = Depends(get_current_tenant)):
        if not tenant.modules.get(module_name, False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Module '{module_name}' is not enabled for your organisation. "
                       f"Contact your administrator to enable it.",
            )
        return tenant

    return _guard
