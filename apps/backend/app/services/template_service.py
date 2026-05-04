"""
Template service layer
"""
from typing import List, Optional, Dict, Any
from bson import ObjectId
import re
from app.models.template import Template
from app.schemas.template import TemplateCreate, TemplateUpdate


class TemplateService:
    """Service for Template business logic"""
    
    async def create_template(
        self, data: TemplateCreate, user_id: ObjectId, tenant_id: ObjectId
    ) -> Template:
        template = Template(
            **data.model_dump(),
            tenant_id=tenant_id,
            created_by=user_id
        )
        await template.insert()
        return template
    
    async def get_template(self, template_id: str, tenant_id: ObjectId) -> Optional[Template]:
        template = await Template.get(ObjectId(template_id))
        return template if template and template.tenant_id == tenant_id and not template.deleted_at else None
    
    async def update_template(
        self, template_id: str, data: TemplateUpdate, tenant_id: ObjectId
    ) -> Optional[Template]:
        template = await self.get_template(template_id, tenant_id)
        if not template:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(template, field, value)
        await template.save()
        return template
    
    async def delete_template(self, template_id: str, tenant_id: ObjectId) -> bool:
        template = await self.get_template(template_id, tenant_id)
        if not template:
            return False
        await template.soft_delete()
        return True
    
    async def get_templates(
        self, tenant_id: ObjectId, type: Optional[str] = None,
        category: Optional[str] = None, skip: int = 0, limit: int = 100
    ) -> List[Template]:
        query = {"tenant_id": tenant_id, "deleted_at": None, "is_active": True}
        if type:
            query["type"] = type
        if category:
            query["category"] = category
        return await Template.find(query).skip(skip).limit(limit).sort("+name").to_list()
    
    async def search_templates(self, query: str, tenant_id: ObjectId) -> List[Template]:
        return await Template.find({
            "tenant_id": tenant_id,
            "deleted_at": None,
            "name": {"$regex": query, "$options": "i"}
        }).sort("+name").to_list()
    
    async def get_default_template(self, type: str, tenant_id: ObjectId) -> Optional[Template]:
        return await Template.find_one(
            {"type": type, "tenant_id": tenant_id, "is_default": True, "deleted_at": None}
        )
    
    def render_template(self, template: Template, data: Dict[str, Any]) -> Dict[str, str]:
        """Render template with variable substitution"""
        def replace_vars(text: str) -> str:
            if not text:
                return text
            result = text
            for key, value in data.items():
                result = result.replace(f"{{{{{key}}}}}", str(value) if value else "")
            return result
        
        return {
            "subject": replace_vars(template.subject) if template.subject else None,
            "body": replace_vars(template.body)
        }
    
    def extract_variables(self, text: str) -> List[str]:
        """Extract variable placeholders from text"""
        pattern = r'\{\{(\w+)\}\}'
        return list(set(re.findall(pattern, text)))
