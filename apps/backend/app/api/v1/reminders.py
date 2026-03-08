"""
Reminder API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional

from app.models.user import User
from app.schemas.reminder import (
    ReminderCreate, ReminderUpdate, ReminderResponse, ReminderListResponse
)
from app.services.reminder_service import ReminderService
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/", response_model=ReminderResponse, status_code=201)
async def create_reminder(data: ReminderCreate, current_user: User = Depends(get_current_user)):
    """Create a reminder"""
    service = ReminderService()
    reminder = await service.create_reminder(data, current_user.id, current_user.tenant_id)
    return ReminderResponse.from_orm(reminder)


@router.get("/", response_model=ReminderListResponse)
async def get_reminders(
    completed: Optional[bool] = None, skip: int = 0, limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    """Get user's reminders"""
    service = ReminderService()
    reminders = await service.get_user_reminders(current_user.id, completed=completed, skip=skip, limit=limit)
    return ReminderListResponse(reminders=[ReminderResponse.from_orm(r) for r in reminders], total=len(reminders))


@router.get("/upcoming")
async def get_upcoming_reminders(days: int = 7, current_user: User = Depends(get_current_user)):
    """Get upcoming reminders"""
    service = ReminderService()
    reminders = await service.get_upcoming_reminders(current_user.id, days=days)
    return {"reminders": [ReminderResponse.from_orm(r) for r in reminders], "total": len(reminders)}


@router.get("/due")
async def get_due_reminders(current_user: User = Depends(get_current_user)):
    """Get due reminders"""
    service = ReminderService()
    reminders = await service.get_due_reminders(current_user.id)
    return {"reminders": [ReminderResponse.from_orm(r) for r in reminders], "total": len(reminders)}


@router.get("/{reminder_id}", response_model=ReminderResponse)
async def get_reminder(reminder_id: str, current_user: User = Depends(get_current_user)):
    """Get reminder by ID"""
    service = ReminderService()
    reminder = await service.get_reminder(reminder_id, current_user.id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return ReminderResponse.from_orm(reminder)


@router.put("/{reminder_id}", response_model=ReminderResponse)
async def update_reminder(reminder_id: str, data: ReminderUpdate, current_user: User = Depends(get_current_user)):
    """Update a reminder"""
    service = ReminderService()
    reminder = await service.update_reminder(reminder_id, data, current_user.id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return ReminderResponse.from_orm(reminder)


@router.put("/{reminder_id}/complete", response_model=ReminderResponse)
async def complete_reminder(reminder_id: str, current_user: User = Depends(get_current_user)):
    """Mark reminder as complete"""
    service = ReminderService()
    reminder = await service.complete_reminder(reminder_id, current_user.id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return ReminderResponse.from_orm(reminder)


@router.delete("/{reminder_id}")
async def delete_reminder(reminder_id: str, current_user: User = Depends(get_current_user)):
    """Delete a reminder"""
    service = ReminderService()
    success = await service.delete_reminder(reminder_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"error": False, "message": "Reminder deleted"}
