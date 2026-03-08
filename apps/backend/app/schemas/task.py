"""
Pydantic schemas for Task API
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, Union
from datetime import datetime, date

class TaskBase(BaseModel):
    """Base schema for Task"""
    name: str
    description: Optional[str] = None
    due_date: Optional[Union[datetime, date]] = None
    
    status: str = "Not Started"
    priority: str = "Normal"
    
    taskable_type: Optional[str] = None
    taskable_id: Optional[str] = None
    
    contact_id: Optional[str] = None
    account_id: Optional[str] = None
    
    assigned_user_id: Optional[str] = None
    
    @validator('due_date', pre=True)
    def parse_due_date(cls, v):
        if isinstance(v, date) and not isinstance(v, datetime):
            # Convert date to datetime at start of day
            from datetime import time
            return datetime.combine(v, time.min)
        return v


class TaskCreate(TaskBase):
    """Schema for creating a task"""
    pass


class TaskUpdate(BaseModel):
    """Schema for updating a task"""
    name: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[Union[datetime, date]] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_user_id: Optional[str] = None
    
    @validator('due_date', pre=True)
    def parse_due_date(cls, v):
        if isinstance(v, date) and not isinstance(v, datetime):
            # Convert date to datetime at start of day
            from datetime import time
            return datetime.combine(v, time.min)
        return v


class TaskResponse(TaskBase):
    """Schema for task response"""
    id: str
    tenant_id: str
    owner_id: Optional[str] = None
    created_by: str
    
    completed_at: Optional[datetime] = None
    completed_by: Optional[str] = None
    view_count: int = 0
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, obj):
        """Convert ObjectId fields to strings for API response"""
        if hasattr(obj, 'id'):
            data = obj.model_dump()
            # Convert ObjectId fields to strings
            data['id'] = str(obj.id)
            if hasattr(obj, 'tenant_id') and obj.tenant_id:
                data['tenant_id'] = str(obj.tenant_id)
            if hasattr(obj, 'owner_id') and obj.owner_id:
                data['owner_id'] = str(obj.owner_id)
            if hasattr(obj, 'created_by') and obj.created_by:
                data['created_by'] = str(obj.created_by)
            if hasattr(obj, 'assigned_user_id') and obj.assigned_user_id:
                data['assigned_user_id'] = str(obj.assigned_user_id)
            if hasattr(obj, 'taskable_id') and obj.taskable_id:
                data['taskable_id'] = str(obj.taskable_id)
            if hasattr(obj, 'contact_id') and obj.contact_id:
                data['contact_id'] = str(obj.contact_id)
            if hasattr(obj, 'account_id') and obj.account_id:
                data['account_id'] = str(obj.account_id)
            if hasattr(obj, 'completed_by') and obj.completed_by:
                data['completed_by'] = str(obj.completed_by)
            
            return cls(**data)
        return cls()


class TaskListResponse(BaseModel):
    """Schema for list of tasks"""
    tasks: list[TaskResponse]
    total: int
    page: int = 1
    per_page: int = 10
    pages: int
