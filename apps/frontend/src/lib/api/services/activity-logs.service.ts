import { apiClient } from "@/lib/api/client";

const BASE_URL = "/logs";

export interface ActivityLog {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    entity_name?: string;
    user_id: string;
    user_name: string;
    details?: string;
    metadata?: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
    created_at: string;
}

export interface ActivityLogListResponse {
    logs: ActivityLog[];
    total: number;
}

export const activityLogsService = {
    getLogs: async (params?: {
        entity_type?: string;
        entity_id?: string;
        user_id?: string;
        action?: string;
        skip?: number;
        limit?: number
    }): Promise<ActivityLogListResponse> => {
        const response = await apiClient.get<ActivityLogListResponse>(BASE_URL, { params });
        return response.data;
    },
};
