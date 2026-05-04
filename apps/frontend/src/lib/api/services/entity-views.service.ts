/**
 * Phase 4 — Polymorphic entity views/columns/filters/pinned-views.
 */
import { apiClient } from "@/lib/api/client";
import type { EntityType } from "@/lib/api/services/field-registry.service";

const BASE = "/entity_views";

export interface EntityView {
  id: string;
  entity_type: string;
  name: string;
  description?: string | null;
  filters: Record<string, any>;
  sort_by?: string | null;
  sort_dir: "asc" | "desc";
  is_public: boolean;
  is_default: boolean;
  created_by: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface EntityViewIn {
  name: string;
  description?: string | null;
  filters?: Record<string, any>;
  sort_by?: string | null;
  sort_dir?: "asc" | "desc";
  is_public?: boolean;
  is_default?: boolean;
}

export interface EntityColumn {
  id: string;
  entity_type: string;
  field_key: string;
  is_additional: boolean;
  label: string;
  is_visible: boolean;
  is_editable: boolean;
  sorting: number;
  width?: number | null;
}

export interface EntityColumnIn {
  field_key: string;
  is_additional?: boolean;
  label: string;
  is_visible?: boolean;
  is_editable?: boolean;
  sorting?: number;
  width?: number | null;
}

export interface PinnedView {
  id: string;
  view_id: string;
  user_id: string;
  pinned_at: string;
}

export interface SavedFilter {
  id: string;
  user_id: string;
  name?: string | null;
  expression: Record<string, any>;
  created_at: string;
}

export const entityViewsService = {
  // VIEWS
  listViews: async (entity: EntityType): Promise<EntityView[]> =>
    (await apiClient.get(`${BASE}/views/${entity}`)).data,
  createView: async (entity: EntityType, payload: EntityViewIn): Promise<EntityView> =>
    (await apiClient.post(`${BASE}/views/${entity}`, payload)).data,
  getView: async (entity: EntityType, id: string): Promise<EntityView> =>
    (await apiClient.get(`${BASE}/views/${entity}/${id}`)).data,
  updateView: async (entity: EntityType, id: string, payload: Partial<EntityViewIn>): Promise<EntityView> =>
    (await apiClient.put(`${BASE}/views/${entity}/${id}`, payload)).data,
  deleteView: async (entity: EntityType, id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/views/${entity}/${id}`);
  },

  // COLUMNS
  listColumns: async (entity: EntityType): Promise<EntityColumn[]> =>
    (await apiClient.get(`${BASE}/columns/${entity}`)).data,
  createColumn: async (entity: EntityType, payload: EntityColumnIn): Promise<EntityColumn> =>
    (await apiClient.post(`${BASE}/columns/${entity}`, payload)).data,
  updateColumn: async (entity: EntityType, id: string, payload: EntityColumnIn): Promise<EntityColumn> =>
    (await apiClient.put(`${BASE}/columns/${entity}/${id}`, payload)).data,
  deleteColumn: async (entity: EntityType, id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/columns/${entity}/${id}`);
  },
  sortColumns: async (
    entity: EntityType,
    items: { id: string; sorting: number }[],
  ): Promise<{ updated: number }> =>
    (await apiClient.post(`${BASE}/columns/${entity}/sort`, { items })).data,

  // FILTERS
  listFilters: async (entity: EntityType): Promise<SavedFilter[]> =>
    (await apiClient.get(`${BASE}/filters/${entity}`)).data,
  saveFilter: async (entity: EntityType, payload: { name?: string | null; expression: Record<string, any> }): Promise<SavedFilter> =>
    (await apiClient.post(`${BASE}/filters/${entity}`, payload)).data,
  deleteFilter: async (entity: EntityType, id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/filters/${entity}/${id}`);
  },

  // PINNED VIEWS
  listPinned: async (entity: EntityType): Promise<PinnedView[]> =>
    (await apiClient.get(`${BASE}/pinned/${entity}`)).data,
  pin: async (entity: EntityType, viewId: string): Promise<PinnedView> =>
    (await apiClient.post(`${BASE}/pinned/${entity}`, { view_id: viewId })).data,
  unpin: async (entity: EntityType, viewId: string): Promise<void> => {
    await apiClient.delete(`${BASE}/pinned/${entity}/${viewId}`);
  },
};
