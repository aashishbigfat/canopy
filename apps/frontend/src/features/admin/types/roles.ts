import { ApiResponse } from "@/lib/api/types";

export interface PermissionListResponse {
    permissions: string[];
    total: number;
}

export interface RoleInput {
    name: string;
    display_name: string;
    description?: string;
    permissions: string[];
}

export interface Role {
    id: string;
    _id?: string; // legacy fallback — backend always returns `id`
    name: string;
    display_name?: string;
    description?: string;
    permissions: string[];
    tenant_id: string;
    is_system?: boolean;
    is_admin?: boolean;
    users_count?: number;
    created_at?: string;
    updated_at?: string;
}

/** Helper to consistently extract the canonical ID from a Role object. */
export function getRoleId(role: Role): string {
    return role.id || role._id || "";
}

export interface RoleResponse extends ApiResponse<Role> { }
export interface RolesResponse extends ApiResponse<Role[]> { }
