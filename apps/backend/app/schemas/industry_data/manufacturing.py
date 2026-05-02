"""
Manufacturing industry_data validation schemas for Lead and Opportunity.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime


class ManufacturingLeadData(BaseModel):
    """Validates industry_data for a Lead owned by a manufacturing tenant."""

    product_category: Optional[str] = Field(None, max_length=200, description="Product category interest")
    estimated_quantity: Optional[int] = Field(None, ge=1, description="Estimated order quantity (≥ 1)")
    unit_of_measure: Optional[str] = Field(None, description="Unit of measure")
    target_delivery_date: Optional[str] = Field(None, description="Target delivery date")
    rfq_number: Optional[str] = Field(None, max_length=50, description="RFQ reference number")
    budget_range: Optional[str] = Field(None, max_length=100, description='e.g. "10K–50K USD"')
    technical_specs: Optional[str] = Field(None, max_length=2000, description="Technical specifications")
    sample_required: bool = Field(False, description="Whether a sample is required before PO")

    @field_validator("unit_of_measure")
    @classmethod
    def validate_uom(cls, v):
        valid = ("piece", "kg", "liter", "meter", "box", "ton", "set")
        if v is not None and v.lower() not in valid:
            raise ValueError(f"unit_of_measure must be one of: {', '.join(valid)}")
        return v


class ManufacturingOpportunityData(BaseModel):
    """Validates industry_data for an Opportunity owned by a manufacturing tenant."""

    production_order_id: Optional[str] = Field(None, description="Production order ObjectId")
    product_id: Optional[str] = Field(None, description="Product ObjectId")
    bom_id: Optional[str] = Field(None, description="Bill of Materials ObjectId")
    quantity_ordered: Optional[int] = Field(None, ge=1, description="Quantity ordered (≥ 1)")
    unit_of_measure: Optional[str] = Field(None, description="Unit of measure")
    planned_delivery_date: Optional[datetime] = Field(None, description="Planned delivery datetime")
    quality_standard: Optional[str] = Field(None, max_length=200, description="e.g. ISO 9001, CE")
    special_requirements: Optional[str] = Field(None, max_length=2000, description="Special manufacturing requirements")
    plant_location: Optional[str] = Field(None, max_length=200, description="Plant / factory location")

    @field_validator("unit_of_measure")
    @classmethod
    def validate_uom(cls, v):
        valid = ("piece", "kg", "liter", "meter", "box", "ton", "set")
        if v is not None and v.lower() not in valid:
            raise ValueError(f"unit_of_measure must be one of: {', '.join(valid)}")
        return v


class ManufacturingQuoteData(BaseModel):
    """Validates industry_data for a Quote owned by a manufacturing tenant."""

    product_id: Optional[str] = Field(None, description="Product ObjectId")
    quantity_quoted: Optional[int] = Field(None, ge=1, description="Quantity quoted (≥ 1)")
    unit_of_measure: Optional[str] = Field(None, description="Unit of measure")
    planned_delivery_date: Optional[datetime] = Field(None, description="Planned delivery date")
    quality_standard: Optional[str] = Field(None, max_length=200, description="e.g. ISO 9001, CE")
    special_requirements: Optional[str] = Field(None, max_length=2000, description="Special requirements")
