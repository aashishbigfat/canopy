export interface Department {
    id: string;
    _id?: string;
    name: string;
    tenant_id: string;
    created_by?: string | null;
    created_by_name?: string | null;
    created_at: string;
    updated_at: string;
    is_active: boolean;
    description?: string | null;
    parent_id?: string | null;
    manager_id?: string | null;
    level?: number;
    notes?: string | null;
}

export interface DepartmentListResponse {
    departments: Department[];
    total: number;
}

export interface DepartmentInput {
    name: string;
}
