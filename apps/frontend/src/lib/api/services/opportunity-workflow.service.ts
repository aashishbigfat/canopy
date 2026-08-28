/**
 * Phase 6 — Opportunity workflow (vouchers, departures, ledger, claims, handover, team).
 */
import { apiClient } from "@/lib/api/client";

const BASE = "/opportunities";

export interface Voucher {
  id: string;
  opportunity_id: string;
  voucher_type: string;
  voucher_number?: string | null;
  title?: string | null;
  status: string;
  issued_at: string;
  pdf_url?: string | null;
}

export interface Departure {
  id: string;
  opportunity_id: string;
  departure_date: string;
  return_date?: string | null;
  pax_count: number;
  status: string;
  is_agent_departure: boolean;
  notes?: string | null;
}

export interface LedgerEntry {
  id: string;
  opportunity_id: string;
  entry_type: "debit" | "credit";
  amount: number;
  currency: string;
  description?: string | null;
  counterparty?: string | null;
  reference_no?: string | null;
  entry_date: string;
}

export interface OpportunityClaim {
  id: string;
  opportunity_id: string;
  claim_type: string;
  description?: string | null;
  amount?: number | null;
  status: string;
  raised_by: string;
  resolved_at?: string | null;
}

export interface HandoverRequest {
  id: string;
  opportunity_id: string;
  from_user_id: string;
  to_user_id: string;
  reason?: string | null;
  status: string;
  handover_at?: string | null;
}

export interface TeamMember {
  id: string;
  user_id: string;
  role?: string | null;
}

export interface PaymentSchedule {
  id: string;
  direction: "outgoing" | "incoming";
  amount: number;
  currency: string;
  due_date?: string | null;
  paid_on?: string | null;
  status: string;
  notes?: string | null;
}

export const opportunityWorkflowService = {
  // VOUCHERS
  listVouchers: async (oppId: string): Promise<Voucher[]> =>
    (await apiClient.get(`${BASE}/${oppId}/vouchers`)).data,
  createVoucher: async (oppId: string, payload: any): Promise<Voucher> =>
    (await apiClient.post(`${BASE}/${oppId}/vouchers`, payload)).data,
  updateVoucher: async (oppId: string, id: string, payload: any) =>
    (await apiClient.put(`${BASE}/${oppId}/vouchers/${id}`, payload)).data,
  generateVoucher: async (oppId: string, id: string) =>
    (await apiClient.post(`${BASE}/${oppId}/vouchers/${id}/generate`)).data,
  deleteVoucher: async (oppId: string, id: string) =>
    apiClient.delete(`${BASE}/${oppId}/vouchers/${id}`),

  // DEPARTURES
  listDepartures: async (oppId: string): Promise<Departure[]> =>
    (await apiClient.get(`${BASE}/${oppId}/departures`)).data,
  createDeparture: async (oppId: string, payload: any): Promise<Departure> =>
    (await apiClient.post(`${BASE}/${oppId}/departures`, payload)).data,
  updateDeparture: async (oppId: string, id: string, payload: any) =>
    (await apiClient.put(`${BASE}/${oppId}/departures/${id}`, payload)).data,
  holdDeparture: async (oppId: string, id: string, payload: any) =>
    (await apiClient.post(`${BASE}/${oppId}/departures/${id}/hold`, payload)).data,
  bookDeparture: async (oppId: string, id: string) =>
    (await apiClient.post(`${BASE}/${oppId}/departures/${id}/book`)).data,

  // LEDGER
  listLedger: async (oppId: string): Promise<LedgerEntry[]> =>
    (await apiClient.get(`${BASE}/${oppId}/ledger`)).data,
  createLedger: async (oppId: string, payload: any): Promise<LedgerEntry> =>
    (await apiClient.post(`${BASE}/${oppId}/ledger`, payload)).data,
  updateLedger: async (oppId: string, id: string, payload: any) =>
    (await apiClient.put(`${BASE}/${oppId}/ledger/${id}`, payload)).data,

  // CLAIMS
  listClaims: async (oppId: string): Promise<OpportunityClaim[]> =>
    (await apiClient.get(`${BASE}/${oppId}/claims`)).data,
  raiseClaim: async (oppId: string, payload: any): Promise<OpportunityClaim> =>
    (await apiClient.post(`${BASE}/${oppId}/claims`, payload)).data,
  resolveClaim: async (oppId: string, id: string, payload: { status: string; resolution_notes?: string }) =>
    (await apiClient.post(`${BASE}/${oppId}/claims/${id}/resolve`, payload)).data,

  // HANDOVER
  listHandovers: async (oppId: string): Promise<HandoverRequest[]> =>
    (await apiClient.get(`${BASE}/${oppId}/handovers`)).data,
  createHandover: async (oppId: string, payload: { to_user_id: string; reason?: string }) =>
    (await apiClient.post(`${BASE}/${oppId}/handovers`, payload)).data,
  acceptHandover: async (oppId: string, id: string) =>
    (await apiClient.post(`${BASE}/${oppId}/handovers/${id}/accept`)).data,
  rejectHandover: async (oppId: string, id: string) =>
    (await apiClient.post(`${BASE}/${oppId}/handovers/${id}/reject`)).data,

  // TEAM
  listTeam: async (oppId: string): Promise<TeamMember[]> =>
    (await apiClient.get(`${BASE}/${oppId}/team`)).data,
  addTeamMember: async (oppId: string, payload: { user_id: string; role?: string }) =>
    (await apiClient.post(`${BASE}/${oppId}/team`, payload)).data,
  removeTeamMember: async (oppId: string, userId: string) =>
    apiClient.delete(`${BASE}/${oppId}/team/${userId}`),

  // PAYMENT SCHEDULES
  listSchedules: async (oppId: string): Promise<PaymentSchedule[]> =>
    (await apiClient.get(`${BASE}/${oppId}/payment-schedules`)).data,
  createSchedule: async (oppId: string, payload: any): Promise<PaymentSchedule> =>
    (await apiClient.post(`${BASE}/${oppId}/payment-schedules`, payload)).data,

  // EXTERNAL LEAD CAPTURE (public)
  capture: async (payload: any) =>
    (await apiClient.post(`${BASE}/external-leads/capture`, payload)).data,
  listExternal: async (isProcessed?: boolean) =>
    (await apiClient.get(`${BASE}/external-leads`, { params: { is_processed: isProcessed } })).data,

  // LOCKS
  autoLock: async (oppId: string) =>
    (await apiClient.post(`${BASE}/${oppId}/automatic-lock`)).data,
};
