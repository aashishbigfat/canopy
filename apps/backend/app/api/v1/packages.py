"""
Package API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.models.user import User
from app.schemas.package import (
    PackageCreate, PackageUpdate, PackageResponse,
    PackageDetailResponse, PackageListResponse,
    PackagePricingCreate, PackagePricingResponse
)
from app.services.package_service import PackageService
from app.api.deps import get_current_user, check_permission

router = APIRouter()

@router.post("/", response_model=PackageDetailResponse, status_code=201)
async def create_package(
    package_data: PackageCreate,
    current_user: User = Depends(check_permission("create_package"))
):
    """Create a new package with pricing tiers"""
    service = PackageService()
    package = await service.create_package(
        package_data,
        current_user.id,
        current_user.tenant_id
    )
    
    # Get with pricing
    result = await service.get_package_with_pricing(
        str(package.id),
        current_user.tenant_id
    )
    
    return PackageDetailResponse(
        **PackageResponse.from_orm(result["package"]).model_dump(),
        pricing_tiers=[PackagePricingResponse.from_orm(t) for t in result["pricing_tiers"]]
    )


@router.get("/", response_model=PackageListResponse)
async def get_packages(
    category: Optional[str] = None,
    is_featured: Optional[bool] = None,
    current_user: User = Depends(check_permission("view_package"))
):
    """Get all packages"""
    service = PackageService()
    
    packages = await service.get_packages_by_tenant(
        current_user.tenant_id,
        category=category,
        is_featured=is_featured
    )
    
    return PackageListResponse(
        packages=[PackageResponse.from_orm(p) for p in packages],
        total=len(packages)
    )


@router.get("/search")
async def search_packages(
    query: str,
    current_user: User = Depends(check_permission("view_package"))
):
    """Search packages"""
    service = PackageService()
    
    packages = await service.search_packages(query, current_user.tenant_id)
    
    return {
        "packages": [PackageResponse.from_orm(p) for p in packages],
        "total": len(packages)
    }


@router.get("/{package_id}", response_model=PackageDetailResponse)
async def get_package(
    package_id: str,
    current_user: User = Depends(check_permission("view_package"))
):
    """Get package by ID with pricing tiers"""
    service = PackageService()
    
    result = await service.get_package_with_pricing(
        package_id,
        current_user.tenant_id
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Package not found")
    
    return PackageDetailResponse(
        **PackageResponse.from_orm(result["package"]).model_dump(),
        pricing_tiers=[PackagePricingResponse.from_orm(t) for t in result["pricing_tiers"]]
    )


@router.put("/{package_id}", response_model=PackageResponse)
async def update_package(
    package_id: str,
    package_data: PackageUpdate,
    current_user: User = Depends(check_permission("edit_package"))
):
    """Update a package"""
    service = PackageService()
    
    package = await service.update_package(
        package_id,
        package_data,
        current_user.id,
        current_user.tenant_id
    )
    
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    return PackageResponse.from_orm(package)


@router.delete("/{package_id}")
async def delete_package(
    package_id: str,
    current_user: User = Depends(check_permission("delete_package"))
):
    """Delete a package (soft delete)"""
    service = PackageService()
    
    success = await service.delete_package(package_id, current_user.tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Package not found")
    
    return {
        "error": False,
        "message": "Package deleted successfully"
    }


@router.post("/{package_id}/pricing", response_model=PackagePricingResponse, status_code=201)
async def add_pricing_tier(
    package_id: str,
    tier_data: PackagePricingCreate,
    current_user: User = Depends(check_permission("edit_package"))
):
    """Add a pricing tier to a package"""
    service = PackageService()
    
    tier = await service.create_pricing_tier(
        package_id,
        tier_data,
        current_user.tenant_id
    )
    
    return PackagePricingResponse.from_orm(tier)


@router.post("/opportunity/{opportunity_id}/link")
async def link_package_to_opportunity(
    opportunity_id: str,
    package_id: str = Query(...),
    custom_price: Optional[float] = None,
    notes: Optional[str] = None,
    current_user: User = Depends(check_permission("edit_opportunity"))
):
    """Link package to opportunity"""
    service = PackageService()
    
    await service.link_to_opportunity(
        package_id,
        opportunity_id,
        current_user.tenant_id,
        custom_price=custom_price,
        notes=notes
    )
    
    return {
        "error": False,
        "message": "Package linked to opportunity successfully"
    }


@router.delete("/opportunity/{opportunity_id}/unlink")
async def unlink_package_from_opportunity(
    opportunity_id: str,
    package_id: str = Query(...),
    current_user: User = Depends(check_permission("edit_opportunity"))
):
    """Unlink package from opportunity"""
    service = PackageService()
    
    success = await service.unlink_from_opportunity(package_id, opportunity_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Link not found")
    
    return {
        "error": False,
        "message": "Package unlinked from opportunity successfully"
    }


@router.get("/opportunity/{opportunity_id}")
async def get_opportunity_packages(
    opportunity_id: str,
    current_user: User = Depends(check_permission("view_opportunity"))
):
    """Get all packages for an opportunity"""
    service = PackageService()
    
    packages = await service.get_packages_for_opportunity(
        opportunity_id,
        current_user.tenant_id
    )
    
    return {
        "packages": [
            {
                "package": PackageResponse.from_orm(p["package"]),
                "custom_price": p["custom_price"],
                "notes": p["notes"]
            }
            for p in packages
        ],
        "total": len(packages)
    }
