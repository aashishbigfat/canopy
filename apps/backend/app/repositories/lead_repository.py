from typing import List, Optional, Dict, Any, Tuple
from beanie import PydanticObjectId

from app.models.lead import Lead
from app.repositories.base_repository import BaseRepository

class LeadRepository(BaseRepository[Lead]):
    """
    Repository for Lead data access.
    Enforces tenant_id isolation automatically via BaseRepository.
    """
    
    def __init__(self):
        super().__init__(Lead)
        
    async def get_by_email_or_mobile(
        self, 
        tenant_id: str | PydanticObjectId,
        email: Optional[str] = None, 
        mobile: Optional[str] = None
    ) -> Optional[Lead]:
        """Finds a duplicate lead strictly within the tenant boundary."""
        if not email and not mobile:
            return None
            
        tenant_obj_id = PydanticObjectId(tenant_id) if isinstance(tenant_id, str) else tenant_id
        from beanie.operators import Or
        
        query_parts = []
        if email:
            query_parts.append(Lead.email == email)
        if mobile:
            query_parts.append(Lead.mobile == mobile)
            
        if not query_parts:
            return None
            
        return await self.model.find_one(
            Lead.tenant_id == tenant_obj_id,
            Or(*query_parts),
            Lead.deleted_at == None
        )

    async def get_filtered_leads(
        self,
        tenant_id: str | PydanticObjectId,
        skip: int = 0,
        limit: int = 10,
        owner_id: Optional[str | PydanticObjectId] = None,
        is_converted: Optional[bool] = None
    ) -> Tuple[List[Lead], int]:
        """Get leads with optional filtering and pagination."""
        tenant_obj_id = PydanticObjectId(tenant_id) if isinstance(tenant_id, str) else tenant_id
        
        query: Dict[str, Any] = {
            "tenant_id": tenant_obj_id,
            "deleted_at": None
        }
        
        if owner_id:
            query["owner_id"] = PydanticObjectId(owner_id) if isinstance(owner_id, str) else owner_id
            
        if is_converted is not None:
            query["is_converted"] = is_converted
            
        total = await self.model.find(query).count()
        leads = await self.model.find(query).sort("-created_at").skip(skip).limit(limit).to_list()
        
        return leads, total

    async def search(
        self,
        tenant_id: str | PydanticObjectId,
        query_text: Optional[str],
        lead_status_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 10
    ) -> Tuple[List[Lead], int]:
        """Text search leads within a tenant."""
        tenant_obj_id = PydanticObjectId(tenant_id) if isinstance(tenant_id, str) else tenant_id
        
        search_query: Dict[str, Any] = {
            "tenant_id": tenant_obj_id,
            "deleted_at": None
        }
        
        if query_text:
            search_query["$or"] = [
                {"first_name": {"$regex": query_text, "$options": "i"}},
                {"last_name": {"$regex": query_text, "$options": "i"}},
                {"email": {"$regex": query_text, "$options": "i"}},
                {"company": {"$regex": query_text, "$options": "i"}},
                {"phone": {"$regex": query_text, "$options": "i"}}
            ]
            
        if lead_status_id:
            search_query["lead_status_id"] = PydanticObjectId(lead_status_id)
            
        total = await self.model.find(search_query).count()
        leads = await self.model.find(search_query).sort("-created_at").skip(skip).limit(limit).to_list()
        
        return leads, total
