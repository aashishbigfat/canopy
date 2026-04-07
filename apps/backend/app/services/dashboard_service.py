"""
Dashboard service for dashboard and widget management.
"""
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi_cache.decorator import cache
from app.core.cache import custom_key_builder

from app.models.dashboard import Dashboard, DashboardWidget, DashboardUserPreference
from app.schemas.dashboard import (
    DashboardCreate, DashboardUpdate,
    WidgetCreate, WidgetUpdate,
    DashboardPreferenceUpdate
)


class DashboardService:
    """Service for dashboard and widget management."""
    
    # ==================== Dashboard CRUD ====================
    
    async def create_dashboard(
        self,
        data: DashboardCreate,
        user_id: str,
        tenant_id: str
    ) -> Dashboard:
        """Create a new dashboard."""
        dashboard = Dashboard(
            name=data.name,
            description=data.description,
            layout=data.layout,
            columns=data.columns,
            widgets=[w.model_dump() for w in data.widgets],
            is_public=data.is_public,
            created_by=user_id,
            owner_id=user_id,
            tenant_id=tenant_id
        )
        await dashboard.insert()
        return dashboard
    
    async def get_dashboard(
        self,
        dashboard_id: str,
        tenant_id: str
    ) -> Optional[Dashboard]:
        """Get a dashboard by ID."""
        # Convert tenant_id string back to ObjectId for query
        from beanie import PydanticObjectId
        tenant_obj_id = PydanticObjectId(tenant_id)
        
        return await Dashboard.find_one(
            Dashboard.id == PydanticObjectId(dashboard_id),
            Dashboard.tenant_id == tenant_obj_id
        )
    
    async def update_dashboard(
        self,
        dashboard_id: str,
        data: DashboardUpdate,
        tenant_id: str
    ) -> Optional[Dashboard]:
        """Update a dashboard."""
        dashboard = await self.get_dashboard(dashboard_id, tenant_id)
        if not dashboard:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        # Handle widgets conversion
        if "widgets" in update_data and update_data["widgets"]:
            update_data["widgets"] = [w.model_dump() if hasattr(w, 'model_dump') else w for w in update_data["widgets"]]
        
        for key, value in update_data.items():
            setattr(dashboard, key, value)
        
        await dashboard.save()
        return dashboard
    
    async def delete_dashboard(
        self,
        dashboard_id: str,
        tenant_id: str
    ) -> bool:
        """Delete a dashboard."""
        dashboard = await self.get_dashboard(dashboard_id, tenant_id)
        if not dashboard:
            return False
        await dashboard.delete()
        return True
    
    async def list_dashboards(
        self,
        tenant_id: str,
        user_id: Optional[str] = None
    ) -> List[Dashboard]:
        """List dashboards for a user."""
        # Convert tenant_id string back to ObjectId for query
        from beanie import PydanticObjectId
        tenant_obj_id = PydanticObjectId(tenant_id)
        
        if user_id:
            # User's own + public + shared with user
            query = {
                "tenant_id": tenant_obj_id,
                "$or": [
                    {"created_by": user_id},
                    {"owner_id": user_id},
                    {"is_public": True},
                    {"shared_with": user_id}
                ]
            }
        else:
            query = {"tenant_id": tenant_obj_id}
        
        return await Dashboard.find(query).sort(-Dashboard.updated_at).to_list()
    
    async def get_default_dashboard(
        self,
        user_id: str,
        tenant_id: str
    ) -> Optional[Dashboard]:
        """Get the default dashboard for a user."""
        # Convert tenant_id string back to ObjectId for query
        from beanie import PydanticObjectId
        tenant_obj_id = PydanticObjectId(tenant_id)
        
        # Check user preference
        preference = await self.get_user_preferences(user_id, tenant_id)
        if preference and preference.default_dashboard_id:
            dashboard = await self.get_dashboard(preference.default_dashboard_id, tenant_id)
            if dashboard:
                return dashboard
        
        # Fall back to system default
        return await Dashboard.find_one(
            Dashboard.tenant_id == tenant_obj_id,
            Dashboard.is_default == True
        )
    
    async def set_default_dashboard(
        self,
        dashboard_id: str,
        user_id: str,
        tenant_id: str
    ) -> bool:
        """Set a dashboard as the user's default."""
        dashboard = await self.get_dashboard(dashboard_id, tenant_id)
        if not dashboard:
            return False
        
        preference = await self.get_or_create_preferences(user_id, tenant_id)
        preference.default_dashboard_id = dashboard_id
        preference.updated_at = datetime.utcnow()
        await preference.save()
        return True
    
    # ==================== Widget CRUD ====================
    
    async def create_widget(
        self,
        data: WidgetCreate,
        user_id: str,
        tenant_id: str
    ) -> DashboardWidget:
        """Create a new widget."""
        widget = DashboardWidget(
            **data.model_dump(),
            created_by=user_id,
            owner_id=user_id,
            tenant_id=tenant_id
        )
        await widget.insert()
        return widget
    
    async def get_widget(
        self,
        widget_id: str,
        tenant_id: str
    ) -> Optional[DashboardWidget]:
        """Get a widget by ID."""
        # Convert tenant_id string back to ObjectId for query
        from beanie import PydanticObjectId
        tenant_obj_id = PydanticObjectId(tenant_id)
        
        return await DashboardWidget.find_one(
            DashboardWidget.id == PydanticObjectId(widget_id),
            DashboardWidget.tenant_id == tenant_obj_id
        )
    
    async def update_widget(
        self,
        widget_id: str,
        data: WidgetUpdate,
        tenant_id: str
    ) -> Optional[DashboardWidget]:
        """Update a widget."""
        widget = await self.get_widget(widget_id, tenant_id)
        if not widget:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        for key, value in update_data.items():
            setattr(widget, key, value)
        
        await widget.save()
        return widget
    
    async def delete_widget(
        self,
        widget_id: str,
        tenant_id: str
    ) -> bool:
        """Delete a widget."""
        widget = await self.get_widget(widget_id, tenant_id)
        if not widget:
            return False
        await widget.delete()
        return True
    
    async def list_widgets(
        self,
        tenant_id: str,
        widget_type: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> List[DashboardWidget]:
        """List available widgets."""
        # Convert tenant_id string back to ObjectId for query
        from beanie import PydanticObjectId
        tenant_obj_id = PydanticObjectId(tenant_id)
        
        query = {"tenant_id": tenant_obj_id}
        
        if widget_type:
            query["widget_type"] = widget_type
        
        if user_id:
            query["$or"] = [
                {"created_by": user_id},
                {"is_system": True}
            ]
        
        return await DashboardWidget.find(query).to_list()
    
    async def get_widget_data(
        self,
        widget_id: str,
        tenant_id: str,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get widget data by executing its query."""
        widget = await self.get_widget(widget_id, tenant_id)
        if not widget:
            raise ValueError("Widget not found")
        
        return await self._execute_widget_query(widget, user_id)
    
    async def _execute_widget_query(
        self,
        widget: DashboardWidget,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Execute widget query and return data."""
        from app.models.account import Account
        from app.models.contact import Contact
        from app.models.lead import Lead
        from app.models.opportunity import Opportunity
        
        entity_map = {
            "accounts": Account,
            "contacts": Contact,
            "leads": Lead,
            "opportunities": Opportunity
        }
        
        model = entity_map.get(widget.entity_type)
        
        result = {
            "widget_id": str(widget.id),
            "widget_type": widget.widget_type,
            "title": widget.name,
            "value": None,
            "data": None,
            "chart_data": None
        }
        
        if not model:
            return result
        
        # Build time-based filter
        now = datetime.utcnow()
        time_filters = self._get_time_filters(widget.time_range, now)
        
        query = {"tenant_id": widget.tenant_id}
        query.update(widget.filters)
        query.update(time_filters)
        
        if user_id:
            query["owner_id"] = user_id
        
        # Execute based on widget type
        if widget.widget_type == "count":
            result["value"] = await model.find(query).count()
        elif widget.widget_type == "metric":
            # Sum or average
            items = await model.find(query).to_list()
            if widget.field and items:
                values = [getattr(item, widget.field, 0) or 0 for item in items]
                if widget.metric == "sum":
                    result["value"] = sum(values)
                elif widget.metric == "average":
                    result["value"] = sum(values) / len(values) if values else 0
        elif widget.widget_type == "chart":
            # Group by and count
            items = await model.find(query).to_list()
            if widget.group_by:
                groups = {}
                for item in items:
                    key = str(getattr(item, widget.group_by, "Unknown"))
                    groups[key] = groups.get(key, 0) + 1
                result["chart_data"] = {
                    "labels": list(groups.keys()),
                    "values": list(groups.values()),
                    "type": widget.chart_type or "bar"
                }
        elif widget.widget_type == "list":
            items = await model.find(query).limit(10).to_list()
            result["data"] = [
                {"id": str(item.id), "name": getattr(item, "name", str(item.id))}
                for item in items
            ]
        
        return result
    
    def _get_time_filters(self, time_range: str, now: datetime) -> Dict[str, Any]:
        """Get time-based query filters."""
        if time_range == "today":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif time_range == "this_week":
            start = now - timedelta(days=now.weekday())
            start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        elif time_range == "this_month":
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif time_range == "this_quarter":
            quarter_month = ((now.month - 1) // 3) * 3 + 1
            start = now.replace(month=quarter_month, day=1, hour=0, minute=0, second=0, microsecond=0)
        elif time_range == "this_year":
            start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            return {}
        
        return {"created_at": {"$gte": start}}
    
    # ==================== User Preferences ====================
    
    async def get_user_preferences(
        self,
        user_id: str,
        tenant_id: str
    ) -> Optional[DashboardUserPreference]:
        """Get dashboard preferences for a user."""
        return await DashboardUserPreference.find_one(
            DashboardUserPreference.user_id == user_id,
            DashboardUserPreference.tenant_id == tenant_id
        )
    
    async def get_or_create_preferences(
        self,
        user_id: str,
        tenant_id: str
    ) -> DashboardUserPreference:
        """Get or create dashboard preferences for a user."""
        preference = await self.get_user_preferences(user_id, tenant_id)
        if not preference:
            preference = DashboardUserPreference(
                user_id=user_id,
                tenant_id=tenant_id
            )
            await preference.insert()
        return preference
    
    async def update_user_preferences(
        self,
        user_id: str,
        data: DashboardPreferenceUpdate,
        tenant_id: str
    ) -> DashboardUserPreference:
        """Update dashboard preferences for a user."""
        preference = await self.get_or_create_preferences(user_id, tenant_id)
        
        update_data = data.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        for key, value in update_data.items():
            setattr(preference, key, value)
        
        await preference.save()
        return preference
    
    # ==================== Analytics ====================
    
    @cache(expire=300, key_builder=custom_key_builder)
    async def get_analytics_summary(
        self,
        tenant_id: str,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get comprehensive analytics summary."""
        from beanie import PydanticObjectId
        from app.models.account import Account
        from app.models.contact import Contact
        from app.models.lead import Lead
        from app.models.opportunity import Opportunity
        from app.models.opportunity_picklists import SalesStage
        
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        tomorrow_start = today_end
        tomorrow_end = tomorrow_start + timedelta(days=1)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        tenant_obj_id = PydanticObjectId(tenant_id)
        base_query = {"tenant_id": tenant_obj_id}
        if user_id:
            base_query["owner_id"] = PydanticObjectId(user_id)
        
        # Generic counts
        accounts_total = await Account.find(base_query).count()
        contacts_total = await Contact.find(base_query).count()
        leads_total = await Lead.find(base_query).count()
        opportunities_total = await Opportunity.find(base_query).count()
        
        # This month (Analytics Summary)
        month_query = {**base_query, "created_at": {"$gte": month_start}}
        leads_this_month = await Lead.find(month_query).count()
        opportunities_this_month = await Opportunity.find(month_query).count()
        
        # Fetch won/lost stages for accurate filtering
        won_stages = await SalesStage.find(SalesStage.is_won == True).to_list()
        lost_stages = await SalesStage.find(SalesStage.is_lost == True).to_list()
        won_stage_ids = [s.id for s in won_stages]
        lost_stage_ids = [s.id for s in lost_stages]
        
        # Won this month
        won_month_query = {
            **base_query, 
            "sales_stage_id": {"$in": won_stage_ids},
            "close_date": {"$gte": month_start} # Using close_date as it's in the model
        }
        won_this_month_list = await Opportunity.find(won_month_query).to_list()
        won_this_month = len(won_this_month_list)
        revenue_this_month = sum(getattr(opp, "amount", 0) or 0 for opp in won_this_month_list)
        
        # Conversion rate
        conversion_rate = (won_this_month / opportunities_this_month * 100) if opportunities_this_month > 0 else 0
        
        # --- Real-time Dashboard Fields ---
        
        # Today's Opportunities (created today)
        today_opps_query = {**base_query, "created_at": {"$gte": today_start, "$lt": today_end}}
        today_opportunities = await Opportunity.find(today_opps_query).count()
        
        # Open Opportunities (not in won or lost stages)
        open_opps_query = {
            **base_query,
            "sales_stage_id": {"$nin": won_stage_ids + lost_stage_ids}
        }
        open_opportunities = await Opportunity.find(open_opps_query).count()
        
        # B2C vs B2B Open
        b2c_open_query = {**open_opps_query, "opportunitable_type": {"$in": ["PersonalAccount", "Individual"]}}
        b2b_open_query = {**open_opps_query, "opportunitable_type": {"$nin": ["PersonalAccount", "Individual"]}} # Default to B2B
        
        b2c_open_opportunities = await Opportunity.find(b2c_open_query).count()
        b2b_open_opportunities = await Opportunity.find(b2b_open_query).count()
        
        # Tomorrow's Departures (travel_date is tomorrow)
        tomorrow_dep_query = {**base_query, "travel_date": {"$gte": tomorrow_start, "$lt": tomorrow_end}}
        tomorrow_departures = await Opportunity.find(tomorrow_dep_query).count()
        
        # Today's checkout (travel_date + no_of_nights == today)
        checkout_match_query = {
            **base_query,
            "travel_date": {"$type": "date"}
        }
        checkout_pipeline = [
            {"$match": checkout_match_query},
            {
                "$project": {
                    "checkout_date": {
                        "$dateAdd": {
                            "startDate": "$travel_date",
                            "unit": "day",
                            "amount": {"$ifNull": ["$no_of_nights", 0]}
                        }
                    }
                }
            },
            {
                "$match": {
                    "checkout_date": {"$gte": today_start, "$lt": today_end}
                }
            },
            {"$count": "total"}
        ]
        checkout_result = await Opportunity.aggregate(checkout_pipeline).to_list()
        today_checkout = checkout_result[0]["total"] if checkout_result else 0
        
        # Today's Revenue (won today)
        won_today_query = {
            **base_query,
            "sales_stage_id": {"$in": won_stage_ids},
            "close_date": {"$gte": today_start, "$lt": today_end}
        }
        won_today_list = await Opportunity.find(won_today_query).to_list()
        today_revenue = sum(getattr(opp, "amount", 0) or 0 for opp in won_today_list)
        
        return {
            "accounts_total": accounts_total,
            "contacts_total": contacts_total,
            "leads_total": leads_total,
            "opportunities_total": opportunities_total,
            "leads_this_month": leads_this_month,
            "opportunities_this_month": opportunities_this_month,
            "won_this_month": won_this_month,
            "revenue_this_month": revenue_this_month,
            "conversion_rate": round(conversion_rate, 2),
            
            # Real-time fields
            "total_opportunities": opportunities_total,
            "today_opportunities": today_opportunities,
            "open_opportunities": open_opportunities,
            "b2c_open_opportunities": b2c_open_opportunities,
            "b2b_open_opportunities": b2b_open_opportunities,
            "today_checkout": today_checkout,
            "tomorrow_departures": tomorrow_departures,
            "today_revenue": today_revenue
        }
    
    @cache(expire=300, key_builder=custom_key_builder)
    async def get_pipeline_analytics(
        self,
        tenant_id: str,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get opportunity pipeline analytics."""
        from beanie import PydanticObjectId
        from app.models.opportunity import Opportunity
        from app.models.opportunity_picklists import SalesStage
        
        tenant_obj_id = PydanticObjectId(tenant_id)
        query = {"tenant_id": tenant_obj_id}
        if user_id:
            query["owner_id"] = PydanticObjectId(user_id)
        
        opportunities = await Opportunity.find(query).to_list()
        
        # Fetch stages to map names
        all_stages = await SalesStage.find().to_list()
        stages_map = {str(s.id): s.name for s in all_stages}
        
        stages = {}
        for opp in opportunities:
            stage_name = stages_map.get(str(opp.sales_stage_id), "Unknown") if opp.sales_stage_id else "Unknown"
            if stage_name not in stages:
                stages[stage_name] = {"count": 0, "value": 0}
            stages[stage_name]["count"] += 1
            stages[stage_name]["value"] += getattr(opp, "amount", 0) or 0
        
        return {
            "stages": [
                {"stage": k, "count": v["count"], "value": v["value"]}
                for k, v in stages.items()
            ],
            "total_count": len(opportunities),
            "total_value": sum(v["value"] for v in stages.values())
        }
    
    @cache(expire=300, key_builder=custom_key_builder)
    async def get_recent_sales(
        self,
        tenant_id: str,
        user_id: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get recent sales/closed opportunities."""
        from beanie import PydanticObjectId
        from app.models.opportunity import Opportunity
        from app.models.opportunity_picklists import SalesStage
        
        won_stages = await SalesStage.find(SalesStage.is_won == True).to_list()
        won_stage_ids = [s.id for s in won_stages]
        
        tenant_obj_id = PydanticObjectId(tenant_id)
        query = {
            "tenant_id": tenant_obj_id,
            "sales_stage_id": {"$in": won_stage_ids}
        }
        if user_id:
            query["owner_id"] = PydanticObjectId(user_id)
        
        opportunities = await Opportunity.find(query).sort("-close_date").limit(limit).to_list()
        
        return [
            {
                "id": str(opp.id),
                "customer_name": getattr(opp, "account_name", "Unknown"),
                "email": getattr(opp, "contact_email", ""),
                "amount": getattr(opp, "amount", 0),
                "date": opp.close_date.strftime("%Y-%m-%d") if opp.close_date else ""
            }
            for opp in opportunities
        ]
    
    @cache(expire=300, key_builder=custom_key_builder)
    async def get_revenue_chart(
        self,
        tenant_id: str,
        user_id: Optional[str] = None,
        period: str = "month"
    ) -> List[Dict[str, Any]]:
        """Get revenue chart data for specified period."""
        from beanie import PydanticObjectId
        from app.models.opportunity import Opportunity
        from app.models.opportunity_picklists import SalesStage
        import calendar
        
        tenant_obj_id = PydanticObjectId(tenant_id)
        
        now = datetime.utcnow()
        this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        if now.month == 1:
            last_month_start = now.replace(year=now.year - 1, month=12, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            last_month_start = now.replace(month=now.month - 1, day=1, hour=0, minute=0, second=0, microsecond=0)
            
        won_stages = await SalesStage.find(SalesStage.is_won == True).to_list()
        won_stage_ids = [s.id for s in won_stages]
        
        query = {
            "tenant_id": tenant_obj_id,
            "sales_stage_id": {"$in": won_stage_ids},
            "close_date": {"$gte": last_month_start}
        }
        if user_id:
            query["owner_id"] = PydanticObjectId(user_id)
        
        opportunities = await Opportunity.find(query).to_list()
        
        _, days_in_this_month = calendar.monthrange(now.year, now.month)
        
        revenue_data = {}
        for day in range(1, days_in_this_month + 1):
            revenue_data[day] = {
                "day": day,
                "sale_this_month": 0,
                "sale_last_month": 0,
                "target": 0
            }
            
        for opp in opportunities:
            if not opp.close_date:
                continue
                
            is_this_month = opp.close_date >= this_month_start
            day = opp.close_date.day
            if day > days_in_this_month:
                day = days_in_this_month
                
            if is_this_month:
                revenue_data[day]["sale_this_month"] += getattr(opp, "amount", 0) or 0
            else:
                revenue_data[day]["sale_last_month"] += getattr(opp, "amount", 0) or 0
                
        return list(revenue_data.values())
    
    async def get_opportunities_by_stage(
        self,
        tenant_id: str,
        user_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get opportunities grouped by sales stage."""
        result = await self.get_pipeline_analytics(tenant_id, user_id)
        return result
        
    @cache(expire=300, key_builder=custom_key_builder)
    async def get_key_deals(
        self,
        tenant_id: str,
        user_id: Optional[str] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Get key deals (high value)."""
        from beanie import PydanticObjectId
        from app.models.opportunity import Opportunity
        from app.models.user import User
        from app.models.opportunity_picklists import SalesStage
        
        won_stages = await SalesStage.find(SalesStage.is_won == True).to_list()
        lost_stages = await SalesStage.find(SalesStage.is_lost == True).to_list()
        won_stage_ids = [s.id for s in won_stages]
        lost_stage_ids = [s.id for s in lost_stages]
        
        tenant_obj_id = PydanticObjectId(tenant_id)
        query = {
            "tenant_id": tenant_obj_id,
            "sales_stage_id": {"$nin": won_stage_ids + lost_stage_ids},  # Open deals only
        }
        if user_id:
            query["owner_id"] = PydanticObjectId(user_id)
            
        opportunities = await Opportunity.find(query).sort("-amount").limit(limit).to_list()
        
        # N+1 OPTIMIZATION: Bulk fetch Users
        owner_ids = list({opp.owner_id for opp in opportunities if opp.owner_id})
        owners_map = {}
        if owner_ids:
            owners = await User.find({"_id": {"$in": owner_ids}}).to_list()
            owners_map = {str(owner.id): owner.name for owner in owners}
            
        deals = []
        for opp in opportunities:
            owner_name = owners_map.get(str(opp.owner_id), "Unknown") if opp.owner_id else "Unknown"
            travel_date_str = opp.travel_date.strftime("%Y-%m-%d") if opp.travel_date else None
            
            deals.append({
                "id": str(opp.id),
                "name": opp.name,
                "travel_date": travel_date_str,
                "pax": opp.no_of_pax,
                "nights": opp.no_of_nights,
                "stage": getattr(opp, "stage", "Open") or "Open",
                "owner_name": owner_name,
                "amount": opp.amount
            })
            
        return deals

    @cache(expire=300, key_builder=custom_key_builder)
    async def get_task_summary(
        self,
        tenant_id: str,
        user_id: Optional[str] = None
    ) -> Dict[str, int]:
        """Get summary of tasks (missed, payment reminders, etc)."""
        from beanie import PydanticObjectId
        from app.models.task import Task
        
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        tenant_obj_id = PydanticObjectId(tenant_id)
        base_query = {
            "tenant_id": tenant_obj_id,
            "status": {"$ne": "Completed"}
        }
        if user_id:
            base_query["assigned_user_id"] = PydanticObjectId(user_id)
            
        # Missed tasks (due date < today)
        missed_query = {
            **base_query,
            "due_date": {"$lt": today_start}
        }
        missed_count = await Task.find(missed_query).count()
        
        # Payment reminders (Tasks with type/tag 'Payment' due today? Or just matching name?)
        # For now, simplistic approach: search for "Payment" in name
        payment_query = {
            **base_query,
            "name": {"$regex": "Payment", "$options": "i"},
            "due_date": {"$gte": today_start, "$lt": today_end}
        }
        payment_count = await Task.find(payment_query).count()
        
        return {
            "missed_count": missed_count,
            "payment_reminder_count": payment_count,
            "completed_today": 0, # TODO implement if needed
            "upcoming_count": 0
        }


# Singleton instance
dashboard_service = DashboardService()
