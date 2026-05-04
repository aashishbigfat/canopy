/**
 * Phase 3 frontend client — Territory + region tree.
 */
import { apiClient } from "@/lib/api/client";

const BASE = "/territories";

export interface Region {
  id: string;
  name: string;
  code?: string | null;
  parent_id?: string | null;
}

export interface Territory {
  id: string;
  name: string;
  region_id: string;
  region_name?: string | null;
  countries: string[];
  states: string[];
  users: string[];
  is_active: boolean;
}

export const territoryService = {
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
};
