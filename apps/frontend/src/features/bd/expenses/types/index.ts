export type ExpenseStatus = "draft" | "submitted" | "approved" | "rejected" | "reimbursed";

export interface Expense {
  id: string;
  tenant_id: string;
  category_id?: string | null;
  category_name?: string | null;
  title: string;
  description?: string | null;
  amount: number;
  currency: string;
  incurred_at: string;
  bd_visit_id?: string | null;
  bd_visit_title?: string | null;
  bd_visitable_type?: string | null;
  bd_visitable_id?: string | null;
  receipt_file_ids: string[];
  status: ExpenseStatus;
  submitted_at?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  approval_notes?: string | null;
  rejection_reason?: string | null;
  reimbursed_at?: string | null;
  reimbursed_by?: string | null;
  reimbursement_reference?: string | null;
  reporting_manager_id?: string | null;
  reporting_manager_name?: string | null;
  owner_id: string;
  owner_name?: string | null;
  industry_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCreateData {
  title: string;
  amount: number;
  currency?: string;
  incurred_at: string;
  category_id?: string;
  description?: string;
  bd_visit_id?: string;
  bd_visitable_type?: string;
  bd_visitable_id?: string;
}

export interface ExpenseListResponse {
  expenses: Expense[];
  total: number;
  page: number;
  per_page: number;
}

export interface ExpenseSummary {
  total_amount: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  count_pending_approval: number;
}

export interface ExpenseFilters {
  status?: ExpenseStatus;
  owner_id?: string;
  category_id?: string;
  bd_visit_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}
