"""
Country service layer - Business logic for geographic data
"""
from typing import List, Optional
from bson import ObjectId
from app.models.country import Country, State, City
from app.schemas.country import CountryCreate, StateCreate, CityCreate


class CountryService:
    """Service for Country business logic"""
    
    # Country methods
    async def create_country(self, data: CountryCreate) -> Country:
        existing = await Country.find_one(Country.code == data.code)
        if existing:
            raise ValueError(f"Country with code '{data.code}' already exists")
        
        country = Country(**data.model_dump())
        await country.insert()
        return country
    
    async def get_country(self, country_id: str) -> Optional[Country]:
        country = await Country.get(ObjectId(country_id))
        return country if country and not country.deleted_at else None
    
    async def get_country_by_code(self, code: str) -> Optional[Country]:
        return await Country.find_one(Country.code == code.upper(), Country.deleted_at == None)
    
    async def get_all_countries(self, is_popular: Optional[bool] = None) -> List[Country]:
        """Get all countries"""
        query = {"deleted_at": None, "is_active": True}
        if is_popular is not None:
            query["is_popular"] = is_popular
        return await Country.find(query).sort("+name").to_list()
    
    async def search_countries(self, query: str) -> List[Country]:
        """Search countries"""
        return await Country.find({
            "deleted_at": None,
            "is_active": True,
            "$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"code": {"$regex": query, "$options": "i"}},
                {"capital": {"$regex": query, "$options": "i"}}
            ]
        }).sort("+name").to_list()
    
    # State methods
    async def create_state(self, data: StateCreate) -> State:
        state = State(**data.model_dump(exclude={'country_id'}))
        state.country_id = ObjectId(data.country_id)
        await state.insert()
        return state
    
    async def get_states_by_country(self, country_id: str) -> List[State]:
        """Get states for a country"""
        return await State.find(
            State.country_id == ObjectId(country_id),
            State.deleted_at == None,
            State.is_active == True
        ).sort("+name").to_list()
    
    async def search_states(self, query: str, country_id: Optional[str] = None) -> List[State]:
        """Search states"""
        search = {
            "deleted_at": None,
            "is_active": True,
            "name": {"$regex": query, "$options": "i"}
        }
        if country_id:
            search["country_id"] = ObjectId(country_id)
        return await State.find(search).sort("+name").to_list()
    
    # City methods
    async def create_city(self, data: CityCreate) -> City:
        city = City(**data.model_dump(exclude={'country_id', 'state_id'}))
        city.country_id = ObjectId(data.country_id)
        if data.state_id:
            city.state_id = ObjectId(data.state_id)
        await city.insert()
        return city
    
    async def get_cities_by_country(self, country_id: str, is_popular: Optional[bool] = None) -> List[City]:
        """Get cities for a country"""
        query = {"country_id": ObjectId(country_id), "deleted_at": None, "is_active": True}
        if is_popular is not None:
            query["is_popular"] = is_popular
        return await City.find(query).sort("+name").to_list()
    
    async def get_cities_by_state(self, state_id: str) -> List[City]:
        """Get cities for a state"""
        return await City.find(
            City.state_id == ObjectId(state_id),
            City.deleted_at == None,
            City.is_active == True
        ).sort("+name").to_list()
    
    async def search_cities(self, query: str, country_id: Optional[str] = None) -> List[City]:
        """Search cities"""
        search = {"deleted_at": None, "is_active": True, "name": {"$regex": query, "$options": "i"}}
        if country_id:
            search["country_id"] = ObjectId(country_id)
        return await City.find(search).sort("+name").to_list()
    
    async def get_popular_cities(self, limit: int = 20) -> List[City]:
        """Get popular cities"""
        return await City.find(
            City.is_popular == True,
            City.is_active == True,
            City.deleted_at == None
        ).limit(limit).sort("+name").to_list()
