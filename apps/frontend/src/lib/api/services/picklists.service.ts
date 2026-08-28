/**
 * Phase 1 frontend client — Picklists (polymorphic, 18 types).
 */
import { apiClient } from "@/lib/api/client";

export type PicklistType =
  | "industry"
  | "account_type"
  | "account_source"
  | "supplier_service"
  | "sales_stage"
  | "opportunity_type"
  | "experience"
  | "opportunity_tag"
  | "lead_status"
  | "source"
  | "source_medium"
  | "salutation"
  | "task_priority"
  | "task_status"
  | "inclusion"
  | "supplier_type"
  | "destination"
  | "itinerary_inclusion"
  | "bd_activity_type"
  | "expense_category";

export interface PicklistItem {
  id: string;
  name: string;
  description?: string | null;
  sorting: number;
  is_active: boolean;
  color?: string | null;
  // BD activity type extras
  requires_field_meeting?: boolean | null;
  requires_check_in?: boolean | null;
  requires_approval?: boolean | null;
  expected_duration_min?: number | null;
  // Expense category extras
  requires_receipt?: boolean | null;
  max_amount?: number | null;
  auto_approve_under?: number | null;
}

export interface PicklistItemCreate {
  name: string;
  description?: string | null;
  sorting?: number;
  is_active?: boolean;
}

export type PicklistItemUpdate = Partial<PicklistItemCreate>;

const BASE = "/picklists";

export const picklistsService = {
  listTypes: async (): Promise<string[]> => {
    const { data } = await apiClient.get<string[]>(`${BASE}/types`);
    return data;
  },

  list: async (type: PicklistType, activeOnly?: boolean): Promise<PicklistItem[]> => {
    const params = activeOnly !== undefined ? { active_only: activeOnly } : {};
    const { data } = await apiClient.get<PicklistItem[]>(`${BASE}/${type}`, { params });
    return data;
  },

  get: async (type: PicklistType, id: string): Promise<PicklistItem> => {
    const { data } = await apiClient.get<PicklistItem>(`${BASE}/${type}/${id}`);
    return data;
  },

  create: async (type: PicklistType, payload: PicklistItemCreate): Promise<PicklistItem> => {
    const { data } = await apiClient.post<PicklistItem>(`${BASE}/${type}`, payload);
    return data;
  },

  update: async (
    type: PicklistType,
    id: string,
    payload: PicklistItemUpdate,
  ): Promise<PicklistItem> => {
    const { data } = await apiClient.put<PicklistItem>(`${BASE}/${type}/${id}`, payload);
    return data;
  },

  delete: async (type: PicklistType, id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${type}/${id}`);
  },

  sort: async (
    type: PicklistType,
    items: { id: string; sorting: number }[],
  ): Promise<{ updated: number }> => {
    const { data } = await apiClient.post<{ updated: number }>(`${BASE}/${type}/sort`, { items });
    return data;
  },
};
