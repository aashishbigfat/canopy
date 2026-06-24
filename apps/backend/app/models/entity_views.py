"""
Polymorphic Views / Columns / Pinned-views models — Phase 4.

One document per concept, discriminated by `entity_type`:
  account | contact | lead | opportunity | supplier | personal_account | task

Existing per-entity models (AccountView, ContactView, AccountColumn, ContactColumn,
AccountPinView) remain in place for legacy support. New code uses these
polymorphic docs.
"""
from __future__ import annotations
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class EntityView(Document):
    """
    Saved view (filter set + sorting) for any entity type.
    """
    entity_type: Indexed(str)
    name: str
    description: Optional[str] = None

    # Legacy flat filter dict (kept for back-compat with existing callers).
    filters: Dict[str, Any] = Field(default_factory=dict)
    # Structured "Edit List Filters" rows: [{field, operator, value}, ...].
    # Translated to a Mongo query by app/core/entity_filter.py.
    filter_rules: List[Dict[str, Any]] = Field(default_factory=list)
    # "Select Fields to display" — ordered display columns (field_keys). Custom
    # fields are encoded as "additional:<field_id>". Empty => default columns.
    display_columns: List[str] = Field(default_factory=list)
    # "Show me" scope selector: "all" (default) or "mine" (owner == me).
    scope: Optional[str] = None
    sort_by: Optional[str] = None
    sort_dir: str = "desc"

    is_public: bool = False
    is_default: bool = False

    created_by: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "entity_views"


class EntityColumn(Document):
    """
    Column configuration for an entity type (per tenant).
    Replaces per-entity *Column tables.
    """
    entity_type: Indexed(str)

    field_key: str            # canonical column name on the entity model OR additional_field id
    is_additional: bool = False  # True = references AdditionalField; field_key is its id_str
    label: str
    is_visible: bool = True
    is_editable: bool = False
    sorting: int = 0
    width: Optional[int] = None

    tenant_id: Indexed(PydanticObjectId)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "entity_columns"


class EntityPinView(Document):
    """
    User-pinned view binding (a saved view pinned for the current user).
    Old Laravel: rest_pin_views_{entity} / rest_unpin_views_{entity}.
    """
    entity_type: Indexed(str)
    view_id: Indexed(PydanticObjectId)
    user_id: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)
    pinned_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "entity_pin_views"


class EntityFilter(Document):
    """
    Saved ad-hoc filter expression for an entity type.
    Mirrors old `rest_*_filters` POST endpoint storage.
    """
    entity_type: Indexed(str)
    user_id: Indexed(PydanticObjectId)
    tenant_id: Indexed(PydanticObjectId)

    name: Optional[str] = None
    expression: Dict[str, Any] = Field(default_factory=dict)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "entity_filters"
