"""
Account-related picklist models — re-export shim.

Canonical defs live in `consolidated_picklists` (single 'picklists'
collection w/ discriminator). This module re-exports them for back-compat.

`SupplierService` aliased to `SupplierServicePicklist` from consolidated.
"""
from app.models.consolidated_picklists import (
    AccountType,
    Industry,
    Rating,
    AccountSource,
    SupplierServicePicklist as SupplierService,
)

__all__ = [
    "AccountType",
    "Industry",
    "Rating",
    "AccountSource",
    "SupplierService",
]
