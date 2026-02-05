import { PaginatedResponse } from "@/lib/api/types";

// --- Tasks ---

export interface Task {
    id: string;
    name: string;
    description?: string;
    due_date?: string;

    status: 'Not Started' | 'In Progress' | 'Completed' | 'Deferred';
    priority: 'Low' | 'Normal' | 'High';

    // Polymorphic Relations
    taskable_type?: string;
    taskable_id?: string;

    contact_id?: string;
    account_id?: string;
    assigned_user_id: string;

    // Metadata
    completed_at?: string;
    completed_by?: string;
    owner_id: string;
    tenant_id: string;
    created_at: string;
    updated_at: string;
}

export interface TaskCreateData {
    name: string;
    assigned_user_id: string;
    due_date?: string;
    description?: string;
    status?: 'Not Started' | 'In Progress' | 'Completed' | 'Deferred';
    priority?: 'Low' | 'Normal' | 'High';
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
export type TasksResponse = PaginatedResponse<Task>;


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
    start_date?: string; // For calendar view range
    end_date?: string;
}

export type EventResponse = PaginatedResponse<Event>;
