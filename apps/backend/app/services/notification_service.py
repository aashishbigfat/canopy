"""
Notification service layer
"""
from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timezone
from app.models.notification import Notification
from app.schemas.notification import NotificationCreate


class NotificationService:
    """Service for Notification business logic"""
    
    async def create_notification(self, data: NotificationCreate, tenant_id: ObjectId) -> Notification:
        notification = Notification(
            user_id=ObjectId(data.user_id),
            title=data.title,
            message=data.message,
            type=data.type,
            action_url=data.action_url,
            data=data.data,
            tenant_id=tenant_id
        )
        if data.entity_type:
            notification.entity_type = data.entity_type
        if data.entity_id:
            notification.entity_id = ObjectId(data.entity_id)
        
        await notification.insert()
        return notification
    
    async def notify_user(
        self, user_id: ObjectId, tenant_id: ObjectId,
        title: str, message: str, type: str = "info",
        entity_type: Optional[str] = None, entity_id: Optional[ObjectId] = None,
        action_url: Optional[str] = None,
        push: bool = True,
    ) -> Notification:
        """Create an in-app notification and (when push=True) fan out to FCM tokens.

        Push failures are swallowed — the in-app row is the source of truth.
        """
        notification = Notification(
            user_id=user_id,
            tenant_id=tenant_id,
            title=title,
            message=message,
            type=type,
            entity_type=entity_type,
            entity_id=entity_id,
            action_url=action_url
        )
        await notification.insert()
        if push:
            try:
                from app.services import push_service
                await push_service.send_to_user(
                    user_id=user_id,
                    tenant_id=tenant_id,
                    title=title,
                    body=message,
                    data={
                        "entity_type": entity_type or "",
                        "entity_id": str(entity_id or ""),
                        "action_url": action_url or "",
                        "type": type,
                    },
                )
            except Exception:
                pass
        return notification
    
    async def get_user_notifications(
        self, user_id: ObjectId, tenant_id: ObjectId,
        unread_only: bool = False, skip: int = 0, limit: int = 50
    ) -> List[Notification]:
        query = {"user_id": user_id, "tenant_id": tenant_id, "deleted_at": None}
        if unread_only:
            query["is_read"] = False
        return await Notification.find(query).skip(skip).limit(limit).sort("-created_at").to_list()
    
    async def get_unread_count(self, user_id: ObjectId, tenant_id: ObjectId) -> int:
        return await Notification.find(
            {"user_id": user_id, "tenant_id": tenant_id, "is_read": False, "deleted_at": None}
        ).count()
    
    async def mark_as_read(self, notification_id: str, user_id: ObjectId) -> Optional[Notification]:
        try:
            oid = ObjectId(notification_id)
        except Exception:
            return None
        notification = await Notification.find_one(
            {"_id": oid, "user_id": user_id}
        )
        if notification and not notification.is_read:
            notification.is_read = True
            notification.read_at = datetime.now(timezone.utc)
            await notification.save()
        return notification
    
    async def mark_all_as_read(self, user_id: ObjectId, tenant_id: ObjectId) -> int:
        notifications = await Notification.find(
            {"user_id": user_id, "tenant_id": tenant_id, "is_read": False}
        ).to_list()
        
        count = 0
        for n in notifications:
            n.is_read = True
            n.read_at = datetime.now(timezone.utc)
            await n.save()
            count += 1
        return count
    
    async def delete_notification(self, notification_id: str, user_id: ObjectId) -> bool:
        try:
            oid = ObjectId(notification_id)
        except Exception:
            return False
        notification = await Notification.find_one(
            {"_id": oid, "user_id": user_id}
        )
        if notification:
            await notification.soft_delete()
            return True
        return False
    
    async def clear_all_notifications(self, user_id: ObjectId, tenant_id: ObjectId) -> int:
        notifications = await Notification.find(
            {"user_id": user_id, "tenant_id": tenant_id, "deleted_at": None}
        ).to_list()
        
        count = 0
        for n in notifications:
            await n.soft_delete()
            count += 1
        return count
