"""
BD Assignment Service — resolves the (territory, BD owner, reporting manager)
triple for a lead (or any entity with an address).

Used by lead_service.create_lead/update_lead. Future callers: opportunity_service
when an opportunity changes geography, BD visit creation to inherit defaults.

Geographic match priority is delegated to territory_service.find_territory_for_address
(postal exact → postal wildcard → state → country). BD owner is the first user
in territory.users sorted by last_assigned_at ascending (round-robin). The
reporting manager is the direct ancestor in RoleHierarchy.
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
import logging

from bson import ObjectId

from app.models.territory import Territory
from app.models.user import User
from app.services import hierarchy_walker
from app.services.territory_service import territory_service

logger = logging.getLogger(__name__)


@dataclass
class BDAssignment:
    """Result of resolving a lead/opportunity's BD triple."""
    territory_id: Optional[ObjectId]
    region_id: Optional[ObjectId]
    bd_owner_id: Optional[ObjectId]
    reporting_manager_id: Optional[ObjectId]
    match_source: Optional[str]  # postal_code|postal_code_pattern|state|country|manual

    def is_empty(self) -> bool:
        return self.territory_id is None and self.bd_owner_id is None


class BDAssignmentService:
    """Stateless helper — instantiate once and reuse."""

    async def resolve_for_address(
        self,
        tenant_id: ObjectId,
        country: Optional[str] = None,
        state: Optional[str] = None,
        zip_code: Optional[str] = None,
    ) -> BDAssignment:
        """Resolve territory + BD owner + reporting manager from address parts."""
        empty = BDAssignment(None, None, None, None, None)

        # 1. Territory match (geo priority is owned by territory_service).
        match = await territory_service.find_territory_for_address(
            tenant_id=tenant_id,
            country=country,
            state=state,
            postal_code=zip_code,
        )
        if not match:
            return empty

        territory_oid = ObjectId(match.territory_id) if match.territory_id else None
        region_oid = ObjectId(match.region_id) if match.region_id else None

        # 2. Pick a BD owner from territory.users via round-robin.
        bd_owner_id = await self._pick_bd_owner(tenant_id, territory_oid)

        # 3. Walk up the role hierarchy to find that BD's manager.
        reporting_manager_id = None
        if bd_owner_id:
            reporting_manager_id = await hierarchy_walker.direct_manager_id(
                tenant_id, bd_owner_id
            )

        return BDAssignment(
            territory_id=territory_oid,
            region_id=region_oid,
            bd_owner_id=bd_owner_id,
            reporting_manager_id=reporting_manager_id,
            match_source=match.matched_by,
        )

    async def resolve_manager_for_user(
        self,
        tenant_id: ObjectId,
        user_id: ObjectId,
    ) -> Optional[ObjectId]:
        """Convenience for callers that already know the user and only need a manager."""
        return await hierarchy_walker.direct_manager_id(tenant_id, user_id)

    async def _pick_bd_owner(
        self,
        tenant_id: ObjectId,
        territory_id: Optional[ObjectId],
    ) -> Optional[ObjectId]:
        """
        Round-robin BD picker scoped to the territory's user pool.
        Strategy: pick the user with the oldest last_assigned_at (or null).
        Bump last_assigned_at so the next call rotates.
        """
        if not territory_id:
            return None

        territory = await Territory.find_one(
            {"_id": territory_id, "tenant_id": tenant_id, "is_active": True}
        )
        if not territory or not territory.users:
            # Fall back to the territory manager when no users are pooled.
            return territory.manager_id if territory else None

        candidates = await User.find(
            {
                "_id": {"$in": list(territory.users)},
                "tenant_id": tenant_id,
                "is_active": True,
                "deleted_at": None,
                "is_available_for_assignment": True,
            }
        ).sort("+last_assigned_at").to_list()

        if not candidates:
            return territory.manager_id  # may be None

        chosen = candidates[0]
        try:
            chosen.last_assigned_at = datetime.utcnow()
            await chosen.save()
        except Exception:
            # Rotation tracking must never block lead creation.
            logger.warning("Failed to bump last_assigned_at for BD %s", chosen.id, exc_info=True)
        return chosen.id


bd_assignment_service = BDAssignmentService()
