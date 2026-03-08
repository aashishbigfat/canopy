"""
Enhanced Activity Log Service with comprehensive logging capabilities
"""
from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime, timedelta
from pymongo import ASCENDING, DESCENDING

from app.models.activity_log import ActivityLog
from app.schemas.activity_log import ActivityLogResponse, ActivityLogListResponse


class EnhancedActivityLogService:
    """Enhanced service for comprehensive activity logging and reporting"""
    
    async def log_activity(
        self,
        user_id: ObjectId,
        user_name: str,
        tenant_id: ObjectId,
        action: str,
        entity_type: str,
        entity_id: str,
        entity_name: str,
        description: Optional[str] = None,
        changes: Optional[Dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> ActivityLog:
        """
        Create a comprehensive activity log entry
        
        Args:
            user_id: ID of the user performing the action
            user_name: Name of the user
            tenant_id: Tenant ID
            action: Action performed (created, updated, deleted, etc.)
            entity_type: Type of entity (lead, opportunity, etc.)
            entity_id: ID of the entity
            entity_name: Name of the entity
            description: Human-readable description
            changes: Dictionary of changes made
            ip_address: User's IP address
            user_agent: User's browser/user agent
            request_id: Unique request identifier
            metadata: Additional metadata
        """
        activity_log = ActivityLog(
            user_id=user_id,
            user_name=user_name,
            tenant_id=tenant_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            description=description or f"{action.title()} {entity_type}: {entity_name}",
            changes=changes or {},
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id,
            metadata=metadata or {},
            created_at=datetime.utcnow()
        )
        
        await activity_log.insert()
        return activity_log
    
    async def get_activity_logs(
        self,
        tenant_id: ObjectId,
        user_id: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        action: Optional[str] = None,
        days: int = 30,
        skip: int = 0,
        limit: int = 100,
        sort_by: str = "created_at",
        sort_order: int = -1
    ) -> List[ActivityLog]:
        """Get activity logs with comprehensive filtering"""
        
        # Build query
        query = {
            "tenant_id": tenant_id,
            "created_at": {"$gte": datetime.utcnow() - timedelta(days=days)}
        }
        
        if user_id:
            query["user_id"] = ObjectId(user_id)
        
        if entity_type:
            query["entity_type"] = entity_type
        
        if entity_id:
            query["entity_id"] = entity_id
        
        if action:
            query["action"] = action
        
        # Determine sort order
        sort_direction = DESCENDING if sort_order == -1 else ASCENDING
        
        # Execute query
        logs = await ActivityLog.find(query).sort(sort_by, sort_direction).skip(skip).limit(limit).to_list()
        
        return logs
    
    async def get_user_activity_summary(
        self,
        user_id: str,
        tenant_id: ObjectId,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get comprehensive activity summary for a user"""
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get all user activities
        activities = await ActivityLog.find({
            "user_id": ObjectId(user_id),
            "tenant_id": tenant_id,
            "created_at": {"$gte": start_date, "$lte": end_date}
        }).to_list()
        
        # Calculate summary statistics
        summary = {
            "total_activities": len(activities),
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "actions_by_type": {},
            "entities_by_type": {},
            "daily_activity": {},
            "most_active_day": None,
            "peak_hour": None
        }
        
        # Analyze activities
        hourly_counts = {}
        daily_counts = {}
        
        for activity in activities:
            # Count by action type
            action = activity.action
            summary["actions_by_type"][action] = summary["actions_by_type"].get(action, 0) + 1
            
            # Count by entity type
            entity = activity.entity_type
            summary["entities_by_type"][entity] = summary["entities_by_type"].get(entity, 0) + 1
            
            # Count by day
            day = activity.created_at.strftime("%Y-%m-%d")
            summary["daily_activity"][day] = summary["daily_activity"].get(day, 0) + 1
            
            # Count by hour
            hour = activity.created_at.hour
            hourly_counts[hour] = hourly_counts.get(hour, 0) + 1
        
        # Find most active day and peak hour
        if summary["daily_activity"]:
            summary["most_active_day"] = max(summary["daily_activity"], key=summary["daily_activity"].get)
        
        if hourly_counts:
            summary["peak_hour"] = max(hourly_counts, key=hourly_counts.get)
        
        return summary
    
    async def get_entity_history(
        self,
        entity_type: str,
        entity_id: str,
        tenant_id: ObjectId,
        limit: int = 50
    ) -> List[ActivityLog]:
        """Get complete history for a specific entity"""
        
        logs = await ActivityLog.find({
            "entity_type": entity_type,
            "entity_id": entity_id,
            "tenant_id": tenant_id
        }).sort("created_at", DESCENDING).limit(limit).to_list()
        
        return logs
    
    async def get_tenant_activity_report(
        self,
        tenant_id: ObjectId,
        days: int = 30
    ) -> Dict[str, Any]:
        """Generate comprehensive tenant activity report"""
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get all tenant activities
        activities = await ActivityLog.find({
            "tenant_id": tenant_id,
            "created_at": {"$gte": start_date, "$lte": end_date}
        }).to_list()
        
        report = {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": days
            },
            "total_activities": len(activities),
            "unique_users": len(set(str(a.user_id) for a in activities)),
            "top_users": {},
            "top_entities": {},
            "action_distribution": {},
            "daily_trends": {},
            "growth_metrics": self._calculate_growth_metrics(activities, start_date, end_date)
        }
        
        # Analyze user activity
        user_counts = {}
        for activity in activities:
            user = str(activity.user_id)
            user_counts[user] = user_counts.get(user, 0) + 1
        
        # Get top 10 users
        report["top_users"] = dict(sorted(user_counts.items(), key=lambda x: x[1], reverse=True)[:10])
        
        # Analyze entity activity
        entity_counts = {}
        for activity in activities:
            entity = f"{activity.entity_type}:{activity.entity_id}"
            entity_counts[entity] = entity_counts.get(entity, 0) + 1
        
        report["top_entities"] = dict(sorted(entity_counts.items(), key=lambda x: x[1], reverse=True)[:10])
        
        # Analyze action distribution
        for activity in activities:
            action = activity.action
            report["action_distribution"][action] = report["action_distribution"].get(action, 0) + 1
        
        # Daily trends
        for activity in activities:
            day = activity.created_at.strftime("%Y-%m-%d")
            report["daily_trends"][day] = report["daily_trends"].get(day, 0) + 1
        
        return report
    
    def _calculate_growth_metrics(
        self,
        activities: List[ActivityLog],
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Calculate growth metrics from activity data"""
        
        if not activities:
            return {"growth_rate": 0, "trend": "stable"}
        
        # Split activities into two halves
        mid_date = start_date + (end_date - start_date) / 2
        
        first_half = [a for a in activities if a.created_at < mid_date]
        second_half = [a for a in activities if a.created_at >= mid_date]
        
        first_count = len(first_half)
        second_count = len(second_half)
        
        if first_count == 0:
            growth_rate = 100 if second_count > 0 else 0
        else:
            growth_rate = ((second_count - first_count) / first_count) * 100
        
        # Determine trend
        if growth_rate > 10:
            trend = "increasing"
        elif growth_rate < -10:
            trend = "decreasing"
        else:
            trend = "stable"
        
        return {
            "growth_rate": round(growth_rate, 2),
            "trend": trend,
            "first_half_count": first_count,
            "second_half_count": second_count
        }
    
    async def cleanup_old_logs(
        self,
        tenant_id: ObjectId,
        days_to_keep: int = 365
    ) -> int:
        """Clean up old activity logs beyond retention period"""
        
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
        
        # Find and delete old logs
        old_logs = await ActivityLog.find({
            "tenant_id": tenant_id,
            "created_at": {"$lt": cutoff_date}
        }).to_list()
        
        count = len(old_logs)
        
        # Delete old logs
        for log in old_logs:
            await log.delete()
        
        return count
    
    async def search_activities(
        self,
        tenant_id: ObjectId,
        query: str,
        limit: int = 50
    ) -> List[ActivityLog]:
        """Search activity logs by text content"""
        
        search_query = {
            "tenant_id": tenant_id,
            "$or": [
                {"description": {"$regex": query, "$options": "i"}},
                {"entity_name": {"$regex": query, "$options": "i"}},
                {"user_name": {"$regex": query, "$options": "i"}},
                {"action": {"$regex": query, "$options": "i"}},
                {"entity_type": {"$regex": query, "$options": "i"}}
            ]
        }
        
        logs = await ActivityLog.find(search_query).sort("created_at", DESCENDING).limit(limit).to_list()
        
        return logs
