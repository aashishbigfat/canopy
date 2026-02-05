"""
Tag service layer
"""
from typing import List, Optional
from bson import ObjectId
from app.models.tag import Tag, EntityTag
from app.schemas.tag import TagCreate, TagUpdate


class TagService:
    """Service for Tag business logic"""
    
    async def create_tag(self, data: TagCreate, user_id: ObjectId, tenant_id: ObjectId) -> Tag:
        existing = await Tag.find_one(
            Tag.name == data.name, Tag.tenant_id == tenant_id, Tag.deleted_at == None
        )
        if existing:
            raise ValueError(f"Tag '{data.name}' already exists")
        
        tag = Tag(**data.model_dump(), tenant_id=tenant_id, created_by=user_id)
        await tag.insert()
        return tag
    
    async def get_tag(self, tag_id: str, tenant_id: ObjectId) -> Optional[Tag]:
        tag = await Tag.get(ObjectId(tag_id))
        return tag if tag and tag.tenant_id == tenant_id and not tag.deleted_at else None
    
    async def update_tag(self, tag_id: str, data: TagUpdate, tenant_id: ObjectId) -> Optional[Tag]:
        tag = await self.get_tag(tag_id, tenant_id)
        if not tag:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(tag, field, value)
        await tag.save()
        return tag
    
    async def delete_tag(self, tag_id: str, tenant_id: ObjectId) -> bool:
        tag = await self.get_tag(tag_id, tenant_id)
        if not tag:
            return False
        
        # Remove all entity associations
        await EntityTag.find(EntityTag.tag_id == tag.id).delete()
        await tag.soft_delete()
        return True
    
    async def get_tags_by_tenant(self, tenant_id: ObjectId, entity_type: Optional[str] = None) -> List[Tag]:
        query = {"tenant_id": tenant_id, "deleted_at": None}
        if entity_type:
            query["entity_types"] = entity_type
        return await Tag.find(query).sort("-usage_count").to_list()
    
    async def search_tags(self, query: str, tenant_id: ObjectId) -> List[Tag]:
        return await Tag.find({
            "tenant_id": tenant_id,
            "deleted_at": None,
            "name": {"$regex": query, "$options": "i"}
        }).sort("-usage_count").to_list()
    
    # Entity tagging
    async def add_tag_to_entity(
        self, tag_id: str, entity_type: str, entity_id: str,
        user_id: ObjectId, tenant_id: ObjectId
    ) -> bool:
        tag = await self.get_tag(tag_id, tenant_id)
        if not tag or entity_type not in tag.entity_types:
            return False
        
        existing = await EntityTag.find_one(
            EntityTag.tag_id == tag.id,
            EntityTag.entity_type == entity_type,
            EntityTag.entity_id == ObjectId(entity_id)
        )
        if existing:
            return True  # Already tagged
        
        entity_tag = EntityTag(
            tag_id=tag.id,
            entity_type=entity_type,
            entity_id=ObjectId(entity_id),
            tenant_id=tenant_id,
            tagged_by=user_id
        )
        await entity_tag.insert()
        
        # Update usage count
        tag.usage_count += 1
        await tag.save()
        return True
    
    async def remove_tag_from_entity(
        self, tag_id: str, entity_type: str, entity_id: str, tenant_id: ObjectId
    ) -> bool:
        tag = await self.get_tag(tag_id, tenant_id)
        if not tag:
            return False
        
        result = await EntityTag.find_one(
            EntityTag.tag_id == tag.id,
            EntityTag.entity_type == entity_type,
            EntityTag.entity_id == ObjectId(entity_id)
        )
        if result:
            await result.delete()
            tag.usage_count = max(0, tag.usage_count - 1)
            await tag.save()
        return True
    
    async def get_entity_tags(self, entity_type: str, entity_id: str, tenant_id: ObjectId) -> List[Tag]:
        entity_tags = await EntityTag.find(
            EntityTag.entity_type == entity_type,
            EntityTag.entity_id == ObjectId(entity_id),
            EntityTag.tenant_id == tenant_id
        ).to_list()
        
        tag_ids = [et.tag_id for et in entity_tags]
        if not tag_ids:
            return []
        
        return await Tag.find({"_id": {"$in": tag_ids}, "deleted_at": None}).to_list()
