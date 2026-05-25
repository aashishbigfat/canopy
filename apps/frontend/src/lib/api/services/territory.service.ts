/**
 * Territory + Region service — list, mutate, and assignment-test.
 */
import { apiClient } from "@/lib/api/client";

const BASE = "/territories";

export interface Region {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  parent_id?: string | null;
  manager_id?: string | null;
  currency?: string | null;
  timezone?: string | null;
  is_active?: boolean;
}

export interface Territory {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  region_id: string;
  region_name?: string | null;
  parent_territory_id?: string | null;
  countries: string[];
  states: string[];
  postal_codes?: string[];
  users: string[];
  manager_id?: string | null;
  assignment_type?: "manual" | "geographic" | "rule_based";
  is_active: boolean;
}

export interface TerritoryAssignmentResult {
  territory_id: string;
  territory_name: string;
  region_id?: string | null;
  region_name?: string | null;
  matched_by: "postal_code" | "postal_code_pattern" | "state" | "country";
}

export type RegionPayload = Omit<Region, "id">;
export type TerritoryPayload = Omit<Territory, "id" | "region_name">;

export const territoryService = {
  // ---------- Lookup
  listRegions: async (): Promise<Region[]> => {
    const { data } = await apiClient.get(`${BASE}/regions-list`);
    return data;
  },
  regionsTree: async (): Promise<any[]> => {
    const { data } = await apiClient.get(`${BASE}/regions-tree`);
    return data;
  },
  listCountries: async (): Promise<{ id: string; name: string; code?: string }[]> => {
    const { data } = await apiClient.get(`${BASE}/countries-list`);
    return data;
  },
  listTerritories: async (): Promise<{ territories: Territory[]; total: number }> => {
    const { data } = await apiClient.get(`${BASE}/territories`);
    return data;
  },
  getBdReportList: async () => (await apiClient.get(`${BASE}/bd-report-list`)).data,

  // ---------- Region CRUD
  getRegion: async (id: string): Promise<Region> =>
    (await apiClient.get(`${BASE}/regions/${id}`)).data,
  createRegion: async (payload: RegionPayload): Promise<Region> =>
    (await apiClient.post(`${BASE}/regions`, payload)).data,
  updateRegion: async (id: string, payload: Partial<RegionPayload>): Promise<Region> =>
    (await apiClient.put(`${BASE}/regions/${id}`, payload)).data,
  deleteRegion: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/regions/${id}`);
  },

  // ---------- Territory CRUD
  getTerritory: async (id: string): Promise<Territory> =>
    (await apiClient.get(`${BASE}/territories/${id}`)).data,
  createTerritory: async (payload: TerritoryPayload): Promise<Territory> =>
    (await apiClient.post(`${BASE}/territories`, payload)).data,
  updateTerritory: async (id: string, payload: Partial<TerritoryPayload>): Promise<Territory> =>
    (await apiClient.put(`${BASE}/territories/${id}`, payload)).data,
  deleteTerritory: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/territories/${id}`);
  },

  // ---------- Assignment tester (calls find_territory_for_address)
  checkAssignment: async (params: {
    country?: string;
    state?: string;
    postal_code?: string;
  }): Promise<TerritoryAssignmentResult | null> => {
    try {
      const { data } = await apiClient.get(`${BASE}/territories/check-assignment`, { params });
      return data;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },
};
