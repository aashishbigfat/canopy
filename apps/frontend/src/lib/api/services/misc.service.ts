/**
 * Phase 17 — Misc / utility / public.
 */
import { apiClient } from "@/lib/api/client";

const BASE = "/misc";

export const miscService = {
  checkTenantActivity: async (params: { tenant_id?: string; domain?: string }) =>
    (await apiClient.get(`${BASE}/check-tenant-activity`, { params })).data,
  getS3Url: async (payload: { filename: string; content_type?: string; folder?: string }) =>
    (await apiClient.post(`${BASE}/s3-url`, payload)).data,
  getLatLong: async (payload: any) =>
    (await apiClient.post(`${BASE}/lat-long`, payload)).data,
  searchCountry: async (q: string) =>
    (await apiClient.get(`${BASE}/search-country`, { params: { q } })).data,
  verifyEmail: async (token: string) =>
    (await apiClient.get(`${BASE}/verify-email/${token}`)).data,
  resendVerification: async (email: string) =>
    (await apiClient.post(`${BASE}/verify-email/resend`, { email })).data,
  accessLogin: async (targetUserId: string) =>
    (await apiClient.post(`${BASE}/access-login`, { target_user_id: targetUserId })).data,
  pullFbLeads: async () => (await apiClient.get(`${BASE}/facebook/leads/pull`)).data,
  saveFbLeads: async (leads: any[]) =>
    (await apiClient.post(`${BASE}/facebook/leads/save`, { leads })).data,
  fbHealth: async () => (await apiClient.get(`${BASE}/facebook/health`)).data,
  storeFbToken: async (payload: { long_lived_token: string; page_id?: string }) =>
    (await apiClient.post(`${BASE}/facebook/token`, payload)).data,
};
