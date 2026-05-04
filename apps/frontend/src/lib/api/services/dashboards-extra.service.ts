/**
 * Phase 11 — Dashboard extras (BD aggregates + quick links + graphs).
 */
import { apiClient } from "@/lib/api/client";

const BASE = "/dashboards";

export interface QuickLink {
  id: string;
  user_id: string;
  label: string;
  url: string;
  icon?: string | null;
  sort_order: number;
}

export const dashboardsExtraService = {
  summary: async () => (await apiClient.get(`${BASE}/summary`)).data,
  userActivities: async () => (await apiClient.get(`${BASE}/user-activities`)).data,
  leaderboard: async () => (await apiClient.get(`${BASE}/leaderboard`)).data,
  myLeaderboard: async () => (await apiClient.get(`${BASE}/leaderboard/me`)).data,

  oppDashboardAll: async () => (await apiClient.get(`${BASE}/opportunity/all`)).data,
  oppDashboardMine: async () => (await apiClient.get(`${BASE}/opportunity/mine`)).data,

  bdSummary: async () => (await apiClient.get(`${BASE}/bd/summary`)).data,
  bdToday: async () => (await apiClient.get(`${BASE}/bd/today-opportunities`)).data,
  bdTodayRevenue: async () => (await apiClient.get(`${BASE}/bd/today-revenue`)).data,
  bdTomorrowDepartures: async () => (await apiClient.get(`${BASE}/bd/tomorrow-departures`)).data,
  bdGraphPerformance: async () => (await apiClient.get(`${BASE}/bd/graph-performance`)).data,
  bdStagePercentage: async () => (await apiClient.get(`${BASE}/bd/stage-percentage`)).data,

  oppGraphPerformance: async () => (await apiClient.get(`${BASE}/opportunity/graph-performance`)).data,
  stagePercentage: async () => (await apiClient.get(`${BASE}/opportunity/stage-percentage`)).data,
  teamPerformance: async () => (await apiClient.get(`${BASE}/team-performance`)).data,

  setMonthlyPerformance: async (payload: any) =>
    (await apiClient.post(`${BASE}/monthly-performance`, payload)).data,

  // QUICK LINKS
  listQuickLinks: async (): Promise<QuickLink[]> =>
    (await apiClient.get(`${BASE}/quick-links`)).data,
  saveQuickLink: async (payload: { label: string; url: string; icon?: string; sort_order?: number }) =>
    (await apiClient.post(`${BASE}/quick-links`, payload)).data,
  deleteQuickLink: async (id: string) => apiClient.delete(`${BASE}/quick-links/${id}`),
};
