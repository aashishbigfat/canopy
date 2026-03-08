"""
Incentive service for commission calculations and performance tracking.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from beanie import PydanticObjectId

from app.models.incentive import Incentive, IncentiveTarget, IncentiveAchievement
from app.models.opportunity import Opportunity
from app.schemas.incentive import (
    IncentiveCreate, IncentiveUpdate,
    TargetCreate, TargetUpdate,
    AchievementSummary, AchievementResponse
)


class IncentiveService:
    """Service for incentive management and calculation."""
    
    # ==================== Incentive CRUD ====================
    
    async def create_incentive(
        self,
        data: IncentiveCreate,
        user_id: str,
        tenant_id: str
    ) -> Incentive:
        """Create a new incentive program."""
        # Convert tenant_id string to ObjectId for database storage
        tenant_obj_id = PydanticObjectId(tenant_id)
        
        incentive = Incentive(
            **data.model_dump(),
            created_by=user_id,
            owner_id=user_id,
            tenant_id=tenant_obj_id
        )
        await incentive.insert()
        return incentive
    
    async def get_incentive(
        self,
        incentive_id: str,
        tenant_id: str
    ) -> Optional[Incentive]:
        """Get an incentive by ID."""
        # Convert tenant_id string back to ObjectId for query
        tenant_obj_id = PydanticObjectId(tenant_id)
        
        return await Incentive.find_one(
            Incentive.id == PydanticObjectId(incentive_id),
            Incentive.tenant_id == tenant_obj_id
        )
    
    async def update_incentive(
        self,
        incentive_id: str,
        data: IncentiveUpdate,
        tenant_id: str
    ) -> Optional[Incentive]:
        """Update an incentive."""
        incentive = await self.get_incentive(incentive_id, tenant_id)
        if not incentive:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        for key, value in update_data.items():
            setattr(incentive, key, value)
        
        await incentive.save()
        return incentive
    
    async def delete_incentive(
        self,
        incentive_id: str,
        tenant_id: str
    ) -> bool:
        """Delete an incentive."""
        incentive = await self.get_incentive(incentive_id, tenant_id)
        if not incentive:
            return False
        await incentive.delete()
        return True
    
    async def list_incentives(
        self,
        tenant_id: str,
        is_active: Optional[bool] = None,
        page: int = 1,
        per_page: int = 20
    ) -> tuple[List[Incentive], int]:
        """List incentive programs."""
        # Convert tenant_id string back to ObjectId for query
        tenant_obj_id = PydanticObjectId(tenant_id)
        
        query = {"tenant_id": tenant_obj_id}
        
        if is_active is not None:
            query["is_active"] = is_active
            
        total = await Incentive.find(query).count()
        
        incentives = await Incentive.find(query)\
            .sort(-Incentive.start_date)\
            .skip((page - 1) * per_page)\
            .limit(per_page)\
            .to_list()
            
        return incentives, total

    # ==================== Target Management ====================
    
    async def set_target(
        self,
        data: TargetCreate,
        tenant_id: str
    ) -> IncentiveTarget:
        """Set a user target."""
        # Convert tenant_id string to ObjectId for database operations
        tenant_obj_id = PydanticObjectId(tenant_id)
        
        # Check if target exists for period/user
        existing = await IncentiveTarget.find_one(
            IncentiveTarget.tenant_id == tenant_obj_id,
            IncentiveTarget.user_id == data.user_id,
            IncentiveTarget.start_date == data.start_date,
            IncentiveTarget.end_date == data.end_date
        )
        
        if existing:
            # Update existing
            existing.target_amount = data.target_amount
            existing.target_count = data.target_count
            existing.updated_at = datetime.utcnow()
            await existing.save()
            return existing
        
        target = IncentiveTarget(
            **data.model_dump(),
            tenant_id=tenant_obj_id
        )
        await target.insert()
        return target
    
    async def get_user_target(
        self,
        user_id: str,
        period_start: datetime,
        tenant_id: str
    ) -> Optional[IncentiveTarget]:
        """Get target for user in a period."""
        # Convert tenant_id string back to ObjectId for query
        tenant_obj_id = PydanticObjectId(tenant_id)
        
        return await IncentiveTarget.find_one(
            IncentiveTarget.tenant_id == tenant_obj_id,
            IncentiveTarget.user_id == user_id,
            IncentiveTarget.start_date <= period_start,
            IncentiveTarget.end_date >= period_start
        )

    # ==================== Achievement Calculation ====================
    
    async def calculate_achievement(
        self,
        user_id: str,
        period_start: datetime,
        period_end: datetime,
        tenant_id: str
    ) -> IncentiveAchievement:
        """Calculate sales achievements for a specific period."""
        # Convert tenant_id string back to ObjectId for query
        from beanie import PydanticObjectId
        tenant_obj_id = PydanticObjectId(tenant_id)
        
        # 1. Fetch Sales Stages to find won stage
        from app.models.opportunity_picklists import SalesStage
        won_stage = await SalesStage.find_one(
            SalesStage.tenant_id == tenant_obj_id,
            SalesStage.is_won == True
        )
        
        if not won_stage:
            # Create default won stage if it doesn't exist
            won_stage = SalesStage(
                name="Closed Won",
                probability=100,
                is_won=True,
                tenant_id=tenant_obj_id
            )
            await won_stage.insert()
        
        # 2. Fetch Deals (opportunities) that are won
        deals = await Opportunity.find(
            Opportunity.tenant_id == tenant_obj_id,
            Opportunity.owner_id == PydanticObjectId(user_id),
            Opportunity.sales_stage_id == won_stage.id,
            Opportunity.close_date >= period_start,
            Opportunity.close_date <= period_end
        ).to_list()
        
        achieved_amount = sum(d.amount for d in deals if d.amount)
        achieved_count = len(deals)
        deal_ids = [str(d.id) for d in deals]
        
        # 3. Match Active Incentives
        incentives = await Incentive.find(
            Incentive.tenant_id == tenant_obj_id,
            Incentive.is_active == True,
            Incentive.start_date <= period_start,
            Incentive.end_date >= period_end
        ).to_list()
        
        commission = 0.0
        
        for inc in incentives:
            # Check eligibility
            if inc.eligible_users and user_id not in inc.eligible_users:
                continue
                
            # Basic Commission Rule Logic
            rate = 0.0
            
            # Find applicable tier
            value_to_check = achieved_amount if inc.metric == "revenue" else achieved_count
            
            for tier in inc.tiers:
                min_val = tier.get("min", 0)
                max_val = tier.get("max", float("inf"))
                tier_rate = tier.get("rate", 0)
                
                if inc.tier_type == "flat":
                    # If total falls in this bracket, apply rate to whole amount
                    if min_val <= value_to_check <= max_val:
                        rate = tier_rate
                        break
                elif inc.tier_type == "tiered":
                    # Progressive calculation (simplified for now to just take the rate of the highest bracket reached)
                    if min_val <= value_to_check <= max_val:
                        rate = tier_rate
                        break
                        
            commission += (achieved_amount * (rate / 100))
            
        # 3. Save Achievement
        achievement = await IncentiveAchievement.find_one(
            IncentiveAchievement.tenant_id == tenant_obj_id,
            IncentiveAchievement.user_id == user_id,
            IncentiveAchievement.period_start == period_start,
            IncentiveAchievement.period_end == period_end
        )
        
        if not achievement:
            achievement = IncentiveAchievement(
                user_id=user_id,
                period_start=period_start,
                period_end=period_end,
                tenant_id=tenant_obj_id
            )
        
        achievement.achieved_amount = achieved_amount
        achievement.achieved_count = achieved_count
        achievement.deal_ids = deal_ids
        achievement.commission_earned = commission
        achievement.updated_at = datetime.utcnow()
        
        await achievement.save()
        return achievement


# Singleton instance
incentive_service = IncentiveService()
