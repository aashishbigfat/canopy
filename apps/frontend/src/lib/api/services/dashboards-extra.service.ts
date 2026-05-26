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

export interface LeaderboardAccolade {
  name: string;
  emoji: string;
}

export interface LeaderboardRow {
  rank: number;
  user_id: string;
  name: string;
  avatar_url: string | null;
  score: number;
  ccr: number;
  close_won: number;
  no_of_pax: number;
  revenue: number;
  accolades: LeaderboardAccolade[];
}

export interface LeaderboardResponse {
  period: string;
  period_label: string;
  rows: LeaderboardRow[];
}

export interface UserIncentiveRecord {
  month_label: string;
  year: number;
  month: number;
  opportunities_won: number;
  total_opportunities: number;
  target: number;
  sales_amount: number;
  earn_rupees: number;
  mature_rupees: number;
}

export interface UserIncentiveEntry {
  user_id: string;
  name: string;
  avatar_url: string | null;
  records: UserIncentiveRecord[];
}

export interface UserIncentiveGroup {
  role_name: string;
  users: UserIncentiveEntry[];
}

export interface UserIncentiveResponse {
  groups: UserIncentiveGroup[];
}

export interface DeptIncentiveRecord {
  month_label: string;
  year: number;
  month: number;
  opportunities_won: number;
  total_opportunities: number;
  sales_amount: number;
  earn_rupees: number;
  mature_rupees: number;
}

export interface DeptIncentiveGroup {
  department_name: string;
  records: DeptIncentiveRecord[];
}

export interface DeptIncentiveResponse {
  groups: DeptIncentiveGroup[];
}

export const dashboardsExtraService = {
  summary: async () => (await apiClient.get(`${BASE}/summary`)).data,
  userActivities: async () => (await apiClient.get(`${BASE}/user-activities`)).data,
  leaderboard: async (period = "current_month"): Promise<LeaderboardResponse> =>
    (await apiClient.get(`${BASE}/leaderboard`, { params: { period } })).data,
  myLeaderboard: async (period = "current_month") =>
    (await apiClient.get(`${BASE}/leaderboard/me`, { params: { period } })).data,
  userIncentiveRecords: async (months = 12): Promise<UserIncentiveResponse> =>
    (await apiClient.get(`${BASE}/user-incentive-records`, { params: { months } })).data,
  departmentIncentiveRecords: async (months = 12): Promise<DeptIncentiveResponse> =>
    (await apiClient.get(`${BASE}/department-incentive-records`, { params: { months } })).data,

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
