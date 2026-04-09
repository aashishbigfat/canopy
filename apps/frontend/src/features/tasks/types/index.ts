import { PaginatedResponse } from "@/lib/api/types";

// --- Tasks ---

export interface Task {
    id: string;
    name: string;
    description?: string;
    due_date?: string;

    status: 'Not Started' | 'In Progress' | 'Completed' | 'Deferred' | 'open' | 'completed';
    priority: 'Low' | 'Normal' | 'High' | 'Urgent';

    // Polymorphic Relations
    taskable_type?: string; // "Account" | "Opportunity" | "Contact"
    taskable_id?: string;
    taskable_name?: string; // Resolved entity name (enriched by backend)

    contact_id?: string;
    account_id?: string;
    assigned_user_id?: string;

    // Enriched (from backend join)
    assigned_user_name?: string;
    created_by_name?: string;
    last_modified_by_name?: string;

    // Metadata
    completed_at?: string;
    completed_by?: string;
    owner_id?: string;
    tenant_id: string;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface TaskCreateData {
    name: string;
    assigned_user_id?: string;
    due_date?: string;
    description?: string;
    status?: string;
    priority?: string;
    contact_id?: string;
    account_id?: string;
    taskable_type?: string;
    taskable_id?: string;
}

export interface TaskFilters {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    priority?: string;
    assigned_user_id?: string;
}

export type TaskResponse = Task;
export interface TasksResponse {
    tasks: Task[];
    pagination?: {
        current_page: number;
        total: number;
        per_page: number;
        pages: number;
    };
    // Legacy fields kept for backward compat
    total?: number;
    page?: number;
    per_page?: number;
    pages?: number;
    users?: { id: string; name: string; email: string }[];
}


// --- Events ---

export interface Event {
    id: string;
    name: string;
    description?: string;
    location?: string;

    start_datetime: string;
    end_datetime: string;
    all_day: boolean;
    event_type: string;
    status: string;

    // Relations
    eventable_type?: string;
    eventable_id?: string;
    contact_id?: string;
    account_id?: string;
    assigned_user_ids: string[];

    reminder_minutes?: number;
    reminder_sent: boolean;

    owner_id: string;
    tenant_id: string;
    created_at: string;
    updated_at: string;
}

export interface EventCreateData {
    name: string;
    start_datetime: string;
    end_datetime: string;
    // ... others
}

export interface EventFilters {
    page?: number;
    per_page?: number;
    search?: string;
    start_date?: string;
    end_date?: string;
}

export type EventResponse = PaginatedResponse<Event>;
