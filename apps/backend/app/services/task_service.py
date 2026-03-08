"""
Task service layer - Business logic for task management
"""
from typing import List, Optional, Tuple
from bson import ObjectId
from datetime import datetime, date
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate

class TaskService:
    """Service for Task business logic"""
    
    async def create_task(
        self,
        task_data: TaskCreate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Task:
        """Create a new task"""
        
        # Convert task data to dict
        task_dict = task_data.model_dump(exclude_unset=True)
        
        # Handle date to datetime conversion for due_date
        if 'due_date' in task_dict and task_dict['due_date']:
            if isinstance(task_dict['due_date'], date):
                # Convert date to datetime at start of day
                from datetime import time
                task_dict['due_date'] = datetime.combine(task_dict['due_date'], time.min)
        
        # Convert string IDs to ObjectId
        if 'assigned_user_id' in task_dict and task_dict['assigned_user_id']:
            task_dict['assigned_user_id'] = ObjectId(task_dict['assigned_user_id'])
        
        if 'taskable_id' in task_dict and task_dict['taskable_id']:
            task_dict['taskable_id'] = ObjectId(task_dict['taskable_id'])
        
        if 'contact_id' in task_dict and task_dict['contact_id']:
            task_dict['contact_id'] = ObjectId(task_dict['contact_id'])
        
        if 'account_id' in task_dict and task_dict['account_id']:
            task_dict['account_id'] = ObjectId(task_dict['account_id'])
        
        task = Task(
            **task_dict,
            tenant_id=tenant_id,
            owner_id=user_id,
            created_by=user_id
        )
        
        await task.insert()
        return task
    
    async def get_task(self, task_id: str, tenant_id: ObjectId) -> Optional[Task]:
        """Get task by ID"""
        task = await Task.get(ObjectId(task_id))
        
        if task and task.tenant_id == tenant_id and not task.deleted_at:
            return task
        return None
    
    async def update_task(
        self,
        task_id: str,
        task_data: TaskUpdate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Optional[Task]:
        """Update a task"""
        task = await self.get_task(task_id, tenant_id)
        
        if not task:
            return None
        
        # Update fields
        update_data = task_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(task, field, value)
        
        task.last_modified_by_id = user_id
        await task.save()
        
        return task
    
    async def delete_task(self, task_id: str, tenant_id: ObjectId) -> bool:
        """Soft delete a task"""
        task = await self.get_task(task_id, tenant_id)
        
        if not task:
            return False
        
        await task.soft_delete()
        return True
    
    async def get_tasks_by_tenant(
        self,
        tenant_id: ObjectId,
        skip: int = 0,
        limit: int = 10,
        assigned_user_id: Optional[ObjectId] = None,
        status: Optional[str] = None
    ) -> Tuple[List[Task], int]:
        """Get tasks for a tenant with pagination"""
        
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None
        }
        
        if assigned_user_id:
            query["assigned_user_id"] = assigned_user_id
        
        if status:
            query["status"] = status
        
        # Get total count
        total = await Task.find(query).count()
        
        # Get paginated results
        tasks = await Task.find(query)\
            .sort("-created_at")\
            .skip(skip)\
            .limit(limit)\
            .to_list()
        
        return tasks, total
    
    async def get_tasks_by_entity(
        self,
        taskable_type: str,
        taskable_id: str,
        tenant_id: ObjectId
    ) -> List[Task]:
        """Get all tasks for a specific entity"""
        tasks = await Task.find(
            Task.taskable_type == taskable_type,
            Task.taskable_id == ObjectId(taskable_id),
            Task.tenant_id == tenant_id,
            Task.deleted_at == None
        ).sort("-created_at").to_list()
        
        return tasks
    
    async def get_overdue_tasks(
        self,
        tenant_id: ObjectId,
        user_id: Optional[ObjectId] = None
    ) -> List[Task]:
        """Get overdue tasks"""
        # Convert today's date to datetime at end of day for proper comparison
        from datetime import time
        today_end = datetime.combine(date.today(), time.max)
        
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None,
            "status": {"$ne": "Completed"},
            "due_date": {"$lt": today_end}
        }
        
        if user_id:
            query["assigned_user_id"] = user_id
        
        tasks = await Task.find(query).sort("+due_date").to_list()
        return tasks
    
    async def mark_completed(
        self,
        task_id: str,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Optional[Task]:
        """Mark task as completed"""
        task = await self.get_task(task_id, tenant_id)
        
        if not task:
            return None
        
        await task.mark_completed(user_id)
        return task
