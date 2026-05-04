/**
 * Phase 2 frontend client — Settings hub (company, leaderboard, opp-settings,
 * auto-assignment, department mapping, agent connect, email footer).
 */
import { apiClient } from "@/lib/api/client";

const ADMIN = "/admin";

// ============== Company ==============

export interface CompanySettings {
  tenant_id: string;
  company_name?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  bank_name?: string | null;
  bank_branch?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  bank_swift?: string | null;
  bank_holder_name?: string | null;
  gstin?: string | null;
  pan?: string | null;
  cin?: string | null;
  extras?: Record<string, any>;
}

export const companySettingsService = {
  get: async (): Promise<CompanySettings> => (await apiClient.get(`${ADMIN}/company`)).data,
  update: async (payload: Partial<CompanySettings>): Promise<CompanySettings> =>
    (await apiClient.put(`${ADMIN}/company`, payload)).data,
  updateLogo: async (payload: { logo_url?: string; favicon_url?: string }) =>
    (await apiClient.put(`${ADMIN}/company/logo`, payload)).data,
  updateBank: async (payload: Partial<CompanySettings>) =>
    (await apiClient.put(`${ADMIN}/company/bank`, payload)).data,
};

// ============== Opportunity workflow ==============

export interface OppWorkflowSettings {
  require_lock_on_won?: boolean;
  auto_lock_at_stage_id?: string | null;
  enforce_proba_progression?: boolean;
  allow_stage_skip?: boolean;
  allow_owner_change_after_lock?: boolean;
  require_close_lost_reason?: boolean;
  extras?: Record<string, any>;
}

export const oppSettingsService = {
  get: async (): Promise<OppWorkflowSettings> =>
    (await apiClient.get(`${ADMIN}/opp-settings`)).data,
  update: async (payload: OppWorkflowSettings): Promise<OppWorkflowSettings> =>
    (await apiClient.post(`${ADMIN}/opp-settings`, payload)).data,
};

// ============== Leaderboard ==============

export interface LeaderboardConfig {
  parameters?: any[];
  accolades?: any[];
  performance?: Record<string, any>;
  is_enabled?: boolean;
  refresh_interval_minutes?: number;
}

export const leaderboardService = {
  get: async (): Promise<LeaderboardConfig> =>
    (await apiClient.get(`${ADMIN}/leaderboard`)).data,
  saveParameters: async (parameters: any[]) =>
    (await apiClient.post(`${ADMIN}/leaderboard/parameters`, { parameters })).data,
  saveAccolades: async (accolades: any[]) =>
    (await apiClient.post(`${ADMIN}/leaderboard/accolades`, { accolades })).data,
  savePerformance: async (performance: Record<string, any>) =>
    (await apiClient.post(`${ADMIN}/leaderboard/performance`, { performance })).data,
};

// ============== Auto-assignment ==============

export interface AutoAssignSettings {
  is_enabled?: boolean;
  strategy?: string;
  cron_expression?: string | null;
  extras?: Record<string, any>;
}

export interface UserAssignmentRule {
  id: string;
  user_id: string;
  is_active: boolean;
  weight: number;
  daily_cap?: number | null;
  industries: string[];
  sources: string[];
}

export interface CountryUserAssignment {
  id: string;
  country: string;
  user_ids: string[];
  is_active: boolean;
}

export const autoAssignService = {
  getSettings: async (): Promise<AutoAssignSettings> =>
    (await apiClient.get(`${ADMIN}/auto-assignment`)).data,
  saveSettings: async (payload: AutoAssignSettings) =>
    (await apiClient.post(`${ADMIN}/auto-assignment`, payload)).data,
  listUserRules: async (): Promise<UserAssignmentRule[]> =>
    (await apiClient.get(`${ADMIN}/auto-assignment/users`)).data,
  upsertUserRule: async (payload: any) =>
    (await apiClient.post(`${ADMIN}/auto-assignment/users`, payload)).data,
  updateUserRule: async (userId: string, payload: any) =>
    (await apiClient.put(`${ADMIN}/auto-assignment/users/${userId}`, payload)).data,
  deleteUserRule: async (userId: string) =>
    apiClient.delete(`${ADMIN}/auto-assignment/users/${userId}`),
  listCountries: async (): Promise<CountryUserAssignment[]> =>
    (await apiClient.get(`${ADMIN}/auto-assignment/countries`)).data,
  upsertCountry: async (payload: any) =>
    (await apiClient.post(`${ADMIN}/auto-assignment/countries`, payload)).data,
  updateCountry: async (country: string, payload: any) =>
    (await apiClient.put(`${ADMIN}/auto-assignment/countries/${country}`, payload)).data,
  deleteCountry: async (country: string) =>
    apiClient.delete(`${ADMIN}/auto-assignment/countries/${country}`),
};

// ============== Department mapping ==============

export interface DepartmentMapping {
  id: string;
  department_id: string;
  user_ids: string[];
  product_ids: string[];
  destination_ids: string[];
}

export const departmentMappingService = {
  list: async (): Promise<DepartmentMapping[]> =>
    (await apiClient.get(`${ADMIN}/department-settings`)).data,
  upsert: async (payload: any) =>
    (await apiClient.post(`${ADMIN}/department-settings`, payload)).data,
  getUsers: async (departmentId: string) =>
    (await apiClient.get(`${ADMIN}/department-settings/${departmentId}/users`)).data,
};

// ============== Agent connect ==============

export interface AgentConnection {
  bd_to_ops_user_id?: string | null;
  auto_handoff_on_won: boolean;
  handoff_notes?: string | null;
}

export const agentConnectService = {
  get: async (): Promise<AgentConnection> =>
    (await apiClient.get(`${ADMIN}/agent-connect`)).data,
  update: async (payload: Partial<AgentConnection>) =>
    (await apiClient.post(`${ADMIN}/agent-connect`, payload)).data,
};

// ============== Email footer ==============

export interface EmailFooter {
  body_html: string;
  is_active: boolean;
}

export const emailFooterService = {
  getTenant: async (): Promise<EmailFooter | null> =>
    (await apiClient.get(`${ADMIN}/email-footer/tenant`)).data,
  saveTenant: async (payload: EmailFooter) =>
    (await apiClient.put(`${ADMIN}/email-footer/tenant`, payload)).data,
  getMine: async (): Promise<EmailFooter | null> =>
    (await apiClient.get(`${ADMIN}/email-footer/user`)).data,
  saveMine: async (payload: EmailFooter) =>
    (await apiClient.put(`${ADMIN}/email-footer/user`, payload)).data,
};
