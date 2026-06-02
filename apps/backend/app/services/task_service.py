"""
Task service layer - Business logic for task management
"""
from typing import List, Optional, Tuple
from bson import ObjectId
from datetime import datetime, date
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate
from app.mixins.activity_mixin import ActivityMixin

class TaskService(ActivityMixin):
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
        
        # Log task creation
        await self.log_entity_created(
            entity=task,
            entity_type="Task",
            additional_data={
                "task_name": task.name,
                "assigned_to": str(task.assigned_user_id) if task.assigned_user_id else None,
                "related_to": str(task.taskable_id) if task.taskable_id else None
            }
        )
        
        # Also log against the parent entity so it shows in the entity's timeline.
        # Use the task name as the display name (entity_name) so the timeline reads
        # "<user> task created <task name>" instead of the raw parent record id.
        if task.taskable_type and task.taskable_id:
            from types import SimpleNamespace
            parent_entity = SimpleNamespace(id=task.taskable_id, name=task.name)
            await self.log_custom_activity(
                action="task_created",
                entity_type=task.taskable_type.lower(),
                entity=parent_entity,
                description=f"Task created: {task.name}",
                changes={"task_id": str(task.id), "task_name": task.name}
            )
        
        return task
    
    async def get_task(self, task_id: str, tenant_id: ObjectId) -> Optional[Task]:
        """Get task by ID, scoped to tenant."""
        try:
            oid = ObjectId(task_id)
        except Exception:
            return None
        return await Task.find_one(
            {"_id": oid, "tenant_id": tenant_id, "deleted_at": None}
        )
    
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
        
        # Save old state for logging
        old_values = task.model_dump()
        
        # Update fields
        update_data = task_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(task, field, value)
        
        task.last_modified_by_id = user_id
        await task.save()
        
        # Log task update
        await self.log_entity_updated(
            entity=task,
            entity_type="Task",
            old_values=old_values,
            updated_fields=update_data
        )
        
        return task
    
    async def delete_task(self, task_id: str, tenant_id: ObjectId) -> bool:
        """Soft delete a task"""
        task = await self.get_task(task_id, tenant_id)
        
        if not task:
            return False
        
        await task.soft_delete()
        
        # Log task deletion
        await self.log_entity_deleted(
            entity=task,
            entity_type="Task"
        )
        
        # Log against parent
        if task.taskable_type and task.taskable_id:
            from types import SimpleNamespace
            parent_entity = SimpleNamespace(id=task.taskable_id)
            await self.log_custom_activity(
                action="task_deleted",
                entity_type=task.taskable_type.lower(),
                entity=parent_entity,
                description=f"Task deleted: {task.name}",
                changes={"task_id": str(task.id), "task_name": task.name}
            )
        
        return True
    
    async def get_tasks_by_tenant(
        self,
        tenant_id: ObjectId,
        skip: int = 0,
        limit: int = 10,
        assigned_user_id: Optional[ObjectId] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        visible_owner_ids: Optional[list] = None
    ) -> Tuple[List[Task], int]:
        """Get tasks for a tenant with pagination"""
        
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None
        }
        
        # Handle explicit assignment filter + visibility scoping securely
        if assigned_user_id:
            if visible_owner_ids is not None and assigned_user_id not in visible_owner_ids:
                # User requesting records they aren't allowed to see
                return [], 0
            query["assigned_user_id"] = assigned_user_id
        elif visible_owner_ids is not None:
            # Restrict visibility based on hierarchy: user can see tasks they created OR tasks assigned to them
            query["$or"] = [
                {"assigned_user_id": {"$in": visible_owner_ids}},
                {"owner_id": {"$in": visible_owner_ids}}
            ]
        
        if status:
            query["status"] = status

        if priority:
            query["priority"] = priority
        
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
            {"taskable_type": taskable_type, "taskable_id": ObjectId(taskable_id), "tenant_id": tenant_id, "deleted_at": None}
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
