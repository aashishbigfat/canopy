"""
Supplier API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from bson import ObjectId

from app.models.user import User
from app.schemas.supplier import (
    SupplierCreate, SupplierUpdate, SupplierResponse, SupplierListResponse
)
from app.services.supplier_service import SupplierService
from app.api.deps import get_current_user, check_permission

router = APIRouter()

@router.post("/", response_model=SupplierResponse, status_code=201)
async def create_supplier(
    supplier_data: SupplierCreate,
    current_user: User = Depends(check_permission("create_supplier"))
):
    """Create a new supplier"""
    service = SupplierService()
    supplier = await service.create_supplier(
        supplier_data,
        current_user.id,
        current_user.tenant_id
    )
    
    return SupplierResponse.from_orm(supplier)


@router.get("/", response_model=SupplierListResponse)
async def get_suppliers(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    supplier_type: Optional[str] = None,
    is_preferred: Optional[bool] = None,
    current_user: User = Depends(check_permission("view_supplier"))
):
    """Get all suppliers with pagination"""
    service = SupplierService()
    
    skip = (page - 1) * per_page
    suppliers, total = await service.get_suppliers_by_tenant(
        current_user.tenant_id,
        skip=skip,
        limit=per_page,
        supplier_type=supplier_type,
        is_preferred=is_preferred
    )
    
    pages = (total + per_page - 1) // per_page
    
    return SupplierListResponse(
        suppliers=[SupplierResponse.from_orm(s) for s in suppliers],
        total=total,
        page=page,
        per_page=per_page,
        pages=pages
    )


@router.get("/search")
async def search_suppliers(
    query: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    current_user: User = Depends(check_permission("view_supplier"))
):
    """Search suppliers"""
    service = SupplierService()
    
    skip = (page - 1) * per_page
    suppliers, total = await service.search_suppliers(
        query,
        current_user.tenant_id,
        skip=skip,
        limit=per_page
    )
    
    return {
        "suppliers": [SupplierResponse.from_orm(s) for s in suppliers],
        "total": total
    }


@router.get("/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(
    supplier_id: str,
    current_user: User = Depends(check_permission("view_supplier"))
):
    """Get supplier by ID"""
    service = SupplierService()
    supplier = await service.get_supplier(supplier_id, current_user.tenant_id)
    
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    return SupplierResponse.from_orm(supplier)


@router.put("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: str,
    supplier_data: SupplierUpdate,
    current_user: User = Depends(check_permission("edit_supplier"))
):
    """Update a supplier"""
    service = SupplierService()
    supplier = await service.update_supplier(
        supplier_id,
        supplier_data,
        current_user.id,
        current_user.tenant_id
    )
    
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    return SupplierResponse.from_orm(supplier)


@router.delete("/{supplier_id}")
async def delete_supplier(
    supplier_id: str,
    current_user: User = Depends(check_permission("delete_supplier"))
):
    """Delete a supplier (soft delete)"""
    service = SupplierService()
    success = await service.delete_supplier(supplier_id, current_user.tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    return {
        "error": False,
        "message": "Supplier deleted successfully"
    }


@router.post("/opportunity/{opportunity_id}/link")
async def link_supplier_to_opportunity(
    opportunity_id: str,
    supplier_id: str = Query(...),
    cost: Optional[float] = None,
    notes: Optional[str] = None,
    current_user: User = Depends(check_permission("edit_opportunity"))
):
    """Link supplier to opportunity"""
    service = SupplierService()
    
    await service.link_to_opportunity(
        opportunity_id,
        supplier_id,
        current_user.tenant_id,
        cost=cost,
        notes=notes
    )
    
    return {
        "error": False,
        "message": "Supplier linked to opportunity successfully"
    }


@router.delete("/opportunity/{opportunity_id}/unlink")
async def unlink_supplier_from_opportunity(
    opportunity_id: str,
    supplier_id: str = Query(...),
    current_user: User = Depends(check_permission("edit_opportunity"))
):
    """Unlink supplier from opportunity"""
    service = SupplierService()
    
    success = await service.unlink_from_opportunity(opportunity_id, supplier_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Link not found")
    
    return {
        "error": False,
        "message": "Supplier unlinked from opportunity successfully"
    }


@router.get("/opportunity/{opportunity_id}")
async def get_opportunity_suppliers(
    opportunity_id: str,
    current_user: User = Depends(check_permission("view_opportunity"))
):
    """Get all suppliers for an opportunity"""
    service = SupplierService()
    
    suppliers = await service.get_suppliers_for_opportunity(
        opportunity_id,
        current_user.tenant_id
    )
    
    return {
        "suppliers": [
            {
                "supplier": SupplierResponse.from_orm(s["supplier"]),
                "cost": s["cost"],
                "notes": s["notes"]
            }
            for s in suppliers
        ],
        "total": len(suppliers)
    }
