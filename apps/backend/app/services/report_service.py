"""
Report service for analytics and reporting business logic.
"""
from datetime import datetime, timedelta, date
import json
from typing import Optional, List, Dict, Any
from beanie import PydanticObjectId
from bson import ObjectId

from app.models.report import Report, ReportSchedule, ReportExecution
from app.models.bd_visit import BDVisit
from app.models.expense import Expense
from app.models.opportunity import Opportunity
from app.models.user import User
from app.schemas.report import (
    ReportCreate, ReportUpdate,
    ReportScheduleCreate, ReportScheduleUpdate,
    ReportRunRequest
)


DEFAULT_REPORT_COLUMNS: Dict[str, List[str]] = {
    "accounts": [
        "name",
        "phone",
        "billing_street",
        "billing_city",
        "acc_type_id",
        "created_at",
        "owner_id",
    ],
    "person_accounts": [
        "first_name",
        "last_name",
        "email",
        "phone",
        "mobile",
        "owner_id",
        "created_at",
    ],
    "contacts": [
        "first_name",
        "last_name",
        "email",
        "phone",
        "mobile",
        "owner_id",
        "created_at",
    ],
    "leads": [
        "first_name",
        "last_name",
        "email",
        "phone",
        "company",
        "reports_to_id",
        "street",
        "tenant_id",
        "created_by",
    ],
    "opportunities": [
        "no_of_pax",
        "name",
        "experience_id",
        "destination_id",
        "type",
        "account_typet",
        "opportunitable_id",
        "amount",
        "sales_stage_id",
        "travel_date",
        "close_date",
        "owner_id",
        "created_at",
        "updated_at",
        "opportunity_tag_id",
    ],
    "suppliers": [
        "name",
        "supplier_type_id",
        "phone",
        "email",
        "billing_city",
        "owner_id",
        "created_at",
    ],
}

REPORT_COLUMN_VALUE_PATHS: Dict[str, Dict[str, str]] = {
    "accounts": {
        "owner_id": "owner_name",
    },
    "contacts": {
        "owner_id": "owner_name",
    },
    "leads": {
        "reports_to_id": "reporting_manager_id",
        "owner_id": "owner_name",
    },
    "opportunities": {
        "account_typet": "opportunitable_type",
        "destination_id": "industry_data.destinations",
        "no_of_pax": "industry_data.no_of_pax",
        "opportunitable_id": "account_name",
        "owner_id": "owner_name",
        "type": "segment",
        "travel_date": "industry_data.travel_date",
    },
    "suppliers": {
        "billing_city": "city",
        "billing_country": "country",
        "billing_state": "state",
        "billing_street": "street",
        "billing_zip": "zip",
        "destination": "destinations",
        "owner_id": "owner_id",
        "supplier_service_id": "services",
        "supplier_type_id": "supplier_type",
    },
}

REPORT_COLUMN_LABELS: Dict[str, str] = {
    "account_typet": "Account Type",
    "acc_type_id": "Account Type",
    "amount": "Amount",
    "billing_city": "Billing City",
    "billing_country": "Billing Country",
    "billing_state": "Billing State",
    "billing_street": "Billing Street",
    "billing_zip": "Billing Zip",
    "close_date": "Close Date",
    "company": "Company",
    "created_at": "Created Date",
    "created_by": "Created By",
    "destination_id": "Destination(s)",
    "email": "Email",
    "experience_id": "Experience",
    "first_name": "First Name",
    "last_name": "Last Name",
    "mobile": "Mobile",
    "name": "Name",
    "no_of_pax": "No of Pax",
    "opportunitable_id": "Account Name",
    "opportunity_tag_id": "Tag(s)",
    "owner_id": "Owner",
    "phone": "Phone",
    "reports_to_id": "Reports To",
    "sales_stage_id": "Sales Stage",
    "type": "Segment",
    "street": "Street",
    "supplier_type_id": "Supplier Type",
    "tenant_id": "Tenant",
    "travel_date": "Travel Date",
    "updated_at": "Last Modified Date",
}


class ReportService:
    """Service for report management and execution."""

    OLD_STANDARD_REPORTS: List[Dict[str, Any]] = [
        {"name": "Opportunities Closed Today", "entity_type": "opportunities", "date_range_type": "closed_current_today", "flag": 0},
        {"name": "Opportunities Closed in Current Week", "entity_type": "opportunities", "date_range_type": "closed_current_week", "flag": 0},
        {"name": "Opportunities Closed in Current Month", "entity_type": "opportunities", "date_range_type": "closed_current_month", "flag": 0},
        {"name": "Opportunities Closed in Current Financial Quarter", "entity_type": "opportunities", "date_range_type": "closed_current_quarter", "flag": 0},
        {"name": "Opportunities Closed in Current Financial Year", "entity_type": "opportunities", "date_range_type": "closed_current_year", "flag": 0},
        {"name": "Opportunities Closed Yesterday", "entity_type": "opportunities", "date_range_type": "closed_current_yesterday", "flag": 0},
        {"name": "Opportunities Closed Last Week", "entity_type": "opportunities", "date_range_type": "closed_last_week", "flag": 0},
        {"name": "Opportunities Closed Last Month", "entity_type": "opportunities", "date_range_type": "closed_last_month", "flag": 0},
        {"name": "Opportunities Closed Last Financial Quarter", "entity_type": "opportunities", "date_range_type": "closed_last_quarter", "flag": 0},
        {"name": "Opportunities Closed Last Financial Year", "entity_type": "opportunities", "date_range_type": "closed_last_year", "flag": 0},
        {"name": "Opportunities created Today", "entity_type": "opportunities", "date_range_type": "current_today", "flag": 0},
        {"name": "Opportunities created Current Week", "entity_type": "opportunities", "date_range_type": "current_week", "flag": 0},
        {"name": "Opportunities created Current Month", "entity_type": "opportunities", "date_range_type": "current_month", "flag": 0},
        {"name": "Opportunities created Current Financial Quarter", "entity_type": "opportunities", "date_range_type": "current_quarter", "flag": 0},
        {"name": "Opportunities created Current Financial Year", "entity_type": "opportunities", "date_range_type": "current_year", "flag": 0},
        {"name": "Opportunities created Yesterday", "entity_type": "opportunities", "date_range_type": "current_yesterday", "flag": 0},
        {"name": "Opportunities created Last Week", "entity_type": "opportunities", "date_range_type": "last_week", "flag": 0},
        {"name": "Opportunities created Last Month", "entity_type": "opportunities", "date_range_type": "last_month", "flag": 0},
        {"name": "Opportunities created in Last Financial Quarter", "entity_type": "opportunities", "date_range_type": "last_quarter", "flag": 0},
        {"name": "Opportunities created in Last Financial Year", "entity_type": "opportunities", "date_range_type": "last_year", "flag": 0},
        {"name": "Passenger Travel Today", "entity_type": "opportunities", "date_range_type": "ps_current_today", "flag": 0},
        {"name": "Passenger Travel in Current Week", "entity_type": "opportunities", "date_range_type": "ps_current_week", "flag": 0},
        {"name": "Passenger Travel in Current Month", "entity_type": "opportunities", "date_range_type": "ps_current_month", "flag": 0},
        {"name": "Passenger Travel in Current Financial Quarter", "entity_type": "opportunities", "date_range_type": "ps_current_quarter", "flag": 0},
        {"name": "Passenger Travel in Current Financial Year", "entity_type": "opportunities", "date_range_type": "ps_current_year", "flag": 0},
        {"name": "Passenger Travelled Yesterday", "entity_type": "opportunities", "date_range_type": "ps_current_yesterday", "flag": 0},
        {"name": "Passenger Travelled in Previous Week", "entity_type": "opportunities", "date_range_type": "ps_last_week", "flag": 0},
        {"name": "Passenger Travelled in Previous Month", "entity_type": "opportunities", "date_range_type": "ps_last_month", "flag": 0},
        {"name": "Passenger Travelled in Previous Financial Quarter", "entity_type": "opportunities", "date_range_type": "ps_last_quarter", "flag": 0},
        {"name": "Passenger Travelled in Previous Financial Year", "entity_type": "opportunities", "date_range_type": "ps_last_year", "flag": 0},
        {"name": "Passenger Travelling Tomorrow", "entity_type": "opportunities", "date_range_type": "ps_next_tomorrow", "flag": 0},
        {"name": "Passenger Travelling Next Week", "entity_type": "opportunities", "date_range_type": "ps_next_week", "flag": 0},
        {"name": "Passenger Travelling Next Month", "entity_type": "opportunities", "date_range_type": "ps_next_month", "flag": 0},
        {"name": "Passenger Travelling in Next Financial Quarter", "entity_type": "opportunities", "date_range_type": "ps_next_quarter", "flag": 0},
        {"name": "Passenger Travelling in Next Financial Year", "entity_type": "opportunities", "date_range_type": "ps_next_year", "flag": 0},
        {"name": "Month Performance", "entity_type": "opportunities", "date_range_type": "opportunities", "flag": 1},
        {"name": "Segment wise Business", "entity_type": "opportunities", "date_range_type": "opportunities_segment", "flag": 1},
        {"name": "Opportunity Country wise", "entity_type": "opportunities", "date_range_type": "opportunities_country_wise", "flag": 1},
        {"name": "Monthly Target/Achieved", "entity_type": "opportunities", "date_range_type": "monthly_target_achieved", "flag": 1},
        {"name": "Opportunity Assigned", "entity_type": "opportunities", "date_range_type": "current_today", "flag": 2},
        {"name": "Opportunity Claimed", "entity_type": "opportunities", "date_range_type": "current_today", "flag": 3},
        *[
            {"name": f"Accounts created {label}", "entity_type": "accounts", "date_range_type": range_type, "flag": 0}
            for label, range_type in [
                ("Today", "current_today"), ("in Current Week", "current_week"), ("in Current Month", "current_month"),
                ("in Current Financial Quarter", "current_quarter"), ("in Current Financial Year", "current_year"),
                ("Yesterday", "current_yesterday"), ("Last Week", "last_week"), ("Last Month", "last_month"),
                ("in Last Financial Quarter", "last_quarter"), ("in Last Financial Year", "last_year"),
            ]
        ],
        *[
            {"name": f"Contacts created {label}", "entity_type": "contacts", "date_range_type": range_type, "flag": 0}
            for label, range_type in [
                ("Today", "current_today"), ("in Current Week", "current_week"), ("in Current Month", "current_month"),
                ("in Current Financial Quarter", "current_quarter"), ("in Current Financial Year", "current_year"),
                ("Yesterday", "current_yesterday"), ("Last Week", "last_week"), ("Last Month", "last_month"),
                ("in Last Financial Quarter", "last_quarter"), ("in Last Financial Year", "last_year"),
            ]
        ],
        *[
            {"name": f"Leads created {label}", "entity_type": "leads", "date_range_type": range_type, "flag": 0}
            for label, range_type in [
                ("Today", "current_today"), ("in Current Week", "current_week"), ("in Current Month", "current_month"),
                ("in Current Financial Quarter", "current_quarter"), ("in Current Financial Year", "current_year"),
                ("Yesterday", "current_yesterday"), ("Last Week", "last_week"), ("Last Month", "last_month"),
                ("in Last Financial Quarter", "last_quarter"), ("in Last Financial Year", "last_year"),
            ]
        ],
        *[
            {"name": f"Person Accounts created {label}", "entity_type": "accounts", "date_range_type": range_type, "flag": 0, "is_person_account": True}
            for label, range_type in [
                ("Today", "current_today"), ("in Current Week", "current_week"), ("in Current Month", "current_month"),
                ("in Current Financial Quarter", "current_quarter"), ("in Current Financial Year", "current_year"),
                ("Yesterday", "current_yesterday"), ("Last Week", "last_week"), ("Last Month", "last_month"),
                ("in Last Financial Quarter", "last_quarter"), ("in Last Financial Year", "last_year"),
            ]
        ],
        *[
            {"name": f"Supplier created {label}", "entity_type": "suppliers", "date_range_type": range_type, "flag": 0}
            for label, range_type in [
                ("Today", "current_today"), ("in Current Week", "current_week"), ("in Current Month", "current_month"),
                ("in Current Financial Quarter", "current_quarter"), ("in Current Financial Year", "current_year"),
                ("Yesterday", "current_yesterday"), ("Last Week", "last_week"), ("Last Month", "last_month"),
                ("in Last Financial Quarter", "last_quarter"), ("in Last Financial Year", "last_year"),
            ]
        ],
    ]

    DEFAULT_REPORTS: List[Dict[str, Any]] = [
        *[
            {
                "name": report["name"],
                "entity_type": report["entity_type"],
                "description": report["name"],
                "columns": DEFAULT_REPORT_COLUMNS["person_accounts" if report.get("is_person_account") else report["entity_type"]],
                "filters": {
                    **({"is_person_account": True} if report.get("is_person_account") else {"is_person_account": False} if report["entity_type"] == "accounts" else {}),
                    **({"$date": {"field": "industry_data.travel_date", "range": report["date_range_type"]}} if report["date_range_type"].startswith("ps_") else {"$date": {"field": "close_date", "range": report["date_range_type"]}} if report["date_range_type"].startswith("closed_") else {"$date": {"field": "created_at", "range": report["date_range_type"]}} if report["flag"] == 0 else {}),
                },
                "order_by": "industry_data.travel_date" if report["date_range_type"].startswith("ps_") else "close_date" if report["date_range_type"].startswith("closed_") else "created_at",
                "chart_config": {"old_crm": {"date_range_type": report["date_range_type"], "flag": report["flag"]}},
            }
            for report in OLD_STANDARD_REPORTS
        ],
    ]
    
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
            last_modified_by_id=user_id,
            tenant_id=tenant_id
        )
        await report.insert()
        return report

    async def seed_default_reports(self, tenant_id: str, user_id: str) -> int:
        """Idempotently seed TFC-style default reports for a tenant."""
        tenant_obj_id = PydanticObjectId(str(tenant_id))

        default_keys = {
            (definition["entity_type"], definition["name"])
            for definition in self.DEFAULT_REPORTS
        }
        existing_defaults = await Report.find({
            "tenant_id": tenant_obj_id,
            "is_default": True,
            "report_type": "standard",
        }).to_list()

        created = 0
        existing_by_key: Dict[tuple[str, str], Report] = {}

        for report in existing_defaults:
            key = (report.entity_type, report.name)
            if key not in default_keys:
                await report.delete()
                continue
            if key in existing_by_key:
                await report.delete()
                continue
            existing_by_key[key] = report

        for index, definition in enumerate(self.DEFAULT_REPORTS):
            existing = existing_by_key.get((definition["entity_type"], definition["name"]))

            data = {
                "description": definition.get("description"),
                "report_type": "standard",
                "columns": definition.get("columns", []),
                "filters": definition.get("filters", {}),
                "group_by": definition.get("group_by"),
                "order_by": definition.get("order_by", "updated_at"),
                "order_direction": definition.get("order_direction", "desc"),
                "limit": definition.get("limit"),
                "chart_type": definition.get("chart_type"),
                "chart_config": definition.get("chart_config", {}),
                "is_public": True,
                "is_default": True,
                "updated_at": datetime.utcnow() - timedelta(seconds=(len(self.DEFAULT_REPORTS) - index)),
            }

            if existing:
                changed = False
                for key, value in data.items():
                    if getattr(existing, key) != value:
                        setattr(existing, key, value)
                        changed = True
                if changed:
                    await existing.save()
                continue

            await Report(
                name=definition["name"],
                entity_type=definition["entity_type"],
                created_by=user_id,
                owner_id=user_id,
                tenant_id=tenant_obj_id,
                **data,
            ).insert()
            created += 1

        return created

    async def list_bd_report_users(self, current_user: User) -> List[Dict[str, Optional[str]]]:
        """Return BD report owners from actual BD data, matching old CRM's dynamic list."""
        tenant_obj_id = PydanticObjectId(str(current_user.tenant_id))
        current_user_id = PydanticObjectId(str(current_user.id))
        is_admin = await current_user.is_super_admin()

        async def distinct_ids(model: Any, field: str, query: Dict[str, Any]) -> List[Any]:
            return await model.get_motor_collection().distinct(field, query)

        base_query: Dict[str, Any] = {"tenant_id": tenant_obj_id, "deleted_at": None}
        if is_admin:
            bd_ids = [
                *await distinct_ids(BDVisit, "owner_id", base_query),
                *await distinct_ids(Expense, "owner_id", base_query),
                *await distinct_ids(Opportunity, "bd_owner_id", base_query),
            ]
        else:
            self_query = {**base_query, "$or": [{"owner_id": current_user_id}, {"reporting_manager_id": current_user_id}]}
            opportunity_query = {**base_query, "$or": [{"bd_owner_id": current_user_id}, {"reporting_manager_id": current_user_id}]}
            bd_ids = [
                *await distinct_ids(BDVisit, "owner_id", self_query),
                *await distinct_ids(Expense, "owner_id", self_query),
                *await distinct_ids(Opportunity, "bd_owner_id", opportunity_query),
            ]

        normalized_ids = []
        seen_ids = set()
        for bd_id in bd_ids:
            if not bd_id:
                continue
            bd_obj_id = PydanticObjectId(str(bd_id))
            if str(bd_obj_id) in seen_ids:
                continue
            seen_ids.add(str(bd_obj_id))
            normalized_ids.append(bd_obj_id)

        if not normalized_ids:
            return []

        users = await User.find({
            "_id": {"$in": normalized_ids},
            "tenant_id": tenant_obj_id,
            "deleted_at": None,
        }).to_list()
        user_by_id = {str(user.id): user for user in users}

        results: List[Dict[str, Optional[str]]] = []
        for bd_id in normalized_ids:
            user = user_by_id.get(str(bd_id))
            if not user:
                continue
            results.append({
                "id": str(user.id),
                "name": user.name or None,
            })

        return sorted(results, key=lambda item: item["name"] or "")
    
    async def get_report(
        self,
        report_id: str,
        tenant_id: str
    ) -> Optional[Report]:
        """Get a report by ID."""
        return await Report.find_one(
            {"_id": PydanticObjectId(report_id), "tenant_id": PydanticObjectId(str(tenant_id))}
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
            {"report_id": report_id, "tenant_id": tenant_id}
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
        tenant_obj_id = PydanticObjectId(str(tenant_id))
        if user_id:
            await self.seed_default_reports(str(tenant_obj_id), user_id)

        query = {"tenant_id": tenant_obj_id}
        
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
            {"tenant_id": tenant_id, "is_favorite": True, "$or": [
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
            last_modified_by_id=user_id,
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
            data, add_display_columns = await self._attach_report_custom_columns(report, data)
            
            # Update execution status
            execution.status = "completed"
            execution.completed_at = datetime.utcnow()
            execution.duration_ms = int((execution.completed_at - execution.started_at).total_seconds() * 1000)
            execution.row_count = total_rows
            await execution.save()
            
            # Update report last run
            report.last_run_at = datetime.utcnow()
            await report.save()
            display_columns = [
                {"name": column, "alias_name": self._report_column_label(report.entity_type, column)}
                for column in self._standard_report_columns(report.columns)
            ]
            
            return {
                "execution_id": str(execution.id),
                "status": "completed",
                "data": data,
                "total_rows": total_rows,
                "chart_data": await self._build_chart_data(data, report) if report.chart_type else None,
                "display_columns": display_columns,
                "add_display_columns": add_display_columns,
                "report_results": data,
                "total": total_rows,
                "report_details": self._serialize_report_details(report),
                "reportable_type": self._reportable_type_payload(report),
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
        from app.models.bd_visit import BDVisit
        from app.models.expense import Expense
        from app.models.supplier import Supplier
        
        entity_map = {
            "accounts": Account,
            "contacts": Contact,
            "leads": Lead,
            "opportunities": Opportunity,
            "bd_visits": BDVisit,
            "expenses": Expense,
            "suppliers": Supplier
        }
        
        model = entity_map.get(report.entity_type)
        if not model:
            return [], 0
        
        # Build query
        query = {"tenant_id": report.tenant_id, "deleted_at": None}
        
        # Apply filters
        filters = dict(filters_override or report.filters)
        owner_scoped = filters.pop("$owner", False)
        date_filter = filters.pop("$date", None)
        filter_rules = filters.pop("$rules", None)
        if owner_scoped and report.owner_id:
            query["owner_id"] = PydanticObjectId(str(report.owner_id))
        if date_filter:
            date_query = self._date_range_filter(date_filter)
            if date_query:
                query[date_filter.get("field", "created_at")] = date_query
        if filter_rules:
            from app.core.entity_filter import build_filter_clauses
            filter_entity_type = {
                "accounts": "personal_account" if filters.get("is_person_account") is True else "account",
                "contacts": "contact",
                "leads": "lead",
                "opportunities": "opportunity",
                "suppliers": "supplier",
                "tasks": "task",
            }.get(report.entity_type, report.entity_type)
            clauses = build_filter_clauses(filter_entity_type, filter_rules)
            if clauses:
                query["$and"] = [*query.get("$and", []), *clauses]
        for key, value in filters.items():
            if report.entity_type == "accounts" and key == "is_person_account" and value is False:
                query[key] = {"$ne": True}
            else:
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
            for col in self._standard_report_columns(report.columns):
                value_path = self._report_column_value_path(report.entity_type, col)
                row[col] = self._serialize_report_value(self._get_nested_value(item, value_path))
            data.append(row)
        
        return data, total

    def _standard_report_columns(self, columns: List[str]) -> List[str]:
        return [column for column in columns if not str(column).startswith("additional:")]

    def _additional_report_field_ids(self, columns: List[str]) -> List[str]:
        return [
            str(column).split("additional:", 1)[1]
            for column in columns
            if str(column).startswith("additional:") and str(column).split("additional:", 1)[1]
        ]

    async def _attach_report_custom_columns(
        self,
        report: Report,
        rows: List[Dict[str, Any]],
    ) -> tuple[List[Dict[str, Any]], List[Dict[str, str]]]:
        additional_field_ids = self._additional_report_field_ids(report.columns)
        if not additional_field_ids:
            return rows, []

        registry_entity_type = self._registry_entity_type(report)
        if not registry_entity_type:
            return rows, []

        from app.services.field_registry_service import bulk_read_custom_field_values, list_additional_fields

        tenant_obj_id = PydanticObjectId(str(report.tenant_id))
        entity_ids = [PydanticObjectId(str(row["id"])) for row in rows if row.get("id")]
        custom_values = (
            await bulk_read_custom_field_values(registry_entity_type, entity_ids, tenant_obj_id)
            if entity_ids
            else {}
        )
        field_defs = await list_additional_fields(registry_entity_type, tenant_obj_id)
        field_by_id = {str(field.id): field for field in field_defs}

        add_display_columns = []
        for field_id in additional_field_ids:
            field = field_by_id.get(field_id)
            add_display_columns.append({
                "name": f"additional:{field_id}",
                "alias_name": getattr(field, "label", None) or getattr(field, "name", None) or "Custom Field",
            })

        for row in rows:
            values_for_row = custom_values.get(str(row.get("id")), {})
            for field_id in additional_field_ids:
                value = (values_for_row.get(field_id) or {}).get("value")
                row[f"additional:{field_id}"] = self._serialize_custom_field_value(value)

        return rows, add_display_columns

    def _registry_entity_type(self, report: Report) -> Optional[str]:
        if report.entity_type == "accounts":
            return "personal_account" if report.filters.get("is_person_account") else "account"
        mapping = {
            "contacts": "contact",
            "leads": "lead",
            "opportunities": "opportunity",
            "suppliers": "supplier",
            "tasks": "task",
        }
        return mapping.get(report.entity_type)

    def _serialize_custom_field_value(self, value: Any) -> Any:
        if not isinstance(value, str):
            return self._serialize_report_value(value)
        try:
            decoded = json.loads(value)
        except Exception:
            return value
        return self._serialize_report_value(decoded)

    def _serialize_report_details(self, report: Report) -> Dict[str, Any]:
        return {
            "id": str(report.id),
            "name": report.name,
            "description": report.description,
            "report_type": report.report_type,
            "folder_id": report.chart_config.get("folder_id") if report.chart_config else None,
        }

    def _reportable_type_payload(self, report: Report) -> Dict[str, str]:
        return {
            "id": report.entity_type,
            "name": "personal_accounts" if report.filters.get("is_person_account") else report.entity_type,
        }

    def _get_nested_value(self, item: Any, path: str) -> Any:
        value: Any = item
        for part in path.split("."):
            if isinstance(value, dict):
                value = value.get(part)
            else:
                value = getattr(value, part, None)
            if value is None:
                return None
        return value

    def _serialize_report_value(self, value: Any) -> Any:
        if isinstance(value, (ObjectId, PydanticObjectId)):
            return str(value)
        if isinstance(value, (datetime, date)):
            return value.isoformat()
        if isinstance(value, list):
            return [self._serialize_report_value(v) for v in value]
        if isinstance(value, dict):
            return {k: self._serialize_report_value(v) for k, v in value.items()}
        return value

    def _report_column_value_path(self, entity_type: str, column: str) -> str:
        return REPORT_COLUMN_VALUE_PATHS.get(entity_type, {}).get(column, column)

    def _report_column_label(self, entity_type: str, column: str) -> str:
        if entity_type == "opportunities" and column == "name":
            return "Opportunity Name"
        if entity_type == "opportunities" and column == "created_at":
            return "Create Date"
        if entity_type == "suppliers" and column == "name":
            return "Supplier Name"
        return REPORT_COLUMN_LABELS.get(column, column.split(".")[-1].replace("_", " ").title())

    def _date_range_filter(self, spec: Dict[str, Any]) -> Optional[Dict[str, datetime]]:
        now = datetime.utcnow()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        range_name = spec.get("range")

        if range_name in {"today", "current_today", "closed_current_today", "ps_current_today"}:
            return {"$gte": today, "$lt": today + timedelta(days=1)}
        if range_name in {"yesterday", "current_yesterday", "closed_current_yesterday", "ps_current_yesterday"}:
            start = today - timedelta(days=1)
            return {"$gte": start, "$lt": today}
        if range_name in {"tomorrow", "ps_next_tomorrow"}:
            start = today + timedelta(days=1)
            return {"$gte": start, "$lt": start + timedelta(days=1)}
        if range_name in {"this_week", "current_week", "closed_current_week", "ps_current_week"}:
            start = today - timedelta(days=today.weekday())
            return {"$gte": start, "$lt": start + timedelta(days=7)}
        if range_name in {"last_week", "closed_last_week", "ps_last_week"}:
            end = today - timedelta(days=today.weekday())
            return {"$gte": end - timedelta(days=7), "$lt": end}
        if range_name in {"next_week", "ps_next_week"}:
            start = today - timedelta(days=today.weekday()) + timedelta(days=7)
            return {"$gte": start, "$lt": start + timedelta(days=7)}
        if range_name in {"this_month", "current_month", "closed_current_month", "ps_current_month"}:
            start = today.replace(day=1)
            next_month = start.replace(year=start.year + 1, month=1) if start.month == 12 else start.replace(month=start.month + 1)
            return {"$gte": start, "$lt": next_month}
        if range_name in {"last_month", "closed_last_month", "ps_last_month"}:
            this_month = today.replace(day=1)
            last_month_end = this_month
            last_month_start = this_month.replace(year=this_month.year - 1, month=12) if this_month.month == 1 else this_month.replace(month=this_month.month - 1)
            return {"$gte": last_month_start, "$lt": last_month_end}
        if range_name in {"next_month", "ps_next_month"}:
            this_month = today.replace(day=1)
            start = this_month.replace(year=this_month.year + 1, month=1) if this_month.month == 12 else this_month.replace(month=this_month.month + 1)
            end = start.replace(year=start.year + 1, month=1) if start.month == 12 else start.replace(month=start.month + 1)
            return {"$gte": start, "$lt": end}
        if range_name in {"current_quarter", "closed_current_quarter", "ps_current_quarter"}:
            quarter_month = ((today.month - 1) // 3) * 3 + 1
            start = today.replace(month=quarter_month, day=1)
            end = start.replace(year=start.year + 1, month=1) if quarter_month == 10 else start.replace(month=quarter_month + 3)
            return {"$gte": start, "$lt": end}
        if range_name in {"last_quarter", "closed_last_quarter", "ps_last_quarter"}:
            quarter_month = ((today.month - 1) // 3) * 3 + 1
            current_start = today.replace(month=quarter_month, day=1)
            start = current_start.replace(year=current_start.year - 1, month=10) if quarter_month == 1 else current_start.replace(month=quarter_month - 3)
            return {"$gte": start, "$lt": current_start}
        if range_name in {"next_quarter", "ps_next_quarter"}:
            quarter_month = ((today.month - 1) // 3) * 3 + 1
            current_start = today.replace(month=quarter_month, day=1)
            start = current_start.replace(year=current_start.year + 1, month=1) if quarter_month == 10 else current_start.replace(month=quarter_month + 3)
            end = start.replace(year=start.year + 1, month=1) if start.month == 10 else start.replace(month=start.month + 3)
            return {"$gte": start, "$lt": end}
        if range_name in {"current_year", "closed_current_year", "ps_current_year"}:
            start = today.replace(month=1, day=1)
            return {"$gte": start, "$lt": start.replace(year=start.year + 1)}
        if range_name in {"last_year", "closed_last_year", "ps_last_year"}:
            start = today.replace(year=today.year - 1, month=1, day=1)
            return {"$gte": start, "$lt": start.replace(year=start.year + 1)}
        if range_name in {"next_year", "ps_next_year"}:
            start = today.replace(year=today.year + 1, month=1, day=1)
            return {"$gte": start, "$lt": start.replace(year=start.year + 1)}
        if range_name == "older_than_30_days":
            return {"$lt": now - timedelta(days=30)}

        return None
    
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
            {"report_id": report_id, "tenant_id": tenant_id}
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
            {"_id": PydanticObjectId(schedule_id), "tenant_id": tenant_id}
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
        
        # Won opportunities this month — scoped to THIS tenant
        from app.models.opportunity_picklists import SalesStage
        tenant_obj_id = PydanticObjectId(tenant_id)
        won_stages = await SalesStage.find(
            {"tenant_id": tenant_obj_id, "is_won": True}
        ).to_list()
        won_stage_ids = [s.id for s in won_stages]
        won_query = {
            **base_query,
            "sales_stage_id": {"$in": won_stage_ids},
            "close_date": {"$gte": month_start}
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
