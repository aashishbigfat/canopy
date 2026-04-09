export interface PermissionDef {
    id: string;
    name: string;
    display_name: string;
    description?: string | null;
    is_system?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface PermissionInput {
    name: string;
    display_name: string;
    description?: string | null;
}

export interface PermissionUpdateInput {
    name?: string;
    display_name?: string;
    description?: string | null;
}

