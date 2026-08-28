import { apiClient } from "@/lib/api/client";

export interface PingPayload {
  lat: number;
  lng: number;
  recorded_at: string;
  bd_visit_id?: string;
  accuracy_m?: number;
  speed_mps?: number;
  heading_deg?: number;
  altitude_m?: number;
  battery_pct?: number;
}

export interface TeamLocation {
  user_id: string;
  user_name?: string | null;
  lat: number;
  lng: number;
  accuracy_m?: number | null;
  speed_mps?: number | null;
  battery_pct?: number | null;
  bd_visit_id?: string | null;
  bd_visit_title?: string | null;
  recorded_at: string;
}

const BASE = "/tracking";

export const trackingService = {
  ingest: async (pings: PingPayload[]): Promise<{ accepted: number; rejected: number }> =>
    (await apiClient.post(`${BASE}/pings`, { pings })).data,

  visitPings: async (visitId: string) =>
    (await apiClient.get(`${BASE}/pings/visit/${visitId}`)).data,

  live: async (maxAgeMinutes = 10): Promise<TeamLocation[]> =>
    (await apiClient.get(`${BASE}/live`, { params: { max_age_minutes: maxAgeMinutes } })).data,

  userLatest: async (userId: string) =>
    (await apiClient.get(`${BASE}/users/${userId}/latest`)).data,
};
