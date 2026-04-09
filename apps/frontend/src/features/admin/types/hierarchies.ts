export interface Hierarchy {
    id?: string;
    _id?: string;
    name: string;
    tenant_id?: string;
    created_by?: string;
    created_by_name?: string;
    parent_id?: string | null;
    level?: number;
    created_at?: string;
    updated_at?: string;
}

export interface HierarchyInput {
    name: string;
    parent_id?: string | null;
    level?: number;
}

export interface HierarchyResponse {
    data?: Hierarchy[];
    hierarchies?: Hierarchy[];
    total?: number;
    page?: number;
    limit?: number;
}
