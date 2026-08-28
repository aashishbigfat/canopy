export interface User {
    id: string;
    _id: string; // ObjectId mapped to string
    name: string;
    email: string;
    role_ids: string[];
    tenant_id: string;

    // Profile
    phone?: string;
    title?: string;
    avatar_url?: string;
    department_id?: string;
    role_hierarchy_id?: string;
    role_hierarchy_name?: string;
    directory?: string;

    // Status
    is_active: boolean;
    is_verified: boolean;
    email_verified_at?: string; // ISO Date string

    // Settings
    timezone: string;
    language: string;

    // Auto-assignment
    max_leads_per_day: number;
    max_opportunities: number;
    is_available_for_assignment: boolean;
    assigned_countries?: string[];
    not_assigned_countries?: string[];

    // Targets
    monthly_revenue_target: number;
    monthly_deals_target: number;

    last_login_at?: string;
    created_at?: string;
    updated_at?: string;
}

export interface UserInput {
    name: string;
    email: string;
    password?: string; // Optional for updates
    role_ids: string[];
    phone?: string;
    department_id?: string;
    role_hierarchy_id?: string;
    is_active?: boolean;
    max_leads_per_day?: number;
    max_opportunities?: number;
    is_available_for_assignment?: boolean;
    assigned_countries?: string[];
    not_assigned_countries?: string[];
    monthly_revenue_target?: number;
    monthly_deals_target?: number;
}

export interface UserResponse {
    data?: User[];
    users?: User[];
    total: number;
    page?: number;
    limit?: number;
}
