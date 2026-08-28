import { apiClient } from "@/lib/api/client";

const BASE_URL = "/notifications";

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: string;
    entity_type?: string;
    entity_id?: string;
    is_read: boolean;
    read_at?: string;
    action_url?: string;
    data?: Record<string, unknown>;
    created_at: string;
}

export interface NotificationListResponse {
    notifications: Notification[];
    total: number;
    unread_count: number;
}

export interface NotificationCountResponse {
    total: number;
    unread: number;
}

export const notificationsService = {
    getNotifications: async (params?: { unread_only?: boolean; skip?: number; limit?: number }): Promise<NotificationListResponse> => {
        const response = await apiClient.get<NotificationListResponse>(BASE_URL, { params });
        return response.data;
    },

    getCount: async (): Promise<NotificationCountResponse> => {
        const response = await apiClient.get<NotificationCountResponse>(`${BASE_URL}/count`);
        return response.data;
    },

    markAsRead: async (id: string): Promise<Notification> => {
        const response = await apiClient.put<Notification>(`${BASE_URL}/${id}/read`);
        return response.data;
    },

    markAllAsRead: async (): Promise<void> => {
        await apiClient.put(`${BASE_URL}/read-all`);
    },

    clearAll: async (): Promise<void> => {
        await apiClient.delete(`${BASE_URL}/clear-all`);
    },

    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`${BASE_URL}/${id}`);
    },
};
