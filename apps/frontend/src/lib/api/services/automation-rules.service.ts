import { apiClient } from "@/lib/api/client";

export interface AutomationCondition {
  path: string;
  op: "eq" | "neq" | "in" | "contains" | "gt" | "lt" | "gte" | "lte" | "exists";
  value: any;
}

export interface AutomationRule {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  trigger_event: string;
  conditions: AutomationCondition[];
  conditions_logic: "AND" | "OR";
  action_type: string;
  action_params: Record<string, any>;
  industry?: string | null;
  priority: number;
  last_fired_at?: string | null;
  fire_count: number;
  created_at: string;
  updated_at: string;
}

export interface AutomationRulePayload {
  name: string;
  description?: string;
  is_active?: boolean;
  trigger_event: string;
  conditions?: AutomationCondition[];
  conditions_logic?: "AND" | "OR";
  action_type: string;
  action_params?: Record<string, any>;
  industry?: string;
  priority?: number;
}

const BASE = "/automation-rules";

export const automationService = {
  triggers: async (): Promise<{ triggers: string[]; actions: string[]; operators: string[] }> =>
    (await apiClient.get(`${BASE}/triggers`)).data,

  list: async (): Promise<AutomationRule[]> => (await apiClient.get(BASE)).data,

  get: async (id: string): Promise<AutomationRule> =>
    (await apiClient.get(`${BASE}/${id}`)).data,

  create: async (data: AutomationRulePayload): Promise<AutomationRule> =>
    (await apiClient.post(BASE, data)).data,

  update: async (id: string, data: Partial<AutomationRulePayload>): Promise<AutomationRule> =>
    (await apiClient.put(`${BASE}/${id}`, data)).data,

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`);
  },

  test: async (id: string, sample: Record<string, any>) =>
    (await apiClient.post(`${BASE}/${id}/test`, { sample })).data as {
      matched: boolean;
      would_run_action: string | null;
      action_params: Record<string, any> | null;
    },
};
