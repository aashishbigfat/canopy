"""
Field registry models — Phase 1 parity port.

Contains:
  - AdditionalFieldLead, AdditionalFieldOpportunity,
    AdditionalFieldSupplier, AdditionalFieldPersonalAccount
  - SupplierCustomField, PersonalAccountCustomField
  - StandardField (polymorphic across entities by `entity_type`)

Existing models kept (do not duplicate):
  - app/models/custom_fields.py     -> AdditionalFieldAccount, AccountCustomField
  - app/models/contact_views.py      -> AdditionalFieldContact
  - app/models/user_contact_view.py  -> ContactCustomField
  - app/models/lead_custom_fields.py -> LeadCustomField
  - app/models/opportunity_custom_fields.py -> OpportunityCustomField

Entity types (string discriminator on StandardField):
  account | contact | lead | opportunity | supplier | personal_account | task
"""

from __future__ import annotations
from beanie import Indexed, Document, PydanticObjectId
from pydantic import Field
from typing import Optional, List
from datetime import datetime


# ---------- AdditionalField (per entity) ----------

class _AdditionalFieldBase(Document):
    """Common fields for additional/custom field definitions."""
    name: str
    label: Optional[str] = None
    field_type: str  # text, number, date, dropdown, checkbox, multiselect, textarea, email, phone, url
    type_value: Optional[str] = None  # extra type-specific config (regex, max length, etc.)
    description: Optional[str] = None
    default_value: Optional[str] = None
    is_mandatory: bool = False
    is_active: bool = True
    sorting: int = 0
    options: List[str] = Field(default_factory=list)  # for dropdown/multiselect

    tenant_id: Indexed(PydanticObjectId)
    created_by: Optional[PydanticObjectId] = None
    last_modified_by_id: Optional[PydanticObjectId] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        is_root = True


class AdditionalFieldLead(_AdditionalFieldBase):
    class Settings:
        name = "additional_field_leads"


class AdditionalFieldOpportunity(_AdditionalFieldBase):
    class Settings:
        name = "additional_field_opportunities"


class AdditionalFieldSupplier(_AdditionalFieldBase):
    class Settings:
        name = "additional_field_suppliers"


class AdditionalFieldPersonalAccount(_AdditionalFieldBase):
    class Settings:
        name = "additional_field_personal_accounts"


class AdditionalFieldTask(_AdditionalFieldBase):
    class Settings:
        name = "additional_field_tasks"


# ---------- CustomField values (missing entities) ----------

class SupplierCustomField(Document):
    supplier_id: Indexed(PydanticObjectId)
    supplier_additional_field_id: Indexed(PydanticObjectId)
    field_value: str
    type: str
    tenant_id: Indexed(PydanticObjectId)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "supplier_custom_fields"


class PersonalAccountCustomField(Document):
    personal_account_id: Indexed(PydanticObjectId)
    personal_account_additional_field_id: Indexed(PydanticObjectId)
    field_value: str
    type: str
    tenant_id: Indexed(PydanticObjectId)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "personal_account_custom_fields"


class TaskCustomField(Document):
    task_id: Indexed(PydanticObjectId)
    task_additional_field_id: Indexed(PydanticObjectId)
    field_value: str
    type: str
    tenant_id: Indexed(PydanticObjectId)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "task_custom_fields"


# ---------- StandardField (one collection, polymorphic) ----------

class StandardField(Document):
    """
    Standard field metadata per entity. Stores activation/mandatory/sort
    flags for built-in entity columns (e.g. account.name, lead.email).

    `entity_type` discriminator: account | contact | lead | opportunity |
                                  supplier | personal_account | task
    `field_key` is the canonical column name on the entity model.
    `system_mandatory=True` flags fields that cannot be turned off (e.g. name).
    """
    entity_type: Indexed(str)
    field_key: Indexed(str)
    label: Optional[str] = None
    field_type: str = "text"
    default_value: Optional[str] = None
    type_value: Optional[str] = None

    is_active: bool = True
    is_mandatory: bool = False
    system_mandatory: bool = False  # cannot be toggled off in UI
    sorting: int = 0

    tenant_id: Indexed(PydanticObjectId)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "standard_fields"
        # composite uniqueness enforced at service layer:
        # (tenant_id, entity_type, field_key) must be unique
