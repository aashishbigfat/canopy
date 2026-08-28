"""
Country, State, City models for geographic master data
"""
from beanie import Indexed
from pydantic import Field
from typing import Optional, List
from beanie import PydanticObjectId
from app.models.base import BaseDocument


class Country(BaseDocument):
    """Country model"""
    
    name: Indexed(str)
    code: Indexed(str)  # ISO-2 code (US, IN, FR)
    code3: Optional[str] = None  # ISO-3 code (USA, IND, FRA)
    phone_code: Optional[str] = None
    currency: Optional[str] = None
    currency_symbol: Optional[str] = None
    continent: Optional[str] = None
    capital: Optional[str] = None
    
    is_active: bool = True
    is_popular: bool = False
    
    # Global/Shared data (no tenant_id)
    
    class Settings:
        name = "countries"
        # Temporarily disabled to fix startup

        # indexes = ["code", "code3", "name", "is_popular"]


class State(BaseDocument):
    """State/Province model"""
    
    name: Indexed(str)
    code: Optional[str] = None
    country_id: Indexed(PydanticObjectId)
    
    is_active: bool = True
    
    class Settings:
        name = "states"
        # Temporarily disabled to fix startup

        # indexes = ["country_id", "name", [("country_id", 1), ("name", 1)]]


class City(BaseDocument):
    """City model"""
    
    name: Indexed(str)
    state_id: Optional[Indexed(PydanticObjectId)] = None
    country_id: Indexed(PydanticObjectId)
    
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timezone: Optional[str] = None
    
    is_active: bool = True
    is_popular: bool = False
    
    class Settings:
        name = "cities"
        # Temporarily disabled to fix startup

        # indexes = ["country_id", "state_id", "name", "is_popular"]
