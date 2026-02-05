"""
Quote service layer - Business logic for quote management
"""
from typing import List, Optional, Dict
from bson import ObjectId
from datetime import datetime
import random
import string
from app.models.quote import Quote, QuoteItem
from app.schemas.quote import QuoteCreate, QuoteUpdate, QuoteItemCreate, QuoteItemUpdate
from app.mixins.activity_mixin import ActivityMixin


class QuoteService(ActivityMixin):
    """Service for Quote business logic"""
    
    def __init__(self):
        super().__init__()
    
    def _generate_quote_number(self, tenant_id: str) -> str:
        """Generate unique quote number"""
        timestamp = datetime.utcnow().strftime("%Y%m%d")
        random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        return f"QT-{timestamp}-{random_suffix}"
    
    def _calculate_item_totals(self, item: QuoteItem) -> QuoteItem:
        """Calculate item totals"""
        subtotal = item.quantity * item.unit_price
        item.discount_amount = subtotal * (item.discount_percent / 100)
        after_discount = subtotal - item.discount_amount
        item.tax_amount = after_discount * (item.tax_percent / 100)
        item.total = after_discount + item.tax_amount
        return item
    
    async def _recalculate_quote_totals(self, quote: Quote) -> Quote:
        """Recalculate quote totals from items"""
        items = await QuoteItem.find(
            QuoteItem.quote_id == quote.id,
            QuoteItem.deleted_at == None
        ).to_list()
        
        quote.subtotal = sum(item.quantity * item.unit_price for item in items)
        quote.discount_amount = quote.subtotal * (quote.discount_percent / 100)
        after_discount = quote.subtotal - quote.discount_amount
        quote.tax_amount = after_discount * (quote.tax_percent / 100)
        quote.total = after_discount + quote.tax_amount
        
        await quote.save()
        return quote
    
    async def create_quote(
        self,
        quote_data: QuoteCreate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Quote:
        """Create a new quote with items"""
        
        # Generate quote number
        quote_number = self._generate_quote_number(str(tenant_id))
        
        # Create quote
        quote = Quote(
            **quote_data.model_dump(exclude_unset=True, exclude={'items', 'opportunity_id', 'contact_id', 'account_id'}),
            quote_number=quote_number,
            tenant_id=tenant_id,
            owner_id=user_id,
            created_by=user_id
        )
        
        # Convert IDs
        if quote_data.opportunity_id:
            quote.opportunity_id = ObjectId(quote_data.opportunity_id)
        if quote_data.contact_id:
            quote.contact_id = ObjectId(quote_data.contact_id)
        if quote_data.account_id:
            quote.account_id = ObjectId(quote_data.account_id)
        
        await quote.insert()
        
        # Log quote creation
        await self.log_entity_created(
            entity=quote,
            entity_type="quote",
            additional_data={
                "quote_number": quote.quote_number,
                "total": quote.total,
                "opportunity_id": str(quote.opportunity_id) if quote.opportunity_id else None,
                "contact_id": str(quote.contact_id) if quote.contact_id else None,
                "account_id": str(quote.account_id) if quote.account_id else None
            }
        )
        
        # Create items
        for item_data in quote_data.items:
            item = QuoteItem(
                **item_data.model_dump(exclude_unset=True, exclude={'product_id'}),
                quote_id=quote.id,
                tenant_id=tenant_id
            )
            if item_data.product_id:
                item.product_id = ObjectId(item_data.product_id)
            item = self._calculate_item_totals(item)
            await item.insert()
        
        # Recalculate totals
        quote = await self._recalculate_quote_totals(quote)
        return quote
    
    async def get_quote(
        self,
        quote_id: str,
        tenant_id: ObjectId
    ) -> Optional[Quote]:
        """Get quote by ID"""
        quote = await Quote.get(ObjectId(quote_id))
        
        if quote and quote.tenant_id == tenant_id and not quote.deleted_at:
            return quote
        return None
    
    async def get_quote_with_items(
        self,
        quote_id: str,
        tenant_id: ObjectId
    ) -> Optional[Dict]:
        """Get quote with items"""
        quote = await self.get_quote(quote_id, tenant_id)
        
        if not quote:
            return None
        
        items = await QuoteItem.find(
            QuoteItem.quote_id == quote.id,
            QuoteItem.deleted_at == None
        ).sort("+sort_order").to_list()
        
        return {"quote": quote, "items": items}
    
    async def update_quote(
        self,
        quote_id: str,
        quote_data: QuoteUpdate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Optional[Quote]:
        """Update a quote"""
        quote = await self.get_quote(quote_id, tenant_id)
        
        if not quote:
            return None
        
        # Track changes
        old_values = {}
        updated_fields = {}
        
        # Update fields
        update_data = quote_data.model_dump(exclude_unset=True, exclude={'opportunity_id', 'contact_id', 'account_id'})
        for field, value in update_data.items():
            old_values[field] = getattr(quote, field, None)
            setattr(quote, field, value)
            updated_fields[field] = value
        
        # Handle IDs
        if quote_data.opportunity_id is not None:
            old_values['opportunity_id'] = str(quote.opportunity_id) if quote.opportunity_id else None
            quote.opportunity_id = ObjectId(quote_data.opportunity_id) if quote_data.opportunity_id else None
            updated_fields['opportunity_id'] = quote_data.opportunity_id
        if quote_data.contact_id is not None:
            old_values['contact_id'] = str(quote.contact_id) if quote.contact_id else None
            quote.contact_id = ObjectId(quote_data.contact_id) if quote_data.contact_id else None
            updated_fields['contact_id'] = quote_data.contact_id
        if quote_data.account_id is not None:
            old_values['account_id'] = str(quote.account_id) if quote.account_id else None
            quote.account_id = ObjectId(quote_data.account_id) if quote_data.account_id else None
            updated_fields['account_id'] = quote_data.account_id
        
        quote.last_modified_by_id = user_id
        
        # Recalculate totals if discount/tax changed
        quote = await self._recalculate_quote_totals(quote)
        
        # Log update
        await self.log_entity_updated(
            entity=quote,
            entity_type="quote",
            old_values=old_values,
            updated_fields=updated_fields
        )
        
        return quote
    
    async def delete_quote(
        self,
        quote_id: str,
        tenant_id: ObjectId
    ) -> bool:
        """Soft delete a quote and its items"""
        quote = await self.get_quote(quote_id, tenant_id)
        
        if not quote:
            return False
        
        # Delete items
        items = await QuoteItem.find(QuoteItem.quote_id == quote.id).to_list()
        for item in items:
            await item.soft_delete()
        
        await quote.soft_delete()
        return True
    
    async def get_quotes_by_tenant(
        self,
        tenant_id: ObjectId,
        status: Optional[str] = None,
        owner_id: Optional[str] = None,
        opportunity_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Quote]:
        """Get quotes for a tenant with filters"""
        
        query = {"tenant_id": tenant_id, "deleted_at": None}
        
        if status:
            query["status"] = status
        if owner_id:
            query["owner_id"] = ObjectId(owner_id)
        if opportunity_id:
            query["opportunity_id"] = ObjectId(opportunity_id)
        
        quotes = await Quote.find(query).skip(skip).limit(limit).sort("-quote_date").to_list()
        return quotes
    
    async def search_quotes(
        self,
        query: str,
        tenant_id: ObjectId,
        skip: int = 0,
        limit: int = 50
    ) -> List[Quote]:
        """Search quotes"""
        
        search_query = {
            "tenant_id": tenant_id,
            "deleted_at": None,
            "$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"quote_number": {"$regex": query, "$options": "i"}}
            ]
        }
        
        quotes = await Quote.find(search_query).skip(skip).limit(limit).sort("-quote_date").to_list()
        return quotes
    
    async def update_quote_status(
        self,
        quote_id: str,
        status: str,
        tenant_id: ObjectId
    ) -> Optional[Quote]:
        """Update quote status"""
        quote = await self.get_quote(quote_id, tenant_id)
        
        if not quote:
            return None
        
        valid_statuses = ["Draft", "Sent", "Accepted", "Rejected", "Expired"]
        if status not in valid_statuses:
            raise ValueError(f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
        
        quote.status = status
        await quote.save()
        return quote
    
    # Quote Item methods
    async def add_item(
        self,
        quote_id: str,
        item_data: QuoteItemCreate,
        tenant_id: ObjectId
    ) -> Optional[QuoteItem]:
        """Add item to quote"""
        quote = await self.get_quote(quote_id, tenant_id)
        
        if not quote:
            return None
        
        item = QuoteItem(
            **item_data.model_dump(exclude_unset=True, exclude={'product_id'}),
            quote_id=quote.id,
            tenant_id=tenant_id
        )
        if item_data.product_id:
            item.product_id = ObjectId(item_data.product_id)
        
        item = self._calculate_item_totals(item)
        await item.insert()
        
        # Recalculate quote totals
        await self._recalculate_quote_totals(quote)
        
        return item
    
    async def update_item(
        self,
        item_id: str,
        item_data: QuoteItemUpdate,
        tenant_id: ObjectId
    ) -> Optional[QuoteItem]:
        """Update quote item"""
        item = await QuoteItem.get(ObjectId(item_id))
        
        if not item or item.tenant_id != tenant_id or item.deleted_at:
            return None
        
        # Update fields
        update_data = item_data.model_dump(exclude_unset=True, exclude={'product_id'})
        for field, value in update_data.items():
            setattr(item, field, value)
        
        if item_data.product_id is not None:
            item.product_id = ObjectId(item_data.product_id) if item_data.product_id else None
        
        item = self._calculate_item_totals(item)
        await item.save()
        
        # Recalculate quote totals
        quote = await Quote.get(item.quote_id)
        if quote:
            await self._recalculate_quote_totals(quote)
        
        return item
    
    async def delete_item(
        self,
        item_id: str,
        tenant_id: ObjectId
    ) -> bool:
        """Delete quote item"""
        item = await QuoteItem.get(ObjectId(item_id))
        
        if not item or item.tenant_id != tenant_id or item.deleted_at:
            return False
        
        quote_id = item.quote_id
        await item.soft_delete()
        
        # Recalculate quote totals
        quote = await Quote.get(quote_id)
        if quote:
            await self._recalculate_quote_totals(quote)
        
        return True
