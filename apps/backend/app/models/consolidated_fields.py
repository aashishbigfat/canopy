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
    name: Indexed(str)
    field_key: Optional[str] = None
    field_type: str  # text | number | date | boolean | select | multiselect | etc.
    
    # Display properties
    label: Optional[str] = None
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

class AdditionalFieldAccount(BaseField):
    """Additional field for accounts"""
    entity_type: Literal["account"] = "account"
    
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

# --------- Custom field values (consolidated collection) ---------

class CustomFieldValue(Document):
    """Base for all custom field values stored in 'custom_field_values' collection"""
    tenant_id: Optional[Indexed(PydanticObjectId)] = None
    
    field_value: str
    type: str  # metadata copy of field_type
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "custom_field_values"
        indexes = [
            "tenant_id",
        ]

class LeadCustomField(CustomFieldValue):
    """Value for lead custom field"""
    lead_id: Indexed(PydanticObjectId)
    lead_additional_field_id: Indexed(PydanticObjectId)
    
    class Settings:
        name = "custom_field_values"

class OpportunityCustomField(CustomFieldValue):
    """Value for opportunity custom field"""
    opportunity_id: Indexed(PydanticObjectId)
    opp_additional_field_id: Indexed(PydanticObjectId)
    
    class Settings:
        name = "custom_field_values"

class AccountCustomField(CustomFieldValue):
    """Value for account custom field"""
    account_id: Indexed(PydanticObjectId)
    account_additional_field_id: Indexed(PydanticObjectId)
    
    class Settings:
        name = "custom_field_values"

class ContactCustomField(CustomFieldValue):
    """Value for contact custom field"""
    contact_id: Indexed(PydanticObjectId)
    contact_additional_field_id: Indexed(PydanticObjectId)
    
    class Settings:
        name = "custom_field_values"

class SupplierCustomField(CustomFieldValue):
    """Value for supplier custom field"""
    supplier_id: Indexed(PydanticObjectId)
    supplier_additional_field_id: Indexed(PydanticObjectId)
    
    class Settings:
        name = "custom_field_values"

class PersonalAccountCustomField(CustomFieldValue):
    """Value for personal account custom field"""
    personal_account_id: Indexed(PydanticObjectId)
    personal_account_additional_field_id: Indexed(PydanticObjectId)
    
    class Settings:
        name = "custom_field_values"

class TaskCustomField(CustomFieldValue):
    """Value for task custom field"""
    task_id: Indexed(PydanticObjectId)
    task_additional_field_id: Indexed(PydanticObjectId)
    
    class Settings:
        name = "custom_field_values"

class StandardField(BaseField):
    """Standard field definition"""
    entity_type: str = "standard"  # Can apply to any entity
    is_custom: bool = False
    
    class Settings:
        name = "field_registry"
