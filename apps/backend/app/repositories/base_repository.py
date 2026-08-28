from typing import TypeVar, Generic, Type, List, Optional, Any, Dict
from beanie import Document, PydanticObjectId

ModelType = TypeVar("ModelType", bound=Document)

class BaseRepository(Generic[ModelType]):
    """
    Base Repository enforcing multi-tenant isolation.
    All querying methods strictly require and enforce `tenant_id`.
    """
    
    def __init__(self, model: Type[ModelType]):
        self.model = model

    async def get_by_id(self, id: str | PydanticObjectId, tenant_id: str | PydanticObjectId) -> Optional[ModelType]:
        """Fetch a single document by ID, scoped to a tenant."""
        try:
            obj_id = PydanticObjectId(id) if isinstance(id, str) else id
            tenant_obj_id = PydanticObjectId(tenant_id) if isinstance(tenant_id, str) else tenant_id
            
            return await self.model.find_one(
                self.model.id == obj_id,
                self.model.tenant_id == tenant_obj_id,
                getattr(self.model, "deleted_at", None) == None
            )
        except Exception:
            return None

    async def get_all(self, tenant_id: str | PydanticObjectId, skip: int = 0, limit: int = 100, **kwargs) -> List[ModelType]:
        """Fetch all documents for a tenant, automatically paginated, excluding soft-deleted."""
        tenant_obj_id = PydanticObjectId(tenant_id) if isinstance(tenant_id, str) else tenant_id
        
        query: Dict[str, Any] = {"tenant_id": tenant_obj_id}
        
        # Determine if the model supports soft deletes
        if "deleted_at" in self.model.model_fields:
            query["deleted_at"] = None
        
        # Inject additional filters
        for k, v in kwargs.items():
            query[k] = v

        return await self.model.find(query).skip(skip).limit(limit).to_list()

    async def get_all_count(self, tenant_id: str | PydanticObjectId, **kwargs) -> int:
        """Fetch the total count of documents for pagination."""
        tenant_obj_id = PydanticObjectId(tenant_id) if isinstance(tenant_id, str) else tenant_id
        
        query: Dict[str, Any] = {"tenant_id": tenant_obj_id}
        if "deleted_at" in self.model.model_fields:
            query["deleted_at"] = None
            
        for k, v in kwargs.items():
            query[k] = v
            
        return await self.model.find(query).count()

    async def create(self, data: Dict[str, Any], tenant_id: str | PydanticObjectId) -> ModelType:
        """Create a new document, automatically injecting the tenant_id."""
        tenant_obj_id = PydanticObjectId(tenant_id) if isinstance(tenant_id, str) else tenant_id
        data["tenant_id"] = tenant_obj_id
        
        document = self.model(**data)
        await document.insert()
        return document

    async def update(self, id: str | PydanticObjectId, tenant_id: str | PydanticObjectId, update_data: Dict[str, Any]) -> Optional[ModelType]:
        """Update a document, strictly scoped to the tenant_id."""
        document = await self.get_by_id(id, tenant_id)
        if not document:
            return None
            
        for key, value in update_data.items():
            setattr(document, key, value)
            
        await document.save()
        return document

    async def delete(self, id: str | PydanticObjectId, tenant_id: str | PydanticObjectId, soft: bool = True) -> bool:
        """Delete a document, strictly scoped to the tenant_id (defaults to soft delete if supported)."""
        document = await self.get_by_id(id, tenant_id)
        if not document:
            return False
            
        if soft and hasattr(document, "soft_delete"):
            await document.soft_delete()
        else:
            await document.delete()
        return True
