"""
Dashboard service for dashboard and widget management.
"""
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from beanie import PydanticObjectId

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
    
    async def get_analytics_summary(
        self,
        tenant_id: str,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get comprehensive analytics summary."""
        from app.models.account import Account
        from app.models.contact import Contact
        from app.models.lead import Lead
        from app.models.opportunity import Opportunity
        
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        base_query = {"tenant_id": tenant_id}
        if user_id:
            base_query["owner_id"] = user_id
        
        # Total counts
        accounts_total = await Account.find(base_query).count()
        contacts_total = await Contact.find(base_query).count()
        leads_total = await Lead.find(base_query).count()
        opportunities_total = await Opportunity.find(base_query).count()
        
        # This month
        month_query = {**base_query, "created_at": {"$gte": month_start}}
        leads_this_month = await Lead.find(month_query).count()
        opportunities_this_month = await Opportunity.find(month_query).count()
        
        # Won this month
        won_query = {**base_query, "stage": "Closed Won", "closed_at": {"$gte": month_start}}
        won_this_month = await Opportunity.find(won_query).count()
        
        # Revenue
        won_opps = await Opportunity.find(won_query).to_list()
        revenue_this_month = sum(getattr(opp, "amount", 0) or 0 for opp in won_opps)
        
        # Conversion rate
        conversion_rate = (won_this_month / opportunities_this_month * 100) if opportunities_this_month > 0 else 0
        
        return {
            "totals": {
                "accounts": accounts_total,
                "contacts": contacts_total,
                "leads": leads_total,
                "opportunities": opportunities_total
            },
            "this_month": {
                "leads": leads_this_month,
                "opportunities": opportunities_this_month,
                "won": won_this_month,
                "revenue": revenue_this_month
            },
            "metrics": {
                "conversion_rate": round(conversion_rate, 2)
            }
        }
    
    async def get_pipeline_analytics(
        self,
        tenant_id: str,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get opportunity pipeline analytics."""
        from app.models.opportunity import Opportunity
        
        query = {"tenant_id": tenant_id}
        if user_id:
            query["owner_id"] = user_id
        
        opportunities = await Opportunity.find(query).to_list()
        
        stages = {}
        for opp in opportunities:
            stage = getattr(opp, "stage", "Unknown")
            if stage not in stages:
                stages[stage] = {"count": 0, "value": 0}
            stages[stage]["count"] += 1
            stages[stage]["value"] += getattr(opp, "amount", 0) or 0
        
        return {
            "stages": [
                {"stage": k, "count": v["count"], "value": v["value"]}
                for k, v in stages.items()
            ],
            "total_count": len(opportunities),
            "total_value": sum(v["value"] for v in stages.values())
        }
    
    async def get_recent_sales(
        self,
        tenant_id: str,
        user_id: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get recent sales/closed opportunities."""
        from app.models.opportunity import Opportunity
        
        query = {
            "tenant_id": tenant_id,
            "stage": "Closed Won"
        }
        if user_id:
            query["owner_id"] = user_id
        
        opportunities = await Opportunity.find(query).sort("-closed_at").limit(limit).to_list()
        
        return [
            {
                "id": str(opp.id),
                "customer_name": getattr(opp, "account_name", "Unknown"),
                "email": getattr(opp, "contact_email", ""),
                "amount": getattr(opp, "amount", 0),
                "date": opp.closed_at.strftime("%Y-%m-%d") if opp.closed_at else ""
            }
            for opp in opportunities
        ]
    
    async def get_revenue_chart(
        self,
        tenant_id: str,
        user_id: Optional[str] = None,
        period: str = "month"
    ) -> List[Dict[str, Any]]:
        """Get revenue chart data for specified period."""
        from app.models.opportunity import Opportunity
        
        # Determine date range
        now = datetime.utcnow()
        if period == "week":
            start_date = now - timedelta(days=7)
            group_format = "%Y-%m-%d"
        elif period == "year":
            start_date = now.replace(month=1, day=1)
            group_format = "%Y-%m"
        else:  # month
            start_date = now.replace(day=1)
            group_format = "%Y-%m-%d"
        
        query = {
            "tenant_id": tenant_id,
            "stage": "Closed Won",
            "closed_at": {"$gte": start_date}
        }
        if user_id:
            query["owner_id"] = user_id
        
        opportunities = await Opportunity.find(query).sort("closed_at").to_list()
        
        # Group by period
        revenue_data = {}
        for opp in opportunities:
            if not opp.closed_at:
                continue
            
            period_key = opp.closed_at.strftime(group_format)
            if period_key not in revenue_data:
                revenue_data[period_key] = 0
            revenue_data[period_key] += getattr(opp, "amount", 0)
        
        return [
            {"date": date, "revenue": revenue}
            for date, revenue in sorted(revenue_data.items())
        ]
    
    async def get_opportunities_by_stage(
        self,
        tenant_id: str,
        user_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get opportunities grouped by sales stage."""
        return await self.get_pipeline_analytics(tenant_id, user_id)


# Singleton instance
dashboard_service = DashboardService()
