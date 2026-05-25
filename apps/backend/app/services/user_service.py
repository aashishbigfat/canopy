"""
User service layer - Business logic for user management
"""
from typing import List, Optional, Dict
from bson import ObjectId
from datetime import datetime
from app.models.user import User
from app.models.role import Role
from app.schemas.user import (
    UserCreate, UserUpdate, UserPasswordUpdate,
    UserStatusUpdate, UserRoleAssignment, UserTerritoryUpdate,
    UserTargetUpdate
)
from app.mixins.activity_mixin import ActivityMixin


class UserService(ActivityMixin):
    """Service for User business logic"""
    
    def __init__(self):
        super().__init__()
    
    async def create_user(
        self,
        user_data: UserCreate,
        tenant_id: ObjectId,
        created_by: ObjectId
    ) -> User:
        """Create a new user"""
        
        # Check if email already exists
        existing = await User.find_one(
            {"email": user_data.email, "tenant_id": tenant_id, "deleted_at": None}
        )

        if existing:
            raise ValueError(f"User with email {user_data.email} already exists")
        
        # Hash password
        hashed_password = User.hash_password(user_data.password)

        # Convert role IDs — SECURITY: every role must belong to this tenant.
        role_ids = [ObjectId(rid) for rid in user_data.role_ids] if user_data.role_ids else []
        if role_ids:
            valid_roles = await Role.find(
                {
                    "_id": {"$in": role_ids},
                    "tenant_id": tenant_id,
                    "deleted_at": None,
                }
            ).to_list()
            if len(valid_roles) != len(role_ids):
                raise ValueError(
                    "One or more role_ids are invalid or do not belong to this tenant"
                )
        
        # Convert destination IDs
        destination_ids = [ObjectId(did) for did in user_data.assigned_destinations] if user_data.assigned_destinations else []
        
        # Create user
        user = User(
            **user_data.model_dump(
                exclude_unset=True,
                exclude={'password', 'role_ids', 'assigned_destinations', 'smtp_password'}
            ),
            password=hashed_password,
            role_ids=role_ids,
            assigned_destinations=destination_ids,
            tenant_id=tenant_id,
            created_by=created_by
        )
        
        # Handle SMTP password separately (should be encrypted in production)
        if user_data.smtp_password:
            user.smtp_password = user_data.smtp_password
        
        # Convert department_id and role_hierarchy_id
        if user_data.department_id:
            user.department_id = ObjectId(user_data.department_id)
        if user_data.role_hierarchy_id:
            user.role_hierarchy_id = ObjectId(user_data.role_hierarchy_id)
        
        await user.insert()
        
        # Log user creation
        await self.log_entity_created(
            entity=user,
            entity_type="user",
            additional_data={
                "email": user.email,
                "name": user.name,
                "role_ids": [str(rid) for rid in user.role_ids],
                "department_id": str(user.department_id) if user.department_id else None
            }
        )
        
        return user
    
    async def get_user(
        self,
        user_id: str,
        tenant_id: ObjectId
    ) -> Optional[User]:
        """Get user by ID, scoped to tenant."""
        try:
            oid = ObjectId(user_id)
        except Exception:
            return None
        return await User.find_one(
            {"_id": oid, "tenant_id": tenant_id, "deleted_at": None}
        )
    
    async def get_user_with_details(
        self,
        user_id: str,
        tenant_id: ObjectId
    ) -> Optional[Dict]:
        """Get user with role and department details"""
        user = await self.get_user(user_id, tenant_id)
        
        if not user:
            return None
        
        # Get roles — single tenant-scoped query, prevents cross-tenant role exposure
        roles = []
        if user.role_ids:
            role_docs = await Role.find(
                {
                    "_id": {"$in": list(user.role_ids)},
                    "tenant_id": tenant_id,
                    "deleted_at": None,
                }
            ).to_list()
            roles = [
                {
                    "id": str(role.id),
                    "name": role.name,
                    "display_name": role.display_name,
                    "permissions": role.permissions,
                }
                for role in role_docs
            ]

        # Get department (if Department model exists)
        department = None
        if user.department_id:
            # TODO: Implement when Department model is created
            department = {"id": str(user.department_id), "name": "Department"}

        # Get hierarchy (if needed)
        hierarchy = None
        if user.role_hierarchy_id:
            from app.models.role import RoleHierarchy
            hierarchy_obj = await RoleHierarchy.find_one(
                {
                    "_id": user.role_hierarchy_id,
                    "tenant_id": tenant_id,
                    "deleted_at": None,
                }
            )
            if hierarchy_obj:
                hierarchy = {
                    "id": str(hierarchy_obj.id),
                    "name": hierarchy_obj.name,
                    "level": hierarchy_obj.level
                }
        
        return {
            "user": user,
            "roles": roles,
            "department": department,
            "hierarchy": hierarchy
        }
    
    async def update_user(
        self,
        user_id: str,
        user_data: UserUpdate,
        tenant_id: ObjectId,
        updated_by: ObjectId
    ) -> Optional[User]:
        """Update a user"""
        user = await self.get_user(user_id, tenant_id)
        
        if not user:
            return None
        
        # Track changes
        old_values = {}
        updated_fields = {}
        
        # Check email uniqueness if being updated
        if user_data.email and user_data.email != user.email:
            existing = await User.find_one(
                {"email": user_data.email, "tenant_id": tenant_id, "deleted_at": None}
            )
            if existing:
                raise ValueError(f"User with email {user_data.email} already exists")
        
        # Update fields
        update_data = user_data.model_dump(exclude_unset=True, exclude={'assigned_destinations', 'role_ids'})
        for field, value in update_data.items():
            if field == 'password':
                # Hash the password if it's being updated
                if value:
                    user.password = User.hash_password(value)
                    updated_fields['password'] = "***"
            else:
                old_values[field] = getattr(user, field, None)
                if field in ['department_id', 'role_hierarchy_id'] and value:
                    setattr(user, field, ObjectId(value))
                    updated_fields[field] = value
                else:
                    setattr(user, field, value)
                    updated_fields[field] = value
        
        # Handle role_ids — SECURITY: every role must belong to this tenant.
        # Rejects cross-tenant role assignment attempts that would escalate
        # privileges by attaching an admin role from another tenant.
        if user_data.role_ids is not None:
            requested_role_ids = [ObjectId(rid) for rid in user_data.role_ids]
            if requested_role_ids:
                valid_roles = await Role.find(
                    {
                        "_id": {"$in": requested_role_ids},
                        "tenant_id": tenant_id,
                        "deleted_at": None,
                    }
                ).to_list()
                if len(valid_roles) != len(requested_role_ids):
                    raise ValueError(
                        "One or more role_ids are invalid or do not belong to this tenant"
                    )
            old_values['role_ids'] = [str(rid) for rid in user.role_ids]
            user.role_ids = requested_role_ids
            updated_fields['role_ids'] = user_data.role_ids
        
        # Handle destination IDs
        if user_data.assigned_destinations is not None:
            old_values['assigned_destinations'] = [str(did) for did in user.assigned_destinations]
            user.assigned_destinations = [ObjectId(did) for did in user_data.assigned_destinations]
            updated_fields['assigned_destinations'] = user_data.assigned_destinations
        
        user.last_modified_by_id = updated_by
        await user.save()
        
        # Log update
        await self.log_entity_updated(
            entity=user,
            entity_type="user",
            old_values=old_values,
            updated_fields=updated_fields
        )
        
        return user
    
    async def update_password(
        self,
        user_id: str,
        password_data: UserPasswordUpdate,
        tenant_id: ObjectId
    ) -> bool:
        """Update user password"""
        user = await self.get_user(user_id, tenant_id)
        
        if not user:
            return False
        
        # Verify current password
        if not user.verify_password(password_data.current_password):
            raise ValueError("Current password is incorrect")
        
        # Update password
        user.password = User.hash_password(password_data.new_password)
        await user.save()
        
        return True
    
    async def delete_user(
        self,
        user_id: str,
        tenant_id: ObjectId,
        deleted_by: ObjectId = None
    ) -> bool:
        """Soft delete a user"""
        user = await self.get_user(user_id, tenant_id)
        
        if not user:
            return False
        
        await user.soft_delete()
        
        # Log deletion
        await self.log_entity_deleted(
            entity=user,
            entity_type="user",
            additional_data={
                "email": user.email,
                "name": user.name,
                "role_ids": [str(rid) for rid in user.role_ids]
            }
        )
        
        return True
    
    async def get_users_by_tenant(
        self,
        tenant_id: ObjectId,
        department_id: Optional[str] = None,
        role_id: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[User]:
        """Get users for a tenant with filters"""
        
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None
        }
        
        if department_id:
            query["department_id"] = ObjectId(department_id)
        
        if role_id:
            query["role_ids"] = ObjectId(role_id)
        
        if is_active is not None:
            query["is_active"] = is_active
        
        users = await User.find(query).skip(skip).limit(limit).sort("+name").to_list()
        return users
    
    async def search_users(
        self,
        query: str,
        tenant_id: ObjectId,
        skip: int = 0,
        limit: int = 50
    ) -> List[User]:
        """Search users"""
        
        search_query = {
            "tenant_id": tenant_id,
            "deleted_at": None,
            "$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"email": {"$regex": query, "$options": "i"}},
                {"phone": {"$regex": query, "$options": "i"}}
            ]
        }
        
        users = await User.find(search_query).skip(skip).limit(limit).sort("+name").to_list()
        return users
    
    async def update_user_status(
        self,
        user_id: str,
        status_data: UserStatusUpdate,
        tenant_id: ObjectId
    ) -> Optional[User]:
        """Update user active status"""
        user = await self.get_user(user_id, tenant_id)
        
        if not user:
            return None
        
        user.is_active = status_data.is_active
        await user.save()
        
        return user
    
    async def assign_roles(
        self,
        user_id: str,
        role_assignment: UserRoleAssignment,
        tenant_id: ObjectId
    ) -> Optional[User]:
        """Assign roles to user"""
        user = await self.get_user(user_id, tenant_id)
        
        if not user:
            return None
        
        old_role_ids = [str(rid) for rid in user.role_ids]

        # SECURITY: single tenant-scoped query for all role_ids — prevents
        # cross-tenant role attachment and IDOR via guessed ObjectIds.
        requested_role_ids = [ObjectId(rid) for rid in role_assignment.role_ids]
        if requested_role_ids:
            valid_roles = await Role.find(
                {
                    "_id": {"$in": requested_role_ids},
                    "tenant_id": tenant_id,
                    "deleted_at": None,
                }
            ).to_list()
            if len(valid_roles) != len(requested_role_ids):
                raise ValueError(
                    "One or more role_ids are invalid or do not belong to this tenant"
                )
        role_ids = requested_role_ids

        user.role_ids = role_ids
        await user.save()
        
        # Log role assignment change
        await self.log_assignment_changed(
            entity=user,
            entity_type="user_roles",
            old_assigned_to=old_role_ids,
            new_assigned_to=[str(rid) for rid in role_ids],
            additional_data={
                "user_email": user.email,
                "user_name": user.name
            }
        )
        
        return user
    
    async def update_territories(
        self,
        user_id: str,
        territory_data: UserTerritoryUpdate,
        tenant_id: ObjectId
    ) -> Optional[User]:
        """Update user territories"""
        user = await self.get_user(user_id, tenant_id)
        
        if not user:
            return None
        
        user.assigned_countries = territory_data.assigned_countries
        user.not_assigned_countries = territory_data.not_assigned_countries
        
        # Convert destination IDs
        if territory_data.assigned_destinations:
            user.assigned_destinations = [ObjectId(did) for did in territory_data.assigned_destinations]
        
        await user.save()
        return user
    
    async def update_targets(
        self,
        user_id: str,
        target_data: UserTargetUpdate,
        tenant_id: ObjectId
    ) -> Optional[User]:
        """Update user monthly targets"""
        user = await self.get_user(user_id, tenant_id)
        
        if not user:
            return None
        
        user.monthly_revenue_target = target_data.monthly_revenue_target
        user.monthly_deals_target = target_data.monthly_deals_target
        await user.save()
        
        return user
    
    async def get_user_performance(
        self,
        user_id: str,
        tenant_id: ObjectId
    ) -> Optional[Dict]:
        """Get user performance metrics"""
        user = await self.get_user(user_id, tenant_id)
        
        if not user:
            return None
        
        # Import here to avoid circular dependency
        from app.models.opportunity import Opportunity
        from app.models.opportunity_picklists import SalesStage
        from app.models.task import Task
        from app.models.event import Event
        from app.models.email import Email
        
        # Get current month start — timezone-aware UTC matches BaseDocument.created_at
        from datetime import timezone as _tz
        now = datetime.now(_tz.utc)
        month_start = datetime(now.year, now.month, 1, tzinfo=_tz.utc)

        # Build a stage lookup map: stage_id → SalesStage document
        # Convert ObjectId → PydanticObjectId for Beanie model comparison
        from beanie import PydanticObjectId as _PydObjId
        all_stages = await SalesStage.find(
            {"tenant_id": _PydObjId(str(tenant_id)), "is_active": True}
        ).to_list()
        won_stage_ids = {s.id for s in all_stages if s.is_won}
        lost_stage_ids = {s.id for s in all_stages if s.is_lost}

        # Get opportunities
        all_opps = await Opportunity.find(
            {"owner_id": ObjectId(user_id), "tenant_id": tenant_id, "deleted_at": None}
        ).to_list()
        
        # Current month opportunities
        current_month_opps = [
            opp for opp in all_opps
            if opp.created_at >= month_start
        ]
        
        # Calculate metrics using sales_stage_id and the stage lookup
        current_month_revenue = sum(
            opp.amount or 0 for opp in current_month_opps
            if opp.sales_stage_id in won_stage_ids
        )
        
        current_month_deals = len([
            opp for opp in current_month_opps
            if opp.sales_stage_id in won_stage_ids
        ])
        
        # Achievement percentages
        revenue_achievement = (
            (current_month_revenue / user.monthly_revenue_target * 100)
            if user.monthly_revenue_target > 0 else 0
        )
        
        deals_achievement = (
            (current_month_deals / user.monthly_deals_target * 100)
            if user.monthly_deals_target > 0 else 0
        )
        
        # Overall stats using is_won / is_lost flags
        won_opps = [opp for opp in all_opps if opp.sales_stage_id in won_stage_ids]
        lost_opps = [opp for opp in all_opps if opp.sales_stage_id in lost_stage_ids]
        pipeline_opps = [
            opp for opp in all_opps
            if opp.sales_stage_id not in won_stage_ids and opp.sales_stage_id not in lost_stage_ids
        ]
        
        pipeline_value = sum(opp.amount or 0 for opp in pipeline_opps)
        
        # Activity metrics — single-dict queries are unambiguous; the previous
        # multi-positional .find(dict, dict, dict) form worked only because
        # Beanie happened to AND them.
        user_oid = ObjectId(user_id)
        tasks_completed = await Task.find(
            {
                "assigned_user_id": user_oid,
                "tenant_id": tenant_id,
                "status": "Completed",
                "deleted_at": None,
            }
        ).count()

        events_attended = await Event.find(
            {
                "assigned_user_ids": user_oid,
                "tenant_id": tenant_id,
                "deleted_at": None,
            }
        ).count()

        emails_sent = await Email.find(
            {
                "owner_id": user_oid,
                "tenant_id": tenant_id,
                "deleted_at": None,
            }
        ).count()
        
        return {
            "user_id": str(user.id),
            "user_name": user.name,
            "current_month_revenue": current_month_revenue,
            "current_month_deals": current_month_deals,
            "current_month_target_revenue": user.monthly_revenue_target,
            "current_month_target_deals": user.monthly_deals_target,
            "revenue_achievement": round(revenue_achievement, 2),
            "deals_achievement": round(deals_achievement, 2),
            "total_opportunities": len(all_opps),
            "won_opportunities": len(won_opps),
            "lost_opportunities": len(lost_opps),
            "pipeline_value": pipeline_value,
            "tasks_completed": tasks_completed,
            "events_attended": events_attended,
            "emails_sent": emails_sent
        }
    
    async def get_user_team(
        self,
        user_id: str,
        tenant_id: ObjectId
    ) -> List[User]:
        """Get users in the same hierarchy/team"""
        user = await self.get_user(user_id, tenant_id)
        
        if not user or not user.role_hierarchy_id:
            return []
        
        # Get all users in the same hierarchy
        team_users = await User.find(
            {"role_hierarchy_id": user.role_hierarchy_id, "tenant_id": tenant_id, "deleted_at": None, "is_active": True}
        ).to_list()
        
        return team_users
