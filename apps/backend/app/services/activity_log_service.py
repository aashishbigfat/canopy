"""
Activity Log service layer
"""
import re
from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime, timedelta
from app.models.activity_log import ActivityLog, LoginLog


class ActivityLogService:
    """Service for Activity Log business logic"""
    
    async def log_activity(
        self,
        user_id: ObjectId,
        user_name: str,
        tenant_id: ObjectId,
        action: str,
        entity_type: str,
        description: str,
        entity_id: Optional[ObjectId] = None,
        entity_name: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> ActivityLog:
        """Log an activity"""
        log = ActivityLog(
            user_id=user_id,
            user_name=user_name,
            tenant_id=tenant_id,
            action=action,
            entity_type=entity_type,
            description=description,
            entity_id=entity_id,
            entity_name=entity_name,
            changes=changes,
            ip_address=ip_address,
            user_agent=user_agent
        )
        await log.insert()
        return log

    async def get_activity_logs(
        self,
        tenant_id: ObjectId,
        user_id: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        action: Optional[str] = None,
        days: int = 30,
        skip: int = 0,
        limit: int = 100
    ) -> List[ActivityLog]:
        """Get activity logs with filters"""
        query = {
            "tenant_id": tenant_id,
            "created_at": {"$gte": datetime.utcnow() - timedelta(days=days)}
        }
        if user_id:
            query["user_id"] = ObjectId(user_id)
        if entity_type:
            # Case-insensitive exact match so "Account"/"account" etc. all match,
            # regardless of how a given service stored the entity_type.
            query["entity_type"] = {"$regex": f"^{re.escape(entity_type)}$", "$options": "i"}
        if entity_id:
            query["entity_id"] = ObjectId(entity_id)
        if action:
            query["action"] = action
        
        return await ActivityLog.find(query).skip(skip).limit(limit).sort("-created_at").to_list()
    
    async def get_entity_history(self, entity_type: str, entity_id: str, tenant_id: ObjectId) -> List[ActivityLog]:
        """Get all activity for a specific entity"""
        return await ActivityLog.find(
            {
                "entity_type": {"$regex": f"^{re.escape(entity_type)}$", "$options": "i"},
                "entity_id": ObjectId(entity_id),
                "tenant_id": tenant_id,
            }
        ).sort("-created_at").to_list()
    
    async def get_user_activity(self, user_id: str, tenant_id: ObjectId, limit: int = 50) -> List[ActivityLog]:
        """Get recent activity for a user"""
        return await ActivityLog.find(
            {"user_id": ObjectId(user_id), "tenant_id": tenant_id}
        ).limit(limit).sort("-created_at").to_list()
    
    # Login Log methods
    async def log_login(
        self,
        user_id: ObjectId,
        user_name: str,
        user_email: str,
        tenant_id: ObjectId,
        success: bool = True,
        failure_reason: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> LoginLog:
        """Log a login attempt"""
        log = LoginLog(
            user_id=user_id,
            user_name=user_name,
            user_email=user_email,
            tenant_id=tenant_id,
            success=success,
            failure_reason=failure_reason,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id
        )
        await log.insert()
        return log
    
    async def log_logout(self, session_id: str) -> Optional[LoginLog]:
        """Update login log with logout time"""
        log = await LoginLog.find_one(LoginLog.session_id == session_id)
        if log:
            log.logout_at = datetime.utcnow()
            await log.save()
        return log
    
    async def get_login_logs(
        self,
        tenant_id: ObjectId,
        user_id: Optional[str] = None,
        success: Optional[bool] = None,
        days: int = 30,
        skip: int = 0,
        limit: int = 100
    ) -> List[LoginLog]:
        """Get login logs with filters"""
        query = {
            "tenant_id": tenant_id,
            "created_at": {"$gte": datetime.utcnow() - timedelta(days=days)}
        }
        if user_id:
            query["user_id"] = ObjectId(user_id)
        if success is not None:
            query["success"] = success
        
        return await LoginLog.find(query).skip(skip).limit(limit).sort("-created_at").to_list()
    
    async def get_user_login_history(self, user_id: str, tenant_id: ObjectId, limit: int = 20) -> List[LoginLog]:
        """Get login history for a user"""
        return await LoginLog.find(
            {"user_id": ObjectId(user_id), "tenant_id": tenant_id}
        ).limit(limit).sort("-created_at").to_list()
