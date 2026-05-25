"""
Automation rule — admin-configurable trigger → condition → action.

Trigger taxonomy is closed (an enum-like set of strings); actions and
condition operators are extensible registries inside automation_service.

Examples:
  {trigger: "lead.created",
   conditions: [{"path": "industry_data.requires_field_meeting", "op": "eq", "value": true}],
   action_type: "create_bd_visit",
   action_params: {"activity_type_name": "Site Survey", "days_offset": 2}}

  {trigger: "expense.submitted",
   conditions: [{"path": "amount", "op": "gt", "value": 5000}],
   action_type: "send_notification",
   action_params: {"to": "reporting_manager", "title": "High-value expense"}}
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from beanie import PydanticObjectId
from pydantic import Field

from app.models.base import BaseDocument


class AutomationRule(BaseDocument):
    name: str
    description: Optional[str] = None
    is_active: bool = True

    # When this rule should fire (whitelisted in automation_service.TRIGGERS).
    trigger_event: str

    # Each condition: {"path": "field.with.dots", "op": "eq|neq|in|contains|gt|lt|exists", "value": ...}
    conditions: List[Dict[str, Any]] = Field(default_factory=list)
    conditions_logic: str = "AND"  # AND | OR

    # Action selected from automation_service.ACTIONS registry
    action_type: str
    action_params: Dict[str, Any] = Field(default_factory=dict)

    # Industry scoping — None = applies to any tenant industry.
    industry: Optional[str] = None

    # Ordering — lower priority runs first.
    priority: int = 100

    tenant_id: PydanticObjectId
    created_by: PydanticObjectId
    last_modified_by_id: Optional[PydanticObjectId] = None

    # Runtime telemetry (best-effort)
    last_fired_at: Optional[datetime] = None
    fire_count: int = 0

    class Settings:
        name = "automation_rules"
        indexes = [
            [("tenant_id", 1), ("trigger_event", 1), ("is_active", 1)],
        ]
