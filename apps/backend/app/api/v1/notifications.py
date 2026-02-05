"""
Notification API endpoints
"""
from fastapi import APIRouter, Depends

from app.models.user import User
from app.schemas.notification import (
    NotificationResponse, NotificationListResponse, NotificationCountResponse
)
from app.services.notification_service import NotificationService
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=NotificationListResponse)
async def get_notifications(
    unread_only: bool = False,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    """Get current user's notifications"""
    service = NotificationService()
    notifications = await service.get_user_notifications(
        current_user.id, current_user.tenant_id,
        unread_only=unread_only, skip=skip, limit=limit
    )
    unread_count = await service.get_unread_count(current_user.id, current_user.tenant_id)
    
    return NotificationListResponse(
        notifications=[NotificationResponse(
            id=str(n.id),
            user_id=str(n.user_id),
            title=n.title,
            message=n.message,
            type=n.type,
            entity_type=n.entity_type,
            entity_id=str(n.entity_id) if n.entity_id else None,
            is_read=n.is_read,
            read_at=n.read_at,
            action_url=n.action_url,
            data=n.data,
            created_at=n.created_at
        ) for n in notifications],
        total=len(notifications),
        unread_count=unread_count
    )


@router.get("/count", response_model=NotificationCountResponse)
async def get_notification_count(current_user: User = Depends(get_current_user)):
    """Get notification counts"""
    service = NotificationService()
    unread = await service.get_unread_count(current_user.id, current_user.tenant_id)
    notifications = await service.get_user_notifications(current_user.id, current_user.tenant_id, limit=1000)
    return NotificationCountResponse(total=len(notifications), unread=unread)


@router.put("/{notification_id}/read", response_model=NotificationResponse)
async def mark_as_read(notification_id: str, current_user: User = Depends(get_current_user)):
    """Mark notification as read"""
    service = NotificationService()
    notification = await service.mark_as_read(notification_id, current_user.id)
    return NotificationResponse(
        id=str(notification.id),
        user_id=str(notification.user_id),
        title=notification.title,
        message=notification.message,
        type=notification.type,
        entity_type=notification.entity_type,
        entity_id=str(notification.entity_id) if notification.entity_id else None,
        is_read=notification.is_read,
        read_at=notification.read_at,
        action_url=notification.action_url,
        data=notification.data,
        created_at=notification.created_at
    )


@router.put("/read-all")
async def mark_all_as_read(current_user: User = Depends(get_current_user)):
    """Mark all notifications as read"""
    service = NotificationService()
    count = await service.mark_all_as_read(current_user.id, current_user.tenant_id)
    return {"error": False, "message": f"Marked {count} notifications as read"}


@router.delete("/clear-all")
async def clear_all_notifications(current_user: User = Depends(get_current_user)):
    """Clear all notifications"""
    service = NotificationService()
    count = await service.clear_all_notifications(current_user.id, current_user.tenant_id)
    return {"error": False, "message": f"Cleared {count} notifications"}


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, current_user: User = Depends(get_current_user)):
    """Delete a notification"""
    service = NotificationService()
    await service.delete_notification(notification_id, current_user.id)
    return {"error": False, "message": "Notification deleted"}
