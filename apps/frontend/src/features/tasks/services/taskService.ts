import { apiClient } from "@/lib/api/client";

export interface Task {
    id: string;
    title: string;
    description?: string;
    status: string; // pending, in_progress, completed
    priority: string; // low, medium, high
    due_date?: string;
    assigned_to?: string;
    created_by: string;
    entity_type?: string; // account, contact, lead, opportunity
    entity_id?: string;
    tenant_id: string;
    created_at: string;
    updated_at: string;
}

export interface TaskCreateData {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    due_date?: string;
    assigned_to?: string;
    entity_type?: string;
    entity_id?: string;
}

export interface TaskFilters {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    priority?: string;
    assigned_to?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}

const BASE_URL = "/tasks";

export const taskService = {
    getTasks: async (params?: TaskFilters, config?: any) => {
        const { data } = await apiClient.get<any>(BASE_URL, { params, ...config });
        return data;
    },

    getTask: async (id: string, config?: any) => {
        const { data } = await apiClient.get<Task>(`${BASE_URL}/${id}`, config);
        return data;
    },

    createTask: async (taskData: TaskCreateData) => {
        const { data } = await apiClient.post<Task>(BASE_URL, taskData);
        return data;
    },

    updateTask: async (id: string, taskData: Partial<TaskCreateData>) => {
        const { data } = await apiClient.put<Task>(`${BASE_URL}/${id}`, taskData);
        return data;
    },

    deleteTask: async (id: string) => {
        await apiClient.delete(`${BASE_URL}/${id}`);
    },

    getMyTasks: async () => {
        const { data } = await apiClient.get<Task[]>(`${BASE_URL}/my-tasks`);
        return data;
    },

    getFollowUpTasks: async (taskId: string) => {
        const { data } = await apiClient.get<Task[]>(`${BASE_URL}/${taskId}/follow-up`);
        return data;
    },

    createFollowUpTask: async (taskId: string, taskData: TaskCreateData) => {
        const { data } = await apiClient.post<Task>(`${BASE_URL}/${taskId}/follow-up`, taskData);
        return data;
    },
};
