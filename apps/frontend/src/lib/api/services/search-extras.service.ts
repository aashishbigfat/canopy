/**
 * Phase 12 — Search modules + supplier email templates.
 */
import { apiClient } from "@/lib/api/client";

const BASE = "/search_extras";

export interface SearchModuleConfig {
  enabled_modules: string[];
  weights?: Record<string, number>;
  settings?: Record<string, any>;
}

export interface SupplierTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  is_active: boolean;
}

export const searchExtrasService = {
  getModules: async (): Promise<SearchModuleConfig> =>
    (await apiClient.get(`${BASE}/modules`)).data,
  saveModules: async (payload: SearchModuleConfig) =>
    (await apiClient.post(`${BASE}/modules`, payload)).data,
  addNote: async (query: string, note: string) =>
    (await apiClient.post(`${BASE}/notes`, { query, note })).data,
  listNotes: async () => (await apiClient.get(`${BASE}/notes`)).data,

  listSupplierTemplates: async (): Promise<SupplierTemplate[]> =>
    (await apiClient.get(`${BASE}/supplier-templates`)).data,
  createSupplierTemplate: async (payload: any): Promise<SupplierTemplate> =>
    (await apiClient.post(`${BASE}/supplier-templates`, payload)).data,
  updateSupplierTemplate: async (id: string, payload: any) =>
    (await apiClient.put(`${BASE}/supplier-templates/${id}`, payload)).data,
  deleteSupplierTemplate: async (id: string) =>
    apiClient.delete(`${BASE}/supplier-templates/${id}`),
};
