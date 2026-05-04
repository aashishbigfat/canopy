"""
Reminder service layer
"""
from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timedelta
from app.models.reminder import Reminder
from app.schemas.reminder import ReminderCreate, ReminderUpdate


class ReminderService:
    """Service for Reminder business logic"""
    
    async def create_reminder(
        self, data: ReminderCreate, user_id: ObjectId, tenant_id: ObjectId
    ) -> Reminder:
        reminder = Reminder(
            user_id=user_id,
            title=data.title,
            description=data.description,
            remind_at=data.remind_at,
            is_recurring=data.is_recurring,
            recurrence_pattern=data.recurrence_pattern,
            tenant_id=tenant_id,
            created_by=user_id
        )
        if data.entity_type:
            reminder.entity_type = data.entity_type
        if data.entity_id:
            reminder.entity_id = ObjectId(data.entity_id)
        if data.entity_name:
            reminder.entity_name = data.entity_name
        
        await reminder.insert()
        return reminder
    
    async def get_reminder(self, reminder_id: str, user_id: ObjectId) -> Optional[Reminder]:
        reminder = await Reminder.get(ObjectId(reminder_id))
        return reminder if reminder and reminder.user_id == user_id and not reminder.deleted_at else None
    
    async def update_reminder(
        self, reminder_id: str, data: ReminderUpdate, user_id: ObjectId
    ) -> Optional[Reminder]:
        reminder = await self.get_reminder(reminder_id, user_id)
        if not reminder:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(reminder, field, value)
        await reminder.save()
        return reminder
    
    async def delete_reminder(self, reminder_id: str, user_id: ObjectId) -> bool:
        reminder = await self.get_reminder(reminder_id, user_id)
        if not reminder:
            return False
        await reminder.soft_delete()
        return True
    
    async def complete_reminder(self, reminder_id: str, user_id: ObjectId) -> Optional[Reminder]:
        reminder = await self.get_reminder(reminder_id, user_id)
        if not reminder:
            return None
        
        reminder.is_completed = True
        reminder.completed_at = datetime.utcnow()
        await reminder.save()
        return reminder
    
    async def get_user_reminders(
        self, user_id: ObjectId, completed: Optional[bool] = None,
        skip: int = 0, limit: int = 50
    ) -> List[Reminder]:
        query = {"user_id": user_id, "deleted_at": None}
        if completed is not None:
            query["is_completed"] = completed
        return await Reminder.find(query).skip(skip).limit(limit).sort("+remind_at").to_list()
    
    async def get_upcoming_reminders(
        self, user_id: ObjectId, days: int = 7
    ) -> List[Reminder]:
        now = datetime.utcnow()
        future = now + timedelta(days=days)
        return await Reminder.find(
            {"user_id": user_id, "remind_at": {"$gte": now, "$lte": future}, "is_completed": False, "deleted_at": None}
        ).sort("+remind_at").to_list()
    
    async def get_due_reminders(self, user_id: ObjectId) -> List[Reminder]:
        """Get reminders that are due now"""
        now = datetime.utcnow()
        return await Reminder.find(
            {"user_id": user_id, "remind_at": {"$lte": now}, "is_completed": False, "is_sent": False, "deleted_at": None}
        ).sort("+remind_at").to_list()
