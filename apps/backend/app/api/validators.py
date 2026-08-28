"""
Reusable API input validators.
"""
from fastapi import HTTPException
from bson import ObjectId
from bson.errors import InvalidId


def validate_object_id(value: str, field_name: str = "id") -> ObjectId:
    """
    Validate that a string is a proper 24-char hex MongoDB ObjectId.
    Returns the ObjectId on success, raises HTTP 400 on failure.
    """
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {field_name}: '{value}' is not a valid ObjectId"
        )
