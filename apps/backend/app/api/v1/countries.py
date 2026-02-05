"""
Country API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.models.user import User
from app.schemas.country import (
    CountryCreate, CountryResponse, CountryListResponse,
    StateCreate, StateResponse, StateListResponse,
    CityCreate, CityResponse, CityListResponse
)
from app.services.country_service import CountryService
from app.api.deps import get_current_user

router = APIRouter()


# Country endpoints
@router.get("/", response_model=CountryListResponse)
async def get_countries(
    is_popular: Optional[bool] = Query(None, description="Filter popular countries"),
    current_user: User = Depends(get_current_user)
):
    """Get all countries"""
    service = CountryService()
    countries = await service.get_all_countries(is_popular=is_popular)
    return CountryListResponse(countries=[CountryResponse.from_orm(c) for c in countries], total=len(countries))


@router.get("/search")
async def search_countries(query: str, current_user: User = Depends(get_current_user)):
    """Search countries"""
    service = CountryService()
    countries = await service.search_countries(query)
    return {"countries": [CountryResponse.from_orm(c) for c in countries], "total": len(countries)}


@router.get("/code/{code}", response_model=CountryResponse)
async def get_country_by_code(code: str, current_user: User = Depends(get_current_user)):
    """Get country by ISO code"""
    service = CountryService()
    country = await service.get_country_by_code(code)
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
    return CountryResponse.from_orm(country)


@router.get("/{country_id}", response_model=CountryResponse)
async def get_country(country_id: str, current_user: User = Depends(get_current_user)):
    """Get country by ID"""
    service = CountryService()
    country = await service.get_country(country_id)
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
    return CountryResponse.from_orm(country)


# State endpoints
@router.get("/{country_id}/states", response_model=StateListResponse)
async def get_states_by_country(
    country_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get states for a country"""
    service = CountryService()
    states = await service.get_states_by_country(country_id)
    return StateListResponse(states=[StateResponse.from_orm(s) for s in states], total=len(states))


@router.get("/states/search")
async def search_states(
    query: str,
    country_id: Optional[str] = Query(None, description="Filter by country ID"),
    current_user: User = Depends(get_current_user)
):
    """Search states"""
    service = CountryService()
    states = await service.search_states(query, country_id=country_id)
    return {"states": [StateResponse.from_orm(s) for s in states], "total": len(states)}


# City endpoints
@router.get("/{country_id}/cities", response_model=CityListResponse)
async def get_cities_by_country(
    country_id: str,
    is_popular: Optional[bool] = Query(None, description="Filter popular cities"),
    current_user: User = Depends(get_current_user)
):
    """Get cities for a country"""
    service = CountryService()
    cities = await service.get_cities_by_country(country_id, is_popular=is_popular)
    return CityListResponse(cities=[CityResponse.from_orm(c) for c in cities], total=len(cities))


@router.get("/states/{state_id}/cities", response_model=CityListResponse)
async def get_cities_by_state(
    state_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get cities for a state"""
    service = CountryService()
    cities = await service.get_cities_by_state(state_id)
    return CityListResponse(cities=[CityResponse.from_orm(c) for c in cities], total=len(cities))


@router.get("/cities/search")
async def search_cities(
    query: str,
    country_id: Optional[str] = Query(None, description="Filter by country ID"),
    current_user: User = Depends(get_current_user)
):
    """Search cities"""
    service = CountryService()
    cities = await service.search_cities(query, country_id=country_id)
    return {"cities": [CityResponse.from_orm(c) for c in cities], "total": len(cities)}


@router.get("/cities/popular")
async def get_popular_cities(
    limit: int = Query(20, ge=1, le=100, description="Number of popular cities"),
    current_user: User = Depends(get_current_user)
):
    """Get popular cities"""
    service = CountryService()
    cities = await service.get_popular_cities(limit=limit)
    return {"cities": [CityResponse.from_orm(c) for c in cities], "total": len(cities)}
