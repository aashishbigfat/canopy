import { ApiResponse } from "@/lib/api/types";

export interface PermissionListResponse {
    permissions: string[];
    total: number;
}

export interface RoleInput {
    name: string;
    description?: string;
    permissions: string[];
}

export interface Role {
    _id?: string;
    id?: string;
    name: string;
    description?: string;
    permissions: string[];
    tenant_id: string;
    is_system?: boolean;
    users_count?: number; // Optional, might need to fetch separately
}

export interface RoleResponse extends ApiResponse<Role> { }
export interface RolesResponse extends ApiResponse<Role[]> { }
