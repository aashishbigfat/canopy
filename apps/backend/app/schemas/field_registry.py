"""
Pydantic schemas for field registry endpoints.
"""
from __future__ import annotations
from pydantic import BaseModel, Field, ConfigDict, BeforeValidator
from typing import Optional, List, Literal, Annotated
from datetime import datetime
from beanie import PydanticObjectId


EntityType = Literal[
    "account", "contact", "lead", "opportunity",
    "supplier", "personal_account", "task",
]


# ---------- AdditionalField ----------

class AdditionalFieldCreate(BaseModel):
    name: str
    label: Optional[str] = None
    field_type: str
    type_value: Optional[str] = None
    description: Optional[str] = None
    default_value: Optional[str] = None
    is_mandatory: bool = False
    is_active: bool = True
    sorting: int = 0
    options: List[str] = Field(default_factory=list)


class AdditionalFieldUpdate(BaseModel):
    name: Optional[str] = None
    label: Optional[str] = None
    field_type: Optional[str] = None
    type_value: Optional[str] = None
    description: Optional[str] = None
    default_value: Optional[str] = None
    is_mandatory: Optional[bool] = None
    is_active: Optional[bool] = None
    sorting: Optional[int] = None
    options: Optional[List[str]] = None


class AdditionalFieldResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: PydanticObjectId = Field(validation_alias="_id", serialization_alias="id")
    name: str
    label: Optional[str] = None
    field_type: str
    type_value: Optional[str] = None
    description: Optional[str] = None
    default_value: Optional[str] = None
    is_mandatory: bool = False  # default for legacy docs missing this field
    is_active: bool = True
    sorting: int = 0
    options: Annotated[List[str], BeforeValidator(lambda v: v if v is not None else [])] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class FieldSortItem(BaseModel):
    id: PydanticObjectId
    sorting: int


class FieldSortRequest(BaseModel):
    items: List[FieldSortItem]


class FieldStatusToggle(BaseModel):
    id: PydanticObjectId
    is_active: bool


class FieldMandatoryToggle(BaseModel):
    id: PydanticObjectId
    is_mandatory: bool


# ---------- StandardField ----------

class StandardFieldCreate(BaseModel):
    entity_type: EntityType
    field_key: str
    label: Optional[str] = None
    field_type: str = "text"
    default_value: Optional[str] = None
    type_value: Optional[str] = None
    is_active: bool = True
    is_mandatory: bool = False
    system_mandatory: bool = False
    sorting: int = 0


class StandardFieldUpdate(BaseModel):
    label: Optional[str] = None
    field_type: Optional[str] = None
    default_value: Optional[str] = None
    type_value: Optional[str] = None
    is_active: Optional[bool] = None
    is_mandatory: Optional[bool] = None
    sorting: Optional[int] = None


class StandardFieldResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: PydanticObjectId = Field(validation_alias="_id", serialization_alias="id")
    entity_type: str
    field_key: Optional[str] = ""  # legacy docs may have None; default to empty string
    label: Optional[str] = None
    field_type: str = "text"
    default_value: Optional[str] = None
    type_value: Optional[str] = None
    is_active: bool = True
    is_mandatory: bool = False  # default for legacy docs missing this field
    system_mandatory: bool = False  # default for legacy docs missing this field
    sorting: int = 0
    created_at: datetime
    updated_at: datetime


# ---------- CustomFieldValue (ingest payload) ----------

class CustomFieldValuePayload(BaseModel):
    """
    Payload format from clients when writing custom fields on entity create/update.
    Maps additional_field_id -> value. Service layer resolves the per-entity table.
    """
    additional_field_id: PydanticObjectId
    field_value: str
