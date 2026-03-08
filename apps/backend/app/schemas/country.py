"""
Pydantic schemas for Country API
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from beanie import PydanticObjectId


class CountryBase(BaseModel):
    name: str
    code: str
    code3: Optional[str] = None
    phone_code: Optional[str] = None
    currency: Optional[str] = None
    currency_symbol: Optional[str] = None
    continent: Optional[str] = None
    capital: Optional[str] = None
    is_popular: bool = False


class CountryCreate(CountryBase):
    pass


class CountryResponse(CountryBase):
    id: str
    is_active: bool
    created_at: datetime
    
    @classmethod
    def from_orm(cls, obj):
        """Convert from Beanie document to Pydantic model"""
        return cls(
            id=str(obj.id),
            name=obj.name,
            code=obj.code,
            code3=obj.code3,
            phone_code=obj.phone_code,
            currency=obj.currency,
            currency_symbol=obj.currency_symbol,
            continent=obj.continent,
            capital=obj.capital,
            is_popular=obj.is_popular,
            is_active=obj.is_active,
            created_at=obj.created_at
        )


class CountryListResponse(BaseModel):
    countries: List[CountryResponse]
    total: int


class StateBase(BaseModel):
    name: str
    code: Optional[str] = None
    country_id: str


class StateCreate(StateBase):
    pass


class StateResponse(StateBase):
    id: str
    is_active: bool
    created_at: datetime
    
    @classmethod
    def from_orm(cls, obj):
        """Convert from Beanie document to Pydantic model"""
        return cls(
            id=str(obj.id),
            name=obj.name,
            code=obj.code,
            country_id=str(obj.country_id),
            is_active=obj.is_active,
            created_at=obj.created_at
        )


class StateListResponse(BaseModel):
    states: List[StateResponse]
    total: int


class CityBase(BaseModel):
    name: str
    country_id: str
    state_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timezone: Optional[str] = None
    is_popular: bool = False


class CityCreate(CityBase):
    pass


class CityResponse(CityBase):
    id: str
    is_active: bool
    created_at: datetime
    
    @classmethod
    def from_orm(cls, obj):
        """Convert from Beanie document to Pydantic model"""
        return cls(
            id=str(obj.id),
            name=obj.name,
            country_id=str(obj.country_id),
            state_id=str(obj.state_id) if obj.state_id else None,
            latitude=obj.latitude,
            longitude=obj.longitude,
            timezone=obj.timezone,
            is_popular=obj.is_popular,
            is_active=obj.is_active,
            created_at=obj.created_at
        )


class CityListResponse(BaseModel):
    cities: List[CityResponse]
    total: int
