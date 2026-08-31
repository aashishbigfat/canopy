/**
 * Phase 8 — Reports extras (standard reports, folders, preview, clone, sample download).
 */
import { apiClient } from "@/lib/api/client";

const BASE = "/reports";

export interface ReportFolder {
  id: string;
  name: string;
  description?: string | null;
  parent_id?: string | null;
  is_public: boolean;
  is_default: boolean;
  shared_with_user_ids: string[];
  report_ids: string[];
  created_by: string;
  created_at: string;
}

export interface FolderIn {
  name: string;
  description?: string | null;
  parent_id?: string | null;
  is_public?: boolean;
}

export interface SampleDownload {
  type: string;
  filename: string;
  headers: string[];
  rows_example: number;
}

export const reportsExtraService = {
  // STANDARD REPORTS
  salesStage: async (filters: any) =>
    (await apiClient.post(`${BASE}/standard/sales-stage`, filters)).data,
  userPerformance: async (filters: any) =>
    (await apiClient.post(`${BASE}/standard/user-performance`, filters)).data,
  opportunities: async (filters: any) =>
    (await apiClient.post(`${BASE}/standard/opportunities`, filters)).data,
  oppDomesticInternational: async (filters: any) =>
    (await apiClient.post(`${BASE}/standard/opportunities-domestic-international`, filters)).data,
  oppByCountry: async (filters: any) =>
    (await apiClient.post(`${BASE}/standard/opportunities-by-country`, filters)).data,
  activeUsers: async (filters: any) =>
    (await apiClient.post(`${BASE}/standard/active-users`, filters)).data,
  accountContact: async (filters: any) =>
    (await apiClient.post(`${BASE}/standard/account-contact`, filters)).data,
  leads: async (filters: any) => (await apiClient.post(`${BASE}/standard/leads`, filters)).data,
  team: async (filters: any) => (await apiClient.post(`${BASE}/standard/team`, filters)).data,
  leadConversion: async (filters: any) =>
    (await apiClient.post(`${BASE}/standard/lead-conversion`, filters)).data,
  agentDeparture: async (filters: any) =>
    (await apiClient.post(`${BASE}/standard/agent-departure`, filters)).data,

  // FOLDERS
  listFolders: async (): Promise<ReportFolder[]> =>
    (await apiClient.get(`${BASE}/folders`)).data,
  createFolder: async (payload: FolderIn): Promise<ReportFolder> =>
    (await apiClient.post(`${BASE}/folders`, payload)).data,
  createdByMe: async (): Promise<ReportFolder[]> =>
    (await apiClient.get(`${BASE}/folders/created-by-me`)).data,
  sharedWithMe: async (): Promise<ReportFolder[]> =>
    (await apiClient.get(`${BASE}/folders/shared-with-me`)).data,
  getFolder: async (id: string): Promise<ReportFolder> =>
    (await apiClient.get(`${BASE}/folders/${id}`)).data,
  updateFolder: async (id: string, payload: Partial<FolderIn>) =>
    (await apiClient.put(`${BASE}/folders/${id}`, payload)).data,
  deleteFolder: async (id: string) => apiClient.delete(`${BASE}/folders/${id}`),
  shareFolder: async (id: string, userIds: string[], permission = "read") =>
    (await apiClient.post(`${BASE}/folders/${id}/share`, { user_ids: userIds, permission })).data,

  // PREVIEW + CLONE
  preview: async (payload: any) => (await apiClient.post(`${BASE}/preview`, payload)).data,
  clone: async (id: string, name?: string) =>
    (await apiClient.post(`${BASE}/${id}/clone`, name)).data,
  exportFormat: async (payload: any) =>
    (await apiClient.post(`${BASE}/export/format`, payload)).data,

  // SAMPLE
  sample: async (type: string): Promise<SampleDownload> =>
    (await apiClient.get(`${BASE}/sample/${type}`)).data,

  // OWNERSHIP / VISIBILITY
  myReports: async () => (await apiClient.get(`${BASE}/created-by-me`)).data,
  privateReports: async () => (await apiClient.get(`${BASE}/private`)).data,
  publicReports: async () => (await apiClient.get(`${BASE}/public`)).data,
  userPerformanceSummary: async (userId?: string) =>
    (await apiClient.get(`${BASE}/user-performance`, { params: { user_id: userId } })).data,
};
