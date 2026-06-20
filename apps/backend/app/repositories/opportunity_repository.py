from typing import List, Optional, Dict, Any, Tuple
from beanie import PydanticObjectId

from app.models.opportunity import Opportunity
from app.repositories.base_repository import BaseRepository

class OpportunityRepository(BaseRepository[Opportunity]):
    """
    Repository for Opportunity data access.
    Enforces tenant_id isolation automatically via BaseRepository.
    """
    
    def __init__(self):
        super().__init__(Opportunity)

    async def get_filtered_opportunities(
        self,
        tenant_id: str | PydanticObjectId,
        skip: int = 0,
        limit: int = 10,
        owner_id: Optional[str | PydanticObjectId] = None,
        sales_stage_id: Optional[str | PydanticObjectId] = None,
        cursor: Optional[str] = None,
        **kwargs
    ) -> Tuple[List[Opportunity], Optional[int], Optional[str], bool]:
        """Get opportunities with multiple filters and pagination.

        Returns (opportunities, total, next_cursor, has_more). When `cursor` is
        given, uses keyset pagination (O(1) deep paging, COUNT skipped → total is
        None). Otherwise offset pagination with a total count, plus a cursor for
        the next page so the caller can switch to "load more".
        """
        tenant_obj_id = PydanticObjectId(tenant_id) if isinstance(tenant_id, str) else tenant_id

        query: Dict[str, Any] = {
            "tenant_id": tenant_obj_id,
            "deleted_at": None
        }

        if owner_id:
            query["owner_id"] = PydanticObjectId(owner_id) if isinstance(owner_id, str) else owner_id

        if sales_stage_id:
            query["sales_stage_id"] = PydanticObjectId(sales_stage_id) if isinstance(sales_stage_id, str) else sales_stage_id

        # Merge keyword filters securely
        for k, v in kwargs.items():
            query[k] = v

        from app.core.pagination import keyset_page, encode_cursor

        if cursor is not None:
            pr = await keyset_page(
                self.model, query, sort_field="created_at",
                direction="desc", limit=limit, cursor=cursor,
            )
            return pr["items"], None, pr["next_cursor"], pr["has_more"]

        total = await self.model.find(query).count()
        opportunities = await self.model.find(query).sort(
            [("created_at", -1), ("_id", -1)]
        ).skip(skip).limit(limit).to_list()
        next_cursor = encode_cursor(
            opportunities[-1].created_at, opportunities[-1].id
        ) if opportunities else None
        has_more = len(opportunities) == limit
        return opportunities, total, next_cursor, has_more
