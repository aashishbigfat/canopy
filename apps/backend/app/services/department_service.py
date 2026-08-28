"""
Department service layer - Business logic for department management
"""
from typing import List, Optional, Dict
from bson import ObjectId
from app.models.department import Department
from app.models.user import User
from app.schemas.department import DepartmentCreate, DepartmentUpdate


class DepartmentService:
    """Service for Department business logic"""
    
    async def create_department(
        self,
        department_data: DepartmentCreate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Department:
        """Create a new department"""
        
        # Check if department name already exists
        existing = await Department.find_one(
            {"name": department_data.name, "tenant_id": tenant_id, "deleted_at": None}
        )

        if existing:
            raise ValueError(f"Department '{department_data.name}' already exists")
        
        # Create department
        department = Department(
            **department_data.model_dump(exclude_unset=True, exclude={'parent_id', 'manager_id'}),
            tenant_id=tenant_id,
            created_by=user_id
        )
        
        # Convert parent_id and manager_id
        if department_data.parent_id:
            department.parent_id = ObjectId(department_data.parent_id)
        if department_data.manager_id:
            department.manager_id = ObjectId(department_data.manager_id)
        
        await department.insert()
        return department
    
    async def get_department(
        self,
        department_id: str,
        tenant_id: ObjectId
    ) -> Optional[Department]:
        """Get department by ID, scoped to tenant."""
        try:
            oid = ObjectId(department_id)
        except Exception:
            return None
        return await Department.find_one(
            {"_id": oid, "tenant_id": tenant_id, "deleted_at": None}
        )
    
    async def get_department_with_details(
        self,
        department_id: str,
        tenant_id: ObjectId
    ) -> Optional[Dict]:
        """Get department with user count and manager details"""
        department = await self.get_department(department_id, tenant_id)
        
        if not department:
            return None
        
        # Count users
        user_count = await User.find(
            {"department_id": ObjectId(department_id), "tenant_id": tenant_id, "deleted_at": None}
        ).count()

        # Count child departments
        child_count = await Department.find(
            {"parent_id": ObjectId(department_id), "tenant_id": tenant_id, "deleted_at": None}
        ).count()
        
        # Get manager name — scoped to the department's tenant
        manager_name = None
        if department.manager_id:
            manager = await User.find_one(
                {"_id": department.manager_id, "tenant_id": tenant_id, "deleted_at": None}
            )
            if manager:
                manager_name = manager.name
        
        return {
            "department": department,
            "user_count": user_count,
            "child_count": child_count,
            "manager_name": manager_name
        }
    
    async def update_department(
        self,
        department_id: str,
        department_data: DepartmentUpdate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Optional[Department]:
        """Update a department"""
        department = await self.get_department(department_id, tenant_id)
        
        if not department:
            return None
        
        # Check name uniqueness if being updated
        if department_data.name and department_data.name != department.name:
            existing = await Department.find_one(
                {"name": department_data.name, "tenant_id": tenant_id, "deleted_at": None}
            )
            if existing:
                raise ValueError(f"Department '{department_data.name}' already exists")
        
        # Update fields
        update_data = department_data.model_dump(exclude_unset=True, exclude={'parent_id', 'manager_id'})
        for field, value in update_data.items():
            setattr(department, field, value)
        
        # Handle parent_id and manager_id
        if department_data.parent_id is not None:
            department.parent_id = ObjectId(department_data.parent_id) if department_data.parent_id else None
        if department_data.manager_id is not None:
            department.manager_id = ObjectId(department_data.manager_id) if department_data.manager_id else None
        
        department.last_modified_by_id = user_id
        await department.save()
        
        return department
    
    async def delete_department(
        self,
        department_id: str,
        tenant_id: ObjectId
    ) -> bool:
        """Soft delete a department"""
        department = await self.get_department(department_id, tenant_id)
        
        if not department:
            return False
        
        # Check if department has users
        user_count = await User.find(
            {"department_id": ObjectId(department_id), "tenant_id": tenant_id, "deleted_at": None}
        ).count()

        if user_count > 0:
            raise ValueError(f"Cannot delete department: {user_count} users are assigned to it")

        # Check if department has child departments
        child_count = await Department.find(
            {"parent_id": ObjectId(department_id), "tenant_id": tenant_id, "deleted_at": None}
        ).count()
        
        if child_count > 0:
            raise ValueError(f"Cannot delete department: it has {child_count} child departments")
        
        await department.soft_delete()
        return True
    
    async def get_departments_by_tenant(
        self,
        tenant_id: ObjectId,
        parent_id: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Department]:
        """Get departments for a tenant with filters"""
        
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None
        }
        
        if parent_id is not None:
            if parent_id == "":  # Root departments
                query["parent_id"] = None
            else:
                query["parent_id"] = ObjectId(parent_id)
        
        if is_active is not None:
            query["is_active"] = is_active
        
        departments = await Department.find(query).skip(skip).limit(limit).sort("+name").to_list()
        return departments
    
    async def search_departments(
        self,
        query: str,
        tenant_id: ObjectId,
        skip: int = 0,
        limit: int = 50
    ) -> List[Department]:
        """Search departments"""
        
        search_query = {
            "tenant_id": tenant_id,
            "deleted_at": None,
            "$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}}
            ]
        }
        
        departments = await Department.find(search_query).skip(skip).limit(limit).sort("+name").to_list()
        return departments
    
    async def get_department_hierarchy(
        self,
        department_id: str,
        tenant_id: ObjectId
    ) -> Dict:
        """Get department with its full hierarchy (parent and children)"""
        department = await self.get_department(department_id, tenant_id)
        
        if not department:
            return None
        
        # Get parent — scoped to the department's tenant
        parent = None
        if department.parent_id:
            parent = await Department.find_one(
                {"_id": department.parent_id, "tenant_id": tenant_id, "deleted_at": None}
            )
        
        # Get children
        children = await department.get_children()
        
        return {
            "department": department,
            "parent": parent,
            "children": children
        }
    
    async def get_department_users(
        self,
        department_id: str,
        tenant_id: ObjectId
    ) -> List[User]:
        """Get all users in a department"""
        users = await User.find(
            {"department_id": ObjectId(department_id), "tenant_id": tenant_id, "deleted_at": None, "is_active": True}
        ).sort("+name").to_list()
        
        return users
