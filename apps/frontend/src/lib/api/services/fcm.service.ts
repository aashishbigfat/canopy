/**
 * Phase 14 — FCM tokens + reminder cron.
 */
import { apiClient } from "@/lib/api/client";

const BASE = "/fcm";

export interface FCMToken {
  id: string;
  token: string;
  device_id?: string | null;
  platform?: string | null;
  app_version?: string | null;
  is_active: boolean;
  last_used_at?: string | null;
}

export const fcmService = {
  registerToken: async (payload: { token: string; device_id?: string; platform?: string; app_version?: string }): Promise<FCMToken> =>
    (await apiClient.post(`${BASE}/tokens`, payload)).data,
  listMyTokens: async (): Promise<FCMToken[]> =>
    (await apiClient.get(`${BASE}/tokens`)).data,
  deactivateToken: async (id: string) =>
    apiClient.delete(`${BASE}/tokens/${id}`),
  viewNotification: async () =>
    (await apiClient.get(`${BASE}/view-notification`)).data,
  checkNotification: async () =>
    (await apiClient.get(`${BASE}/check-notification`)).data,
  allNotifications: async (limit = 50) =>
    (await apiClient.get(`${BASE}/all-notifications`, { params: { limit } })).data,
};
