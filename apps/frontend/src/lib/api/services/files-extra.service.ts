/**
 * Phase 9 — File folders / shares / versions / public links.
 */
import { apiClient } from "@/lib/api/client";

const BASE = "/files";

export interface FileFolder {
  id: string;
  name: string;
  description?: string | null;
  parent_id?: string | null;
  owner_id: string;
  is_public: boolean;
  shared_with_user_ids: string[];
}

export interface FileVersion {
  id: string;
  file_id: string;
  version_no: number;
  s3_url?: string | null;
  file_size?: number | null;
  uploaded_by: string;
  notes?: string | null;
  created_at: string;
}

export interface FilePublicLink {
  id: string;
  file_id: string;
  token: string;
  expires_at?: string | null;
  is_active: boolean;
  access_count: number;
}

export interface FileShare {
  id: string;
  file_id?: string | null;
  folder_id?: string | null;
  user_id: string;
  permission: "read" | "write";
  shared_at: string;
}

export const filesExtraService = {
  // FOLDERS
  listFolders: async (): Promise<FileFolder[]> =>
    (await apiClient.get(`${BASE}/folders`)).data,
  createFolder: async (payload: any): Promise<FileFolder> =>
    (await apiClient.post(`${BASE}/folders`, payload)).data,
  getFolder: async (id: string): Promise<FileFolder> =>
    (await apiClient.get(`${BASE}/folders/${id}`)).data,
  updateFolder: async (id: string, payload: any) =>
    (await apiClient.put(`${BASE}/folders/${id}`, payload)).data,
  deleteFolder: async (id: string) => apiClient.delete(`${BASE}/folders/${id}`),

  // SHARES
  share: async (payload: { file_id?: string; folder_id?: string; user_ids: string[]; permission?: string }) =>
    (await apiClient.post(`${BASE}/shares`, payload)).data,
  sharedWithMe: async (): Promise<FileShare[]> =>
    (await apiClient.get(`${BASE}/shares/shared-with-me`)).data,
  foldersSharedWithMe: async (): Promise<FileFolder[]> =>
    (await apiClient.get(`${BASE}/shares/folders-shared-with-me`)).data,
  sharedByAdmin: async () => (await apiClient.get(`${BASE}/shares/by-admin`)).data,
  revokeShare: async (id: string) => apiClient.delete(`${BASE}/shares/${id}`),

  // VERSIONS
  listVersions: async (fileId: string): Promise<FileVersion[]> =>
    (await apiClient.get(`${BASE}/${fileId}/versions`)).data,
  uploadVersion: async (fileId: string, payload: any): Promise<FileVersion> =>
    (await apiClient.post(`${BASE}/${fileId}/versions`, payload)).data,

  // PUBLIC LINKS
  createPublicLink: async (fileId: string, expiresInDays?: number): Promise<FilePublicLink> =>
    (await apiClient.post(`${BASE}/${fileId}/public-link`, { expires_in_days: expiresInDays })).data,
  getPublicLink: async (fileId: string): Promise<FilePublicLink> =>
    (await apiClient.get(`${BASE}/${fileId}/public-link`)).data,
  revokePublicLink: async (fileId: string) =>
    apiClient.delete(`${BASE}/${fileId}/public-link`),

  // UTIL
  recent: async (limit = 20) =>
    (await apiClient.get(`${BASE}/recent`, { params: { limit } })).data,
  download: async (fileId: string) =>
    (await apiClient.get(`${BASE}/${fileId}/download`)).data,
  preview: async (fileId: string) =>
    (await apiClient.get(`${BASE}/${fileId}/preview`)).data,
};
