"""
Task API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from bson import ObjectId

from app.models.user import User
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, TaskListResponse
from app.services.task_service import TaskService
from app.api.deps import get_current_user, check_permission

router = APIRouter()

@router.post("/", response_model=TaskResponse, status_code=201)
async def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(check_permission("create_task"))
):
    """Create a new task"""
    service = TaskService()
    task = await service.create_task(
        task_data,
        current_user.id,
        current_user.tenant_id
    )
    
    return TaskResponse.from_orm(task)


@router.get("/", response_model=dict)
async def get_tasks(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    assigned_user_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(check_permission("view_task"))
):
    """Get all tasks with pagination"""
    service = TaskService()
    
    skip = (page - 1) * per_page
    assigned_id = ObjectId(assigned_user_id) if assigned_user_id else None
    
    tasks, total = await service.get_tasks_by_tenant(
        current_user.tenant_id,
        skip=skip,
        limit=per_page,
        assigned_user_id=assigned_id,
        status=status
    )
    
    pages = (total + per_page - 1) // per_page
    
    # Get users for assignment
    users = await User.find(
        User.tenant_id == current_user.tenant_id,
        User.is_active == True
    ).sort("+name").to_list()
    
    return {
        "tasks": [TaskResponse.from_orm(t) for t in tasks],
        "pagination": {
            "current_page": page,
            "total": total,
            "per_page": per_page,
            "pages": pages
        },
        "users": [
            {"id": str(u.id), "name": u.name, "email": u.email}
            for u in users
        ]
    }


@router.get("/overdue")
async def get_overdue_tasks(
    current_user: User = Depends(check_permission("view_task"))
):
    """Get overdue tasks"""
    service = TaskService()
    tasks = await service.get_overdue_tasks(
        current_user.tenant_id,
        user_id=current_user.id
    )
    
    return {
        "tasks": [TaskResponse.from_orm(t) for t in tasks],
        "total": len(tasks)
    }


@router.get("/entity/{taskable_type}/{taskable_id}")
async def get_tasks_by_entity(
    taskable_type: str,
    taskable_id: str,
    current_user: User = Depends(check_permission("view_task"))
):
    """Get all tasks for a specific entity"""
    service = TaskService()
    tasks = await service.get_tasks_by_entity(
        taskable_type,
        taskable_id,
        current_user.tenant_id
    )
    
    return {
        "tasks": [TaskResponse.from_orm(t) for t in tasks],
        "total": len(tasks)
    }


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    current_user: User = Depends(check_permission("view_task"))
):
    """Get task by ID"""
    service = TaskService()
    task = await service.get_task(task_id, current_user.tenant_id)
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await task.increment_view_count()
    
    return TaskResponse.from_orm(task)


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    task_data: TaskUpdate,
    current_user: User = Depends(check_permission("edit_task"))
):
    """Update a task"""
    service = TaskService()
    task = await service.update_task(
        task_id,
        task_data,
        current_user.id,
        current_user.tenant_id
    )
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return TaskResponse.from_orm(task)


@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    current_user: User = Depends(check_permission("delete_task"))
):
    """Delete a task (soft delete)"""
    service = TaskService()
    success = await service.delete_task(task_id, current_user.tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {
        "error": False,
        "message": "Task deleted successfully"
    }


@router.post("/{task_id}/complete")
async def mark_task_completed(
    task_id: str,
    current_user: User = Depends(check_permission("edit_task"))
):
    """Mark task as completed"""
    service = TaskService()
    task = await service.mark_completed(
        task_id,
        current_user.id,
        current_user.tenant_id
    )
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {
        "error": False,
        "message": "Task marked as completed",
        "task": TaskResponse.from_orm(task)
    }
