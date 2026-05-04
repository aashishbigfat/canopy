/**
 * Phase 10 — User mgmt extras (profile, targets, directory, login logs, BD users, admin actions).
 */
import { apiClient } from "@/lib/api/client";

const BASE = "/users";

export interface ProfileSummary {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  mobile?: string | null;
  designation?: string | null;
  department_id?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  is_active: boolean;
}

export interface DirectoryEntry {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  designation?: string | null;
  avatar_url?: string | null;
}

export interface LoginLog {
  id: string;
  user_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  logged_in_at?: string | null;
  logged_out_at?: string | null;
}

export interface UserTargetRow {
  user_id: string;
  name: string;
  email: string;
  current_target: number;
  annual_target: number;
}

export const usersExtraService = {
  getProfile: async (): Promise<ProfileSummary> =>
    (await apiClient.get(`${BASE}/profile`)).data,
  updateProfile: async (payload: any): Promise<ProfileSummary> =>
    (await apiClient.put(`${BASE}/profile`, payload)).data,
  changePassword: async (payload: { current_password: string; new_password: string }) =>
    (await apiClient.put(`${BASE}/profile/password`, payload)).data,
  uploadAvatar: async (avatar_url: string) =>
    (await apiClient.post(`${BASE}/profile/avatar`, { avatar_url })).data,
  uploadBanner: async (banner_url: string) =>
    (await apiClient.post(`${BASE}/profile/banner`, { banner_url })).data,

  listTargets: async (): Promise<UserTargetRow[]> =>
    (await apiClient.get(`${BASE}/targets`)).data,
  setCurrentTarget: async (userId: string, target_amount: number, year: number, month: number) =>
    (await apiClient.post(`${BASE}/targets/current`, {
      user_id: userId,
      target_amount,
      year,
      month,
    })).data,
  teamTarget: async () => (await apiClient.post(`${BASE}/targets/team`)).data,

  directory: async (): Promise<DirectoryEntry[]> =>
    (await apiClient.get(`${BASE}/directory`)).data,
  setStatus: async (status: string) =>
    (await apiClient.post(`${BASE}/status`, { status })).data,
  loginLogs: async (userId?: string, limit = 100): Promise<LoginLog[]> =>
    (await apiClient.get(`${BASE}/login-logs`, { params: { user_id: userId, limit } })).data,

  bdUsers: async () => (await apiClient.get(`${BASE}/bd`)).data,
  bdUserDetail: async (userId: string) => (await apiClient.get(`${BASE}/bd/${userId}`)).data,

  deactivate: async (userId: string) =>
    (await apiClient.post(`${BASE}/${userId}/deactivate`)).data,
  reactivate: async (userId: string) =>
    (await apiClient.post(`${BASE}/${userId}/reactivate`)).data,
  sendPasswordReset: async (userId: string) =>
    (await apiClient.post(`${BASE}/${userId}/send-password-reset`)).data,

  getAll: async () => (await apiClient.get(`${BASE}/all`)).data,
  getAllActive: async () => (await apiClient.get(`${BASE}/all-active`)).data,
};
