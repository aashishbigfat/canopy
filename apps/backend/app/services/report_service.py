"""
Report service for analytics and reporting business logic.
"""
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from beanie import PydanticObjectId
from bson import ObjectId

from app.models.report import Report, ReportSchedule, ReportExecution
from app.schemas.report import (
    ReportCreate, ReportUpdate,
    ReportScheduleCreate, ReportScheduleUpdate,
    ReportRunRequest
)


class ReportService:
    """Service for report management and execution."""
    
    # ==================== Report CRUD ====================
    
    async def create_report(
        self,
        data: ReportCreate,
        user_id: str,
        tenant_id: str
    ) -> Report:
        """Create a new report."""
        report = Report(
            **data.model_dump(),
            created_by=user_id,
            owner_id=user_id,
            tenant_id=tenant_id
        )
        await report.insert()
        return report
    
    async def get_report(
        self,
        report_id: str,
        tenant_id: str
    ) -> Optional[Report]:
        """Get a report by ID."""
        return await Report.find_one(
            Report.id == PydanticObjectId(report_id),
            Report.tenant_id == tenant_id
        )
    
    async def update_report(
        self,
        report_id: str,
        data: ReportUpdate,
        tenant_id: str
    ) -> Optional[Report]:
        """Update a report."""
        report = await self.get_report(report_id, tenant_id)
        if not report:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        for key, value in update_data.items():
            setattr(report, key, value)
        
        await report.save()
        return report
    
    async def delete_report(
        self,
        report_id: str,
        tenant_id: str
    ) -> bool:
        """Delete a report."""
        report = await self.get_report(report_id, tenant_id)
        if not report:
            return False
        
        # Delete associated schedules
        await ReportSchedule.find(
            ReportSchedule.report_id == report_id,
            ReportSchedule.tenant_id == tenant_id
        ).delete()
        
        await report.delete()
        return True
    
    async def list_reports(
        self,
        tenant_id: str,
        user_id: Optional[str] = None,
        report_type: Optional[str] = None,
        entity_type: Optional[str] = None,
        is_public: Optional[bool] = None,
        search: Optional[str] = None,
        page: int = 1,
        per_page: int = 20
    ) -> tuple[List[Report], int]:
        """List reports with filtering and pagination."""
        query = {"tenant_id": tenant_id}
        
        # Filter by ownership or public/shared
        if user_id:
            query["$or"] = [
                {"created_by": user_id},
                {"owner_id": user_id},
                {"is_public": True},
                {"shared_with": user_id}
            ]
        
        if report_type:
            query["report_type"] = report_type
        
        if entity_type:
            query["entity_type"] = entity_type
        
        if is_public is not None:
            query["is_public"] = is_public
        
        if search:
            query["name"] = {"$regex": search, "$options": "i"}
        
        total = await Report.find(query).count()
        
        reports = await Report.find(query)\
            .sort(-Report.updated_at)\
            .skip((page - 1) * per_page)\
            .limit(per_page)\
            .to_list()
        
        return reports, total
    
    async def get_favorite_reports(
        self,
        user_id: str,
        tenant_id: str
    ) -> List[Report]:
        """Get favorite reports for a user."""
        return await Report.find(
            Report.tenant_id == tenant_id,
            Report.is_favorite == True,
            {"$or": [
                {"created_by": user_id},
                {"owner_id": user_id}
            ]}
        ).sort(-Report.updated_at).to_list()
    
    async def toggle_favorite(
        self,
        report_id: str,
        tenant_id: str
    ) -> Optional[Report]:
        """Toggle favorite status of a report."""
        report = await self.get_report(report_id, tenant_id)
        if not report:
            return None
        
        report.is_favorite = not report.is_favorite
        report.updated_at = datetime.utcnow()
        await report.save()
        return report
    
    async def duplicate_report(
        self,
        report_id: str,
        user_id: str,
        tenant_id: str,
        new_name: Optional[str] = None
    ) -> Optional[Report]:
        """Duplicate an existing report."""
        original = await self.get_report(report_id, tenant_id)
        if not original:
            return None
        
        # Create copy
        new_report = Report(
            name=new_name or f"{original.name} (Copy)",
            description=original.description,
            report_type=original.report_type,
            entity_type=original.entity_type,
            columns=original.columns.copy(),
            filters=original.filters.copy(),
            group_by=original.group_by,
            order_by=original.order_by,
            order_direction=original.order_direction,
            limit=original.limit,
            chart_type=original.chart_type,
            chart_config=original.chart_config.copy(),
            is_public=False,
            is_favorite=False,
            is_default=False,
            created_by=user_id,
            owner_id=user_id,
            tenant_id=tenant_id
        )
        await new_report.insert()
        return new_report
    
    # ==================== Report Execution ====================
    
    async def run_report(
        self,
        report_id: str,
        user_id: str,
        tenant_id: str,
        request: Optional[ReportRunRequest] = None
    ) -> Dict[str, Any]:
        """Execute a report and return results."""
        report = await self.get_report(report_id, tenant_id)
        if not report:
            raise ValueError("Report not found")
        
        # Create execution record
        execution = ReportExecution(
            report_id=report_id,
            report_name=report.name,
            execution_type="manual",
            status="running",
            executed_by=user_id,
            tenant_id=tenant_id
        )
        await execution.insert()
        
        try:
            # Build and execute query based on entity_type
            data, total_rows = await self._execute_report_query(
                report,
                request.filters_override if request else None
            )
            
            # Update execution status
            execution.status = "completed"
            execution.completed_at = datetime.utcnow()
            execution.duration_ms = int((execution.completed_at - execution.started_at).total_seconds() * 1000)
            execution.row_count = total_rows
            await execution.save()
            
            # Update report last run
            report.last_run_at = datetime.utcnow()
            await report.save()
            
            return {
                "execution_id": str(execution.id),
                "status": "completed",
                "data": data,
                "total_rows": total_rows,
                "chart_data": await self._build_chart_data(data, report) if report.chart_type else None
            }
            
        except Exception as e:
            execution.status = "failed"
            execution.completed_at = datetime.utcnow()
            execution.error_message = str(e)
            await execution.save()
            raise
    
    async def _execute_report_query(
        self,
        report: Report,
        filters_override: Optional[Dict[str, Any]] = None
    ) -> tuple[List[Dict[str, Any]], int]:
        """Execute the report query based on entity type."""
        # Import models dynamically based on entity type
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
        
        model = entity_map.get(report.entity_type)
        if not model:
            return [], 0
        
        # Build query
        query = {"tenant_id": report.tenant_id}
        
        # Apply filters
        filters = filters_override or report.filters
        for key, value in filters.items():
            if value is not None:
                query[key] = value
        
        # Get total count
        total = await model.find(query).count()
        
        # Build sort
        sort_field = getattr(model, report.order_by, None) if report.order_by else None
        
        # Execute query
        cursor = model.find(query)
        
        if sort_field:
            if report.order_direction == "asc":
                cursor = cursor.sort(+sort_field)
            else:
                cursor = cursor.sort(-sort_field)
        
        if report.limit:
            cursor = cursor.limit(report.limit)
        
        results = await cursor.to_list()
        
        # Select columns
        data = []
        for item in results:
            row = {"id": str(item.id)}
            for col in report.columns:
                row[col] = getattr(item, col, None)
            data.append(row)
        
        return data, total
    
    async def _build_chart_data(
        self,
        data: List[Dict[str, Any]],
        report: Report
    ) -> Dict[str, Any]:
        """Build chart data from report results."""
        if not report.chart_type or not report.group_by:
            return {}
        
        # Aggregate data by group_by field
        groups = {}
        for row in data:
            key = row.get(report.group_by, "Unknown")
            if key not in groups:
                groups[key] = 0
            groups[key] += 1
        
        return {
            "type": report.chart_type,
            "labels": list(groups.keys()),
            "values": list(groups.values()),
            "config": report.chart_config
        }
    
    async def get_execution_history(
        self,
        report_id: str,
        tenant_id: str,
        limit: int = 10
    ) -> List[ReportExecution]:
        """Get execution history for a report."""
        return await ReportExecution.find(
            ReportExecution.report_id == report_id,
            ReportExecution.tenant_id == tenant_id
        ).sort(-ReportExecution.created_at).limit(limit).to_list()
    
    # ==================== Report Schedules ====================
    
    async def create_schedule(
        self,
        data: ReportScheduleCreate,
        user_id: str,
        tenant_id: str
    ) -> ReportSchedule:
        """Create a report schedule."""
        # Verify report exists
        report = await self.get_report(data.report_id, tenant_id)
        if not report:
            raise ValueError("Report not found")
        
        schedule = ReportSchedule(
            **data.model_dump(),
            report_name=report.name,
            next_run_at=self._calculate_next_run(data.frequency, data.time_of_day, data.day_of_week, data.day_of_month),
            created_by=user_id,
            owner_id=user_id,
            tenant_id=tenant_id
        )
        await schedule.insert()
        return schedule
    
    async def get_schedule(
        self,
        schedule_id: str,
        tenant_id: str
    ) -> Optional[ReportSchedule]:
        """Get a schedule by ID."""
        return await ReportSchedule.find_one(
            ReportSchedule.id == PydanticObjectId(schedule_id),
            ReportSchedule.tenant_id == tenant_id
        )
    
    async def update_schedule(
        self,
        schedule_id: str,
        data: ReportScheduleUpdate,
        tenant_id: str
    ) -> Optional[ReportSchedule]:
        """Update a report schedule."""
        schedule = await self.get_schedule(schedule_id, tenant_id)
        if not schedule:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        for key, value in update_data.items():
            setattr(schedule, key, value)
        
        # Recalculate next run
        schedule.next_run_at = self._calculate_next_run(
            schedule.frequency,
            schedule.time_of_day,
            schedule.day_of_week,
            schedule.day_of_month
        )
        
        await schedule.save()
        return schedule
    
    async def delete_schedule(
        self,
        schedule_id: str,
        tenant_id: str
    ) -> bool:
        """Delete a report schedule."""
        schedule = await self.get_schedule(schedule_id, tenant_id)
        if not schedule:
            return False
        await schedule.delete()
        return True
    
    async def list_schedules(
        self,
        tenant_id: str,
        report_id: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> List[ReportSchedule]:
        """List report schedules."""
        query = {"tenant_id": tenant_id}
        
        if report_id:
            query["report_id"] = report_id
        
        if is_active is not None:
            query["is_active"] = is_active
        
        return await ReportSchedule.find(query)\
            .sort(ReportSchedule.next_run_at)\
            .to_list()
    
    def _calculate_next_run(
        self,
        frequency: str,
        time_of_day: str,
        day_of_week: Optional[int] = None,
        day_of_month: Optional[int] = None
    ) -> datetime:
        """Calculate the next run time for a schedule."""
        now = datetime.utcnow()
        hour, minute = map(int, time_of_day.split(":"))
        
        if frequency == "daily":
            next_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            if next_run <= now:
                next_run += timedelta(days=1)
        elif frequency == "weekly":
            days_ahead = (day_of_week or 0) - now.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            next_run = now + timedelta(days=days_ahead)
            next_run = next_run.replace(hour=hour, minute=minute, second=0, microsecond=0)
        elif frequency == "monthly":
            next_run = now.replace(day=day_of_month or 1, hour=hour, minute=minute, second=0, microsecond=0)
            if next_run <= now:
                if now.month == 12:
                    next_run = next_run.replace(year=now.year + 1, month=1)
                else:
                    next_run = next_run.replace(month=now.month + 1)
        else:
            next_run = now + timedelta(days=1)
        
        return next_run
    
    # ==================== Dashboard Analytics ====================
    
    async def get_dashboard_stats(
        self,
        tenant_id: str,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get dashboard statistics."""
        from app.models.account import Account
        from app.models.contact import Contact
        from app.models.lead import Lead
        from app.models.opportunity import Opportunity
        
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Build base query
        base_query = {"tenant_id": tenant_id}
        if user_id:
            base_query["owner_id"] = user_id
        
        # Get counts
        accounts_total = await Account.find(base_query).count()
        contacts_total = await Contact.find(base_query).count()
        leads_total = await Lead.find(base_query).count()
        opportunities_total = await Opportunity.find(base_query).count()
        
        # This month counts
        month_query = {**base_query, "created_at": {"$gte": month_start}}
        leads_this_month = await Lead.find(month_query).count()
        opportunities_this_month = await Opportunity.find(month_query).count()
        
        # Won opportunities this month
        won_query = {
            **base_query,
            "stage": "Closed Won",
            "closed_at": {"$gte": month_start}
        }
        won_this_month = await Opportunity.find(won_query).count()
        
        return {
            "totals": {
                "accounts": accounts_total,
                "contacts": contacts_total,
                "leads": leads_total,
                "opportunities": opportunities_total
            },
            "this_month": {
                "new_leads": leads_this_month,
                "new_opportunities": opportunities_this_month,
                "won_opportunities": won_this_month
            }
        }


# Singleton instance
report_service = ReportService()
