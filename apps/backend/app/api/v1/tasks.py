"""
Task API endpoints - Production-grade CRM task management
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import List, Optional
from bson import ObjectId
from beanie.operators import In

from app.models.user import User
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, TaskListResponse
from app.services.task_service import TaskService
from app.api.deps import get_current_user, check_permission

router = APIRouter()


async def _enrich_task(task: Task, user_map: dict, entity_name_map: dict = {}) -> dict:
    """Convert task to dict with all resolved names for CRM table display."""
    task_resp = TaskResponse.from_orm(task)
    data = task_resp.model_dump()
    data["assigned_user_name"] = user_map.get(task.assigned_user_id, None)
    data["created_by_name"] = user_map.get(task.created_by, None)
    data["last_modified_by_name"] = user_map.get(task.last_modified_by_id, None) if task.last_modified_by_id else None
    # Taskable resolved name
    data["taskable_name"] = entity_name_map.get(str(task.taskable_id), None) if task.taskable_id else None
    return data


async def _build_enriched_tasks(tasks: List[Task]) -> List[dict]:
    """Batch-fetch all user names and entity names for a list of tasks."""
    if not tasks:
        return []

    # Collect all user IDs
    user_ids = set()
    for t in tasks:
        if t.assigned_user_id:
            user_ids.add(t.assigned_user_id)
        if t.created_by:
            user_ids.add(t.created_by)
        if t.last_modified_by_id:
            user_ids.add(t.last_modified_by_id)

    user_map = {}
    if user_ids:
        users = await User.find(In(User.id, list(user_ids))).to_list()
        user_map = {u.id: u.name for u in users}

    # Resolve entity names by taskable_type
    entity_name_map = {}
    from collections import defaultdict
    by_type = defaultdict(list)
    for t in tasks:
        if t.taskable_type and t.taskable_id:
            by_type[t.taskable_type].append(t.taskable_id)

    import asyncio

    async def resolve_entities(taskable_type: str, ids: list):
        if taskable_type == "Account":
            from app.models.account import Account
            docs = await Account.find({"_id": {"$in": ids}, "deleted_at": None}).to_list()
            return {str(d.id): d.name for d in docs}
        elif taskable_type == "Opportunity":
            from app.models.opportunity import Opportunity
            docs = await Opportunity.find({"_id": {"$in": ids}, "deleted_at": None}).to_list()
            return {str(d.id): d.name for d in docs}
        elif taskable_type == "Contact":
            from app.models.contact import Contact
            docs = await Contact.find({"_id": {"$in": ids}, "deleted_at": None}).to_list()
            return {str(d.id): f"{d.first_name} {d.last_name}".strip() for d in docs}
        return {}

    resolve_tasks = [resolve_entities(t, ids) for t, ids in by_type.items()]
    results = await asyncio.gather(*resolve_tasks)
    for r in results:
        entity_name_map.update(r)

    return [await _enrich_task(t, user_map, entity_name_map) for t in tasks]


@router.get("/search-opportunity")
async def search_opportunity_autocomplete(
    s: str = Query(..., description="Search term"),
    current_user: User = Depends(get_current_user)
):
    """Autocomplete search for opportunities (used in task Related To field)."""
    from app.services.visibility_scope import get_visible_owner_ids
    from app.models.opportunity import Opportunity
    query = {
        "tenant_id": current_user.tenant_id,
        "name": {"$regex": s, "$options": "i"},
        "deleted_at": None
    }
    
    visible_owner_ids = await get_visible_owner_ids(current_user)
    if visible_owner_ids is not None:
        query["owner_id"] = {"$in": visible_owner_ids}
        
    opps = await Opportunity.find(query).limit(15).to_list()

    return {
        "error": False,
        "opportunities": [
            {"id": str(o.id), "name": o.name}
            for o in opps
        ]
    }


@router.post("/", response_model=dict, status_code=201)
async def create_task(
    request: Request,
    task_data: TaskCreate,
    current_user: User = Depends(check_permission("create_task"))
):
    """Create a new task."""
    service = TaskService()
    service.set_request_context(request, current_user)
    task = await service.create_task(
        task_data,
        current_user.id,
        current_user.tenant_id
    )
    enriched = await _build_enriched_tasks([task])
    return enriched[0]


@router.get("/", response_model=dict)
async def get_tasks(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    assigned_user_id: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    current_user: User = Depends(check_permission("view_task"))
):
    """Get all tasks with pagination and enriched data."""
    service = TaskService()

    skip = (page - 1) * per_page
    assigned_id = ObjectId(assigned_user_id) if assigned_user_id else None

    from app.services.visibility_scope import get_visible_owner_ids
    visible_owner_ids = await get_visible_owner_ids(current_user)

    tasks, total = await service.get_tasks_by_tenant(
        current_user.tenant_id,
        skip=skip,
        limit=per_page,
        assigned_user_id=assigned_id,
        status=status,
        priority=priority,
        visible_owner_ids=visible_owner_ids
    )

    pages = (total + per_page - 1) // per_page

    # Get users for the assignment dropdown in the UI
    users = await User.find(
        User.tenant_id == current_user.tenant_id,
        User.is_active == True
    ).sort("+name").to_list()

    enriched = await _build_enriched_tasks(tasks)

    return {
        "tasks": enriched,
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
    """Get overdue tasks."""
    service = TaskService()
    tasks = await service.get_overdue_tasks(
        current_user.tenant_id,
        user_id=current_user.id
    )
    enriched = await _build_enriched_tasks(tasks)
    return {"tasks": enriched, "total": len(tasks)}


@router.get("/entity/{taskable_type}/{taskable_id}")
async def get_tasks_by_entity(
    taskable_type: str,
    taskable_id: str,
    current_user: User = Depends(check_permission("view_task"))
):
    """Get all tasks for a specific entity (Account, Opportunity, Contact)."""
    from app.services.visibility_scope import get_visible_owner_ids
    service = TaskService()
    
    # Optional further enhancement: Could verify that the user can actually see the related entity FIRST.
    # For now, we fetch the tasks and filter out any tasks the user shouldn't see.
    tasks = await service.get_tasks_by_entity(
        taskable_type,
        taskable_id,
        current_user.tenant_id
    )
    
    visible_owner_ids = await get_visible_owner_ids(current_user)
    from app.services.visibility_scope import is_task_visible
    
    filtered_tasks = []
    for t in tasks:
        if is_task_visible(t.created_by, t.assigned_user_id, visible_owner_ids):
            filtered_tasks.append(t)
            
    enriched = await _build_enriched_tasks(filtered_tasks)
    return {"tasks": enriched, "total": len(filtered_tasks)}


@router.get("/{task_id}", response_model=dict)
async def get_task(
    task_id: str,
    current_user: User = Depends(check_permission("view_task"))
):
    """Get task by ID with full enriched detail."""
    from app.services.visibility_scope import get_visible_owner_ids, is_task_visible
    service = TaskService()
    task = await service.get_task(task_id, current_user.tenant_id)

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    visible_owner_ids = await get_visible_owner_ids(current_user)
    if not is_task_visible(task.created_by, task.assigned_user_id, visible_owner_ids):
        raise HTTPException(status_code=404, detail="Task not found")

    await task.increment_view_count()
    enriched = await _build_enriched_tasks([task])
    return enriched[0]


@router.put("/{task_id}", response_model=dict)
async def update_task(
    request: Request,
    task_id: str,
    task_data: TaskUpdate,
    current_user: User = Depends(check_permission("edit_task"))
):
    """Update a task."""
    from app.services.visibility_scope import get_visible_owner_ids, is_task_visible
    service = TaskService()
    service.set_request_context(request, current_user)
    
    # Pre-check visibility
    existing = await service.get_task(task_id, current_user.tenant_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
        
    visible_owner_ids = await get_visible_owner_ids(current_user)
    if not is_task_visible(existing.created_by, existing.assigned_user_id, visible_owner_ids):
        raise HTTPException(status_code=404, detail="Task not found")
        
    task = await service.update_task(
        task_id,
        task_data,
        current_user.id,
        current_user.tenant_id
    )

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    enriched = await _build_enriched_tasks([task])
    return enriched[0]


@router.delete("/{task_id}")
async def delete_task(
    request: Request,
    task_id: str,
    current_user: User = Depends(check_permission("delete_task"))
):
    """Delete a task (soft delete)."""
    from app.services.visibility_scope import get_visible_owner_ids, is_task_visible
    service = TaskService()
    service.set_request_context(request, current_user)
    
    # Pre-check visibility
    existing = await service.get_task(task_id, current_user.tenant_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
        
    visible_owner_ids = await get_visible_owner_ids(current_user)
    if not is_task_visible(existing.created_by, existing.assigned_user_id, visible_owner_ids):
        raise HTTPException(status_code=404, detail="Task not found")
        
    success = await service.delete_task(task_id, current_user.tenant_id)

    if not success:
        raise HTTPException(status_code=404, detail="Task not found")

    return {"error": False, "message": "Task deleted successfully"}


@router.post("/{task_id}/complete")
async def mark_task_completed(
    request: Request,
    task_id: str,
    current_user: User = Depends(check_permission("edit_task"))
):
    """Mark task as completed."""
    from app.services.visibility_scope import get_visible_owner_ids, is_task_visible
    service = TaskService()
    service.set_request_context(request, current_user)
    
    # Pre-check visibility
    existing = await service.get_task(task_id, current_user.tenant_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
        
    visible_owner_ids = await get_visible_owner_ids(current_user)
    if not is_task_visible(existing.created_by, existing.assigned_user_id, visible_owner_ids):
        raise HTTPException(status_code=404, detail="Task not found")
        
    task = await service.mark_completed(
        task_id,
        current_user.id,
        current_user.tenant_id
    )

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    enriched = await _build_enriched_tasks([task])
    return {"error": False, "message": "Task marked as completed", "task": enriched[0]}


@router.post("/{task_id}/follow-up", response_model=dict, status_code=201)
async def create_follow_up_task(
    request: Request,
    task_id: str,
    task_data: TaskCreate,
    current_user: User = Depends(check_permission("create_task"))
):
    """Create a follow-up task inheriting the related entity from the parent task."""
    service = TaskService()
    service.set_request_context(request, current_user)

    # Fetch parent task to inherit polymorphic relation
    parent_task = await service.get_task(task_id, current_user.tenant_id)
    if not parent_task:
        raise HTTPException(status_code=404, detail="Parent task not found")

    # Override taskable fields from parent if not explicitly provided
    task_dict = task_data.model_dump(exclude_unset=True)
    if not task_dict.get("taskable_type") and parent_task.taskable_type:
        task_dict["taskable_type"] = parent_task.taskable_type
    if not task_dict.get("taskable_id") and parent_task.taskable_id:
        task_dict["taskable_id"] = str(parent_task.taskable_id)
    if not task_dict.get("account_id") and parent_task.account_id:
        task_dict["account_id"] = str(parent_task.account_id)
    if not task_dict.get("contact_id") and parent_task.contact_id:
        task_dict["contact_id"] = str(parent_task.contact_id)

    from app.schemas.task import TaskCreate as TC
    follow_up_data = TC(**task_dict)
    new_task = await service.create_task(follow_up_data, current_user.id, current_user.tenant_id)
    enriched = await _build_enriched_tasks([new_task])
    return enriched[0]
