export type BDVisitableType = "Lead" | "Opportunity" | "Account" | "Contact";

export type BDVisitStatus =
  | "planned"
  | "approved"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type BDVisitApprovalStatus = "pending" | "approved" | "rejected" | "not_required";

export interface BDVisit {
  id: string;
  tenant_id: string;
  bd_visitable_type: BDVisitableType;
  bd_visitable_id: string;
  activity_type_id?: string | null;
  activity_type_name?: string | null;
  title: string;
  description?: string | null;
  scheduled_date: string;
  scheduled_duration_min: number;
  status: BDVisitStatus;
  approval_status: BDVisitApprovalStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  check_in_at?: string | null;
  check_in_lat?: number | null;
  check_in_lng?: number | null;
  check_in_accuracy_m?: number | null;
  check_out_at?: string | null;
  check_out_lat?: number | null;
  check_out_lng?: number | null;
  outcome?: string | null;
  outcome_notes?: string | null;
  next_action?: string | null;
  next_action_at?: string | null;
  companion_task_id?: string | null;
  expense_ids: string[];
  photo_file_ids: string[];
  address_snapshot?: Record<string, any> | null;
  territory_id?: string | null;
  region_id?: string | null;
  owner_id: string;
  owner_name?: string | null;
  reporting_manager_id?: string | null;
  reporting_manager_name?: string | null;
  parent_name?: string | null;
  industry_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface BDVisitCreateData {
  bd_visitable_type: BDVisitableType;
  bd_visitable_id: string;
  title: string;
  description?: string;
  scheduled_date: string;
  scheduled_duration_min?: number;
  activity_type_id?: string;
  owner_id?: string;
  reporting_manager_id?: string;
  industry_data?: Record<string, any>;
}

export interface BDVisitUpdateData {
  title?: string;
  description?: string;
  scheduled_date?: string;
  scheduled_duration_min?: number;
  activity_type_id?: string;
  owner_id?: string;
  industry_data?: Record<string, any>;
}

export interface BDVisitListResponse {
  visits: BDVisit[];
  total: number;
  page: number;
  per_page: number;
}

export interface BDVisitFilters {
  status?: BDVisitStatus;
  approval_status?: BDVisitApprovalStatus;
  owner_id?: string;
  bd_visitable_type?: BDVisitableType;
  bd_visitable_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}
