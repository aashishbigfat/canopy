/**
 * Phase 13 — Imports / Exports per entity.
 */
import { apiClient } from "@/lib/api/client";
import type { EntityType } from "@/lib/api/services/field-registry.service";

const BASE = "/imports";

export const importsExportsService = {
  fieldLists: async () => (await apiClient.get(`${BASE}/field-lists`)).data,
  exportEntity: async (entity: EntityType, format: "csv" | "xlsx") =>
    (await apiClient.get(`${BASE}/${entity}/export/${format}`)).data,
  importEntity: async (entity: EntityType, payload: any) =>
    (await apiClient.post(`${BASE}/${entity}/import`, payload)).data,
  importHistory: async () =>
    (await apiClient.post(`${BASE}/opportunity-history/import`, {})).data,
  leadSyncStatus: async () => (await apiClient.get(`${BASE}/lead/sync-status`)).data,
};
