"""
Quote API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
import logging

from app.models.user import User
from app.models.tenant import Tenant
from app.schemas.quote import (
    QuoteCreate, QuoteUpdate, QuoteResponse, QuoteDetailResponse,
    QuoteListResponse, QuoteItemCreate, QuoteItemUpdate, QuoteItemResponse
)
from app.services.quote_service import QuoteService
from app.schemas.industry_data import validate_industry_data
from app.api.deps import get_current_user, check_permission

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=QuoteDetailResponse, status_code=201)
async def create_quote(
    quote_data: QuoteCreate,
    current_user: User = Depends(check_permission("create_quote"))
):
    """Create a new quote with items -- unified schema for all industries"""
    service = QuoteService()
    
    # Determine tenant industry
    tenant = await Tenant.get(current_user.tenant_id)
    industry = tenant.industry if tenant else "travel"
    
    try:
        # Validate industry_data if present
        if quote_data.industry_data:
            quote_data.industry_data = validate_industry_data(
                industry, quote_data.industry_data, mode="quote"
            )
        
        quote = await service.create_quote(
            quote_data,
            current_user.id,
            current_user.tenant_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during quote creation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    
    result = await service.get_quote_with_items(str(quote.id), current_user.tenant_id)
    
    return QuoteDetailResponse(
        **QuoteResponse.from_orm(result["quote"]).model_dump(),
        items=[QuoteItemResponse.from_orm(i) for i in result["items"]]
    )


@router.get("/", response_model=QuoteListResponse)
async def get_quotes(
    status: Optional[str] = None,
    owner_id: Optional[str] = None,
    opportunity_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(check_permission("view_quote"))
):
    """Get all quotes with filters"""
    service = QuoteService()
    
    quotes = await service.get_quotes_by_tenant(
        current_user.tenant_id,
        status=status,
        owner_id=owner_id,
        opportunity_id=opportunity_id,
        skip=skip,
        limit=limit
    )
    
    return QuoteListResponse(
        quotes=[QuoteResponse.from_orm(q) for q in quotes],
        total=len(quotes)
    )


@router.get("/search")
async def search_quotes(
    query: str,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(check_permission("view_quote"))
):
    """Search quotes"""
    service = QuoteService()
    
    quotes = await service.search_quotes(
        query,
        current_user.tenant_id,
        skip=skip,
        limit=limit
    )
    
    return {
        "quotes": [QuoteResponse.from_orm(q) for q in quotes],
        "total": len(quotes)
    }


@router.get("/{quote_id}", response_model=QuoteDetailResponse)
async def get_quote(
    quote_id: str,
    current_user: User = Depends(check_permission("view_quote"))
):
    """Get quote by ID with items"""
    service = QuoteService()
    
    result = await service.get_quote_with_items(quote_id, current_user.tenant_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    return QuoteDetailResponse(
        **QuoteResponse.from_orm(result["quote"]).model_dump(),
        items=[QuoteItemResponse.from_orm(i) for i in result["items"]]
    )


@router.put("/{quote_id}", response_model=QuoteResponse)
async def update_quote(
    quote_id: str,
    quote_data: QuoteUpdate,
    current_user: User = Depends(check_permission("edit_quote"))
):
    """Update a quote -- unified schema for all industries"""
    service = QuoteService()
    
    # Determine tenant industry
    tenant = await Tenant.get(current_user.tenant_id)
    industry = tenant.industry if tenant else "travel"
    
    try:
        # Validate industry_data if present
        if quote_data.industry_data:
            quote_data.industry_data = validate_industry_data(
                industry, quote_data.industry_data, mode="quote"
            )
        
        quote = await service.update_quote(
            quote_id,
            quote_data,
            current_user.id,
            current_user.tenant_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during quote update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    return QuoteResponse.from_orm(quote)


@router.delete("/{quote_id}")
async def delete_quote(
    quote_id: str,
    current_user: User = Depends(check_permission("delete_quote"))
):
    """Delete a quote (soft delete)"""
    service = QuoteService()
    
    success = await service.delete_quote(quote_id, current_user.tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    return {"error": False, "message": "Quote deleted successfully"}


@router.put("/{quote_id}/status")
async def update_quote_status(
    quote_id: str,
    status: str,
    current_user: User = Depends(check_permission("edit_quote"))
):
    """Update quote status"""
    service = QuoteService()
    
    try:
        quote = await service.update_quote_status(
            quote_id,
            status,
            current_user.tenant_id
        )
        
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        return QuoteResponse.from_orm(quote)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# Quote Item endpoints
@router.post("/{quote_id}/items", response_model=QuoteItemResponse)
async def add_quote_item(
    quote_id: str,
    item_data: QuoteItemCreate,
    current_user: User = Depends(check_permission("edit_quote"))
):
    """Add item to quote"""
    service = QuoteService()
    
    item = await service.add_item(quote_id, item_data, current_user.tenant_id)
    
    if not item:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    return QuoteItemResponse.from_orm(item)


@router.put("/items/{item_id}", response_model=QuoteItemResponse)
async def update_quote_item(
    item_id: str,
    item_data: QuoteItemUpdate,
    current_user: User = Depends(check_permission("edit_quote"))
):
    """Update quote item"""
    service = QuoteService()
    
    item = await service.update_item(item_id, item_data, current_user.tenant_id)
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return QuoteItemResponse.from_orm(item)


@router.delete("/items/{item_id}")
async def delete_quote_item(
    item_id: str,
    current_user: User = Depends(check_permission("edit_quote"))
):
    """Delete quote item"""
    service = QuoteService()
    
    success = await service.delete_item(item_id, current_user.tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {"error": False, "message": "Item deleted successfully"}
