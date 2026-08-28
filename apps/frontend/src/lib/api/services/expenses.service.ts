import { apiClient } from "@/lib/api/client";
import type {
  Expense, ExpenseCreateData, ExpenseListResponse, ExpenseSummary, ExpenseFilters,
} from "@/features/bd/expenses/types";

const BASE = "/expenses";

export const expensesService = {
  list: async (filters: ExpenseFilters = {}): Promise<ExpenseListResponse> =>
    (await apiClient.get(BASE, { params: filters })).data,

  pendingApprovals: async (): Promise<ExpenseListResponse> =>
    (await apiClient.get(`${BASE}/pending-approvals`)).data,

  summary: async (): Promise<ExpenseSummary> =>
    (await apiClient.get(`${BASE}/summary`)).data,

  byVisit: async (visitId: string): Promise<ExpenseListResponse> =>
    (await apiClient.get(`${BASE}/by-visit/${visitId}`)).data,

  get: async (id: string): Promise<Expense> =>
    (await apiClient.get(`${BASE}/${id}`)).data,

  create: async (data: ExpenseCreateData): Promise<Expense> =>
    (await apiClient.post(BASE, data)).data,

  update: async (id: string, data: Partial<ExpenseCreateData>): Promise<Expense> =>
    (await apiClient.put(`${BASE}/${id}`, data)).data,

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`);
  },

  submit: async (id: string): Promise<Expense> =>
    (await apiClient.post(`${BASE}/${id}/submit`)).data,

  approve: async (id: string, notes?: string): Promise<Expense> =>
    (await apiClient.post(`${BASE}/${id}/approve`, { notes })).data,

  reject: async (id: string, reason: string): Promise<Expense> =>
    (await apiClient.post(`${BASE}/${id}/reject`, { reason })).data,

  reimburse: async (id: string, reference?: string): Promise<Expense> =>
    (await apiClient.post(`${BASE}/${id}/reimburse`, { reference })).data,

  uploadReceipt: async (id: string, file: File): Promise<any> => {
    const fd = new FormData();
    fd.append("file", file);
    return (await apiClient.post(`${BASE}/${id}/receipts`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    })).data;
  },

  listReceipts: async (id: string): Promise<any[]> =>
    (await apiClient.get(`${BASE}/${id}/receipts`)).data,
};
