from beanie import Document, PydanticObjectId
from pydantic import Field
from datetime import datetime, timezone
from typing import Optional
from beanie import PydanticObjectId

class BaseDocument(Document):
    """Base document with common fields for all models"""
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None
    
    class Settings:
        use_state_management = True

    model_config = {
        # "arbitrary_types_allowed": True,
        # "populate_by_name": True
    }
    
    async def soft_delete(self):
        # """Soft delete the document"""
        self.deleted_at = datetime.now(timezone.utc)
        await self.save()
    
    @classmethod
    async def find_active(cls, *args, **kwargs):
        # """Find non-deleted documents"""
        return await cls.find(
            cls.deleted_at == None,
            *args,
            **kwargs
        ).to_list()
    
    async def save(self, *args, **kwargs):
        # """Override save to update updated_at"""
        self.updated_at = datetime.now(timezone.utc)
        return await super().save(*args, **kwargs)


class TenantMixin:
    """Mixin for tenant isolation"""
    tenant_id: PydanticObjectId = Field(index=True)


class TimestampMixin:
    """Mixin for timestamp fields"""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SoftDeleteMixin:
    """Mixin for soft delete functionality"""
    deleted_at: Optional[datetime] = None
    
    async def soft_delete(self):
        self.deleted_at = datetime.now(timezone.utc)
        await self.save()
