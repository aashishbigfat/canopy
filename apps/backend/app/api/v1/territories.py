"""
API endpoints for Regions and Territories.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_user, check_permission
from app.models.user import User
from app.services.territory_service import territory_service
from app.schemas.territory import (
    RegionCreate, RegionUpdate, RegionResponse, RegionListResponse,
    TerritoryCreate, TerritoryUpdate, TerritoryResponse, TerritoryListResponse,
    TerritoryAssignmentRequest, TerritoryAssignmentResponse
)

router = APIRouter()


# ==================== Regions ====================

@router.post("/regions", response_model=RegionResponse)
async def create_region(
    data: RegionCreate,
    current_user: User = Depends(check_permission("manage_territory"))
):
    """Create a new region."""
    region = await territory_service.create_region(
        data=data,
        user_id=str(current_user.id),
        tenant_id=str(current_user.tenant_id)
    )
    return RegionResponse(
        id=str(region.id),
        **region.model_dump(exclude={"id"})
    )


@router.get("/regions", response_model=RegionListResponse)
async def list_regions(
    parent_id: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """List regions."""
    regions, total = await territory_service.list_regions(
        tenant_id=current_user.tenant_id,
        parent_id=parent_id,
        is_active=is_active,
        search=search,
        page=page,
        per_page=per_page
    )
    return RegionListResponse(
        regions=[
            RegionResponse(id=str(r.id), **r.model_dump(exclude={"id"}))
            for r in regions
        ],
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/regions/{region_id}", response_model=RegionResponse)
async def get_region(
    region_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a region by ID."""
    region = await territory_service.get_region(region_id, current_user.tenant_id)
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
    return RegionResponse(
        id=str(region.id),
        **region.model_dump(exclude={"id"})
    )


@router.put("/regions/{region_id}", response_model=RegionResponse)
async def update_region(
    region_id: str,
    data: RegionUpdate,
    current_user: User = Depends(check_permission("manage_territory"))
):
    """Update a region."""
    region = await territory_service.update_region(
        region_id=region_id,
        data=data,
        tenant_id=current_user.tenant_id
    )
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
    return RegionResponse(
        id=str(region.id),
        **region.model_dump(exclude={"id"})
    )


@router.delete("/regions/{region_id}")
async def delete_region(
    region_id: str,
    current_user: User = Depends(check_permission("manage_territory"))
):
    """Delete a region."""
    try:
        deleted = await territory_service.delete_region(region_id, current_user.tenant_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Region not found")
        return {"message": "Region deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== Territories ====================

@router.post("/territories", response_model=TerritoryResponse)
async def create_territory(
    data: TerritoryCreate,
    current_user: User = Depends(check_permission("manage_territory"))
):
    """Create a new territory."""
    try:
        territory = await territory_service.create_territory(
            data=data,
            user_id=str(current_user.id),
            tenant_id=current_user.tenant_id
        )
        return TerritoryResponse(
            id=str(territory.id),
            **territory.model_dump(exclude={"id"})
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/territories", response_model=TerritoryListResponse)
async def list_territories(
    region_id: Optional[str] = Query(None),
    parent_id: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """List territories."""
    territories, total = await territory_service.list_territories(
        tenant_id=current_user.tenant_id,
        region_id=region_id,
        parent_id=parent_id,
        user_id=user_id,
        search=search,
        page=page,
        per_page=per_page
    )
    
    # Enrich with region names for response
    response_list = []
    for t in territories:
        region = await territory_service.get_region(t.region_id, current_user.tenant_id)
        response_list.append(
            TerritoryResponse(
                id=str(t.id),
                region_name=region.name if region else None,
                **t.model_dump(exclude={"id"})
            )
        )
        
    return TerritoryListResponse(
        territories=response_list,
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/territories/check-assignment", response_model=TerritoryAssignmentResponse)
async def check_assignment(
    country: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    postal_code: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """Check territory assignment for an address."""
    assignment = await territory_service.find_territory_for_address(
        tenant_id=current_user.tenant_id,
        country=country,
        state=state,
        postal_code=postal_code
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="No matching territory found")
    return assignment


@router.get("/territories/{territory_id}", response_model=TerritoryResponse)
async def get_territory(
    territory_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a territory by ID."""
    territory = await territory_service.get_territory(territory_id, current_user.tenant_id)
    if not territory:
        raise HTTPException(status_code=404, detail="Territory not found")
        
    region = await territory_service.get_region(territory.region_id, current_user.tenant_id)
    
    return TerritoryResponse(
        id=str(territory.id),
        region_name=region.name if region else None,
        **territory.model_dump(exclude={"id"})
    )


@router.put("/territories/{territory_id}", response_model=TerritoryResponse)
async def update_territory(
    territory_id: str,
    data: TerritoryUpdate,
    current_user: User = Depends(check_permission("manage_territory"))
):
    """Update a territory."""
    territory = await territory_service.update_territory(
        territory_id=territory_id,
        data=data,
        tenant_id=current_user.tenant_id
    )
    if not territory:
        raise HTTPException(status_code=404, detail="Territory not found")
    return TerritoryResponse(
        id=str(territory.id),
        **territory.model_dump(exclude={"id"})
    )


@router.delete("/territories/{territory_id}")
async def delete_territory(
    territory_id: str,
    current_user: User = Depends(check_permission("manage_territory"))
):
    """Delete a territory."""
    try:
        deleted = await territory_service.delete_territory(territory_id, current_user.tenant_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Territory not found")
        return {"message": "Territory deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== Region tree / lookup (Phase 3 §B) ====================
# Mirrors old RestRegionController: get_regions, get_countries,
# get_region_by_countries/{id}, get_country_by_destinations/{id}.

from app.models.country import Country
from app.models.destination import Destination
from app.models.territory import Region, Territory


@router.get("/regions-list")
async def get_regions_list(current_user: User = Depends(get_current_user)):
    """Mirror old `/admin/get_regions`. Flat list of active regions."""
    rows = await Region.find(
        {"tenant_id": current_user.tenant_id, "is_active": True},
    ).to_list()
    return [
        {
            "id": str(r.id),
            "name": r.name,
            "code": r.code,
            "parent_id": str(r.parent_id) if r.parent_id else None,
        }
        for r in rows
    ]


@router.get("/regions-tree")
async def get_regions_tree(current_user: User = Depends(get_current_user)):
    """Hierarchical region tree (region -> sub-regions)."""
    rows = await Region.find(
        {"tenant_id": current_user.tenant_id, "is_active": True},
    ).to_list()
    by_parent: dict = {}
    nodes: dict = {}
    for r in rows:
        node = {
            "id": str(r.id),
            "name": r.name,
            "code": r.code,
            "children": [],
        }
        nodes[str(r.id)] = node
        key = str(r.parent_id) if r.parent_id else None
        by_parent.setdefault(key, []).append(node)
    for parent_id, children in by_parent.items():
        if parent_id and parent_id in nodes:
            nodes[parent_id]["children"] = children
    return by_parent.get(None, [])


@router.get("/countries-list")
async def get_countries_list(current_user: User = Depends(get_current_user)):
    """Mirror old `/admin/get_countries`. List Country picklist."""
    rows = await Country.find_all().to_list()
    return [
        {"id": str(c.id), "name": c.name, "code": getattr(c, "code", None)}
        for c in rows
    ]


@router.get("/regions-by-countries/{country_id}")
async def get_regions_by_country(
    country_id: str,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/admin/get_region_by_countries/{id}`."""
    territories = await Territory.find(
        {"tenant_id": current_user.tenant_id, "is_active": True},
    ).to_list()
    region_ids = set()
    country = await Country.get(country_id)
    code = country.code if country else country_id
    name = country.name if country else None
    for t in territories:
        if (code and code in (t.countries or [])) or (name and name in (t.countries or [])):
            region_ids.add(t.region_id)
    if not region_ids:
        return []
    regions = await Region.find({"_id": {"$in": list(region_ids)}}).to_list()
    return [{"id": str(r.id), "name": r.name, "code": r.code} for r in regions]


@router.get("/countries-by-destinations/{destination_id}")
async def get_countries_by_destination(
    destination_id: str,
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/admin/get_country_by_destinations/{id}`."""
    dest = await Destination.get(destination_id)
    if not dest or dest.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Destination not found")
    country_ids = getattr(dest, "country_ids", None) or []
    if not country_ids:
        country_name = getattr(dest, "country", None)
        if country_name:
            c = await Country.find_one(Country.name == country_name)
            if c:
                country_ids = [c.id]
    if not country_ids:
        return []
    countries = await Country.find({"_id": {"$in": country_ids}}).to_list()
    return [{"id": str(c.id), "name": c.name, "code": getattr(c, "code", None)} for c in countries]


# ==================== BD Territory report (Phase 3 §C) ====================
# Mirrors old `/admin/rest_bd_report_list` GET+POST.

@router.get("/bd-report-list")
async def list_bd_report(
    current_user: User = Depends(get_current_user),
):
    """List BD users grouped by territory for reporting."""
    territories = await Territory.find(
        {"tenant_id": current_user.tenant_id, "is_active": True},
    ).to_list()
    return [
        {
            "territory_id": str(t.id),
            "name": t.name,
            "region_id": str(t.region_id),
            "user_count": len(t.users),
            "user_ids": [str(u) for u in t.users],
        }
        for t in territories
    ]


@router.post("/bd-report-list")
async def post_bd_report_details(
    payload: dict,
    current_user: User = Depends(get_current_user),
):
    """
    Returns detailed BD report scoped to the supplied territory_ids
    (or all of tenant if not provided).
    """
    territory_ids = payload.get("territory_ids") or []
    query: dict = {"tenant_id": current_user.tenant_id}
    if territory_ids:
        query["_id"] = {"$in": [PydanticObjectId(t) for t in territory_ids]}
    territories = await Territory.find(query).to_list()
    return {
        "territories": [
            {
                "territory_id": str(t.id),
                "name": t.name,
                "region_id": str(t.region_id),
                "users": [str(u) for u in t.users],
                "manager_id": str(t.manager_id) if t.manager_id else None,
                "countries": t.countries,
                "states": t.states,
            }
            for t in territories
        ],
    }


# ==================== Bulk opportunity region update (Phase 3 §D) ====================

@router.post("/opportunity-region-bulk-update")
async def bulk_update_opportunity_region(
    payload: dict,
    current_user: User = Depends(get_current_user),
):
    """
    Mirror old `/get_update_admin_opportunity_region`. Bulk-set a `region_id`
    on opportunities that match a country/destination filter.
    """
    from app.models.opportunity import Opportunity
    region_id = payload.get("region_id")
    if not region_id:
        raise HTTPException(400, "region_id required")
    region_oid = PydanticObjectId(region_id)

    country_filter = payload.get("country")  # str
    dest_id_filter = payload.get("destination_id")

    query: dict = {"tenant_id": current_user.tenant_id}
    if country_filter:
        query["industry_data.countries"] = country_filter
    if dest_id_filter:
        query["destination_ids"] = PydanticObjectId(dest_id_filter)

    opps = await Opportunity.find(query).to_list()
    updated = 0
    for o in opps:
        # set or update region_id on a free-form key
        if not hasattr(o, "industry_data") or o.industry_data is None:
            o.industry_data = {}
        o.industry_data["region_id"] = str(region_oid)
        await o.save()
        updated += 1
    return {"updated": updated, "region_id": str(region_oid)}


# ==================== Destinations filtered by territory ====================

@router.get("/territory-destinations")
async def get_destinations_for_territories(
    current_user: User = Depends(get_current_user),
):
    """Mirror old `/admin/get_destinations`. List destinations across tenant
    territories (optionally restrict by territory_id query param)."""
    rows = await Destination.find(
        {"tenant_id": current_user.tenant_id},
    ).to_list() if hasattr(Destination, "tenant_id") else await Destination.find_all().to_list()
    return [
        {
            "id": str(d.id),
            "name": getattr(d, "name", None),
            "country": getattr(d, "country", None),
        }
        for d in rows
    ]
