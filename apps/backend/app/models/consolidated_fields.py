"""
Consolidated field registry and custom fields - all field definitions stored in single collection
to reduce MongoDB collection count.
Uses 'field_type' and 'entity_type' discriminator fields.
"""
from beanie import Indexed, Document
from pydantic import Field
from typing import Optional, Literal, List, Dict, Any
from beanie import PydanticObjectId
from datetime import datetime

class BaseField(Document):
    """Base field document - all field definitions stored in 'field_registry' collection"""
    tenant_id: Optional[Indexed(PydanticObjectId)] = None
    
    # The entity this field applies to (lead, opportunity, supplier, etc.)
    entity_type: str  # lead | opportunity | supplier | personal_account | task | contact | account
    
    # Field identification
    field_name: Indexed(str)
    field_key: str
    field_type: str  # text | number | date | boolean | select | multiselect | etc.
    
    # Display properties
    label: str
    description: Optional[str] = None
    placeholder: Optional[str] = None
    help_text: Optional[str] = None
    
    # Validation
    is_required: bool = False
    is_unique: bool = False
    validation_rules: Optional[Dict[str, Any]] = None
    
    # UI properties
    sorting: int = 0
    is_active: bool = True
    is_default: bool = False
    is_hidden: bool = False
    is_custom: bool = True
    
    # For select/multiselect fields
    options: Optional[List[Dict[str, Any]]] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "field_registry"
        indexes = [
            "entity_type",
            "tenant_id",
            "field_key",
            [("entity_type", 1), ("tenant_id", 1), ("field_key", 1)],
            [("entity_type", 1), ("is_active", 1), ("sorting", 1)],
        ]


class AdditionalFieldLead(BaseField):
    """Additional field for leads"""
    entity_type: Literal["lead"] = "lead"
    
    class Settings:
        name = "field_registry"

class AdditionalFieldOpportunity(BaseField):
    """Additional field for opportunities"""
    entity_type: Literal["opportunity"] = "opportunity"
    
    class Settings:
        name = "field_registry"

class AdditionalFieldSupplier(BaseField):
    """Additional field for suppliers"""
    entity_type: Literal["supplier"] = "supplier"
    
    class Settings:
        name = "field_registry"

class AdditionalFieldPersonalAccount(BaseField):
    """Additional field for personal accounts"""
    entity_type: Literal["personal_account"] = "personal_account"
    
    class Settings:
        name = "field_registry"

class AdditionalFieldTask(BaseField):
    """Additional field for tasks"""
    entity_type: Literal["task"] = "task"
    
    class Settings:
        name = "field_registry"

class AdditionalFieldContact(BaseField):
    """Additional field for contacts"""
    entity_type: Literal["contact"] = "contact"
    
    class Settings:
        name = "field_registry"

class AccountCustomField(BaseField):
    """Custom field for accounts"""
    entity_type: Literal["account"] = "account"
    
    class Settings:
        name = "field_registry"

class SupplierCustomField(BaseField):
    """Custom field for suppliers"""
    entity_type: Literal["supplier_custom"] = "supplier_custom"
    
    class Settings:
        name = "field_registry"

class PersonalAccountCustomField(BaseField):
    """Custom field for personal accounts"""
    entity_type: Literal["personal_account_custom"] = "personal_account_custom"
    
    class Settings:
        name = "field_registry"

class TaskCustomField(BaseField):
    """Custom field for tasks"""
    entity_type: Literal["task_custom"] = "task_custom"
    
    class Settings:
        name = "field_registry"

class ContactCustomField(BaseField):
    """Custom field for contacts"""
    entity_type: Literal["contact_custom"] = "contact_custom"
    
    class Settings:
        name = "field_registry"

class StandardField(BaseField):
    """Standard field definition"""
    entity_type: str = "standard"  # Can apply to any entity
    is_custom: bool = False
    
    class Settings:
        name = "field_registry"
