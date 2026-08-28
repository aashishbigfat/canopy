import { apiClient } from "@/lib/api/client";
import type {
  BDVisit,
  BDVisitCreateData,
  BDVisitUpdateData,
  BDVisitListResponse,
  BDVisitFilters,
  BDVisitableType,
} from "@/features/bd/visits/types";

const BASE = "/bd-visits";

export const bdVisitsService = {
  list: async (filters: BDVisitFilters = {}): Promise<BDVisitListResponse> => {
    const { data } = await apiClient.get(BASE, { params: filters });
    return data;
  },

  myToday: async (): Promise<BDVisitListResponse> => {
    const { data } = await apiClient.get(`${BASE}/today`);
    return data;
  },

  dashboardKpis: async (): Promise<{
    today: { total: number; completed: number };
    pending_expenses: { count: number; amount: number };
    approvals_owed: { visits: number; expenses: number; total: number };
    week_chart: { date: string; count: number }[];
  }> => (await apiClient.get(`${BASE}/dashboard-kpis`)).data,

  pendingApprovals: async (): Promise<BDVisitListResponse> => {
    const { data } = await apiClient.get(`${BASE}/pending-approvals`);
    return data;
  },

  byParent: async (type: BDVisitableType, id: string): Promise<BDVisitListResponse> => {
    const { data } = await apiClient.get(`${BASE}/by-entity/${type}/${id}`);
    return data;
  },

  get: async (id: string): Promise<BDVisit> => {
    const { data } = await apiClient.get(`${BASE}/${id}`);
    return data;
  },

  create: async (payload: BDVisitCreateData): Promise<BDVisit> => {
    const { data } = await apiClient.post(BASE, payload);
    return data;
  },

  update: async (id: string, payload: BDVisitUpdateData): Promise<BDVisit> => {
    const { data } = await apiClient.put(`${BASE}/${id}`, payload);
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`);
  },

  approve: async (id: string, notes?: string): Promise<BDVisit> => {
    const { data } = await apiClient.post(`${BASE}/${id}/approve`, { notes });
    return data;
  },

  reject: async (id: string, reason: string): Promise<BDVisit> => {
    const { data } = await apiClient.post(`${BASE}/${id}/reject`, { reason });
    return data;
  },

  checkIn: async (
    id: string,
    payload: { lat?: number; lng?: number; accuracy_m?: number }
  ): Promise<BDVisit> => {
    const { data } = await apiClient.post(`${BASE}/${id}/check-in`, payload);
    return data;
  },

  checkOut: async (
    id: string,
    payload: {
      outcome?: string;
      outcome_notes?: string;
      next_action?: string;
      next_action_at?: string;
      lat?: number;
      lng?: number;
    }
  ): Promise<BDVisit> => {
    const { data } = await apiClient.post(`${BASE}/${id}/check-out`, payload);
    return data;
  },
};
