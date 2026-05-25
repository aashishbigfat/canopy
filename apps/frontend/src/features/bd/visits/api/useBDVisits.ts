import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { bdVisitsService } from "@/lib/api/services/bd-visits.service";
import { ErrorHandler, showSuccessToast } from "@/lib/error-handler";
import type {
  BDVisitCreateData,
  BDVisitUpdateData,
  BDVisitFilters,
  BDVisitableType,
} from "../types";

export const useBDVisits = (filters: BDVisitFilters = {}) =>
  useQuery({
    queryKey: ["bd-visits", filters],
    queryFn: () => bdVisitsService.list(filters),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

export const useBDVisit = (id: string) =>
  useQuery({
    queryKey: ["bd-visits", id],
    queryFn: () => bdVisitsService.get(id),
    enabled: !!id,
  });

export const useBDVisitsByParent = (type: BDVisitableType | null, id: string | null) =>
  useQuery({
    queryKey: ["bd-visits", "by-parent", type, id],
    queryFn: () => bdVisitsService.byParent(type as BDVisitableType, id as string),
    enabled: !!type && !!id,
  });

export const useMyTodayVisits = () =>
  useQuery({
    queryKey: ["bd-visits", "today"],
    queryFn: () => bdVisitsService.myToday(),
    staleTime: 60_000,
  });

export const useBDDashboardKpis = () =>
  useQuery({
    queryKey: ["bd-visits", "kpis"],
    queryFn: () => bdVisitsService.dashboardKpis(),
    staleTime: 30_000,
  });

export const useMyPendingApprovals = () =>
  useQuery({
    queryKey: ["bd-visits", "pending-approvals"],
    queryFn: () => bdVisitsService.pendingApprovals(),
    staleTime: 30_000,
  });

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["bd-visits"] });
}

export const useCreateBDVisit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BDVisitCreateData) => bdVisitsService.create(data),
    onSuccess: () => {
      invalidateAll(qc);
      showSuccessToast("Visit scheduled");
    },
    onError: ErrorHandler.getMutationErrorHandler("Failed to create visit"),
  });
};

export const useUpdateBDVisit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BDVisitUpdateData }) =>
      bdVisitsService.update(id, data),
    onSuccess: (visit) => {
      invalidateAll(qc);
      qc.invalidateQueries({ queryKey: ["bd-visits", visit.id] });
      showSuccessToast("Visit updated");
    },
    onError: ErrorHandler.getMutationErrorHandler("Failed to update visit"),
  });
};

export const useDeleteBDVisit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bdVisitsService.remove(id),
    onSuccess: () => {
      invalidateAll(qc);
      showSuccessToast("Visit deleted");
    },
    onError: ErrorHandler.getMutationErrorHandler("Failed to delete visit"),
  });
};

export const useApproveBDVisit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      bdVisitsService.approve(id, notes),
    onSuccess: () => {
      invalidateAll(qc);
      showSuccessToast("Visit approved");
    },
    onError: ErrorHandler.getMutationErrorHandler("Failed to approve visit"),
  });
};

export const useRejectBDVisit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      bdVisitsService.reject(id, reason),
    onSuccess: () => {
      invalidateAll(qc);
      showSuccessToast("Visit rejected");
    },
    onError: ErrorHandler.getMutationErrorHandler("Failed to reject visit"),
  });
};

export const useCheckInVisit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      lat,
      lng,
      accuracy_m,
    }: {
      id: string;
      lat?: number;
      lng?: number;
      accuracy_m?: number;
    }) => bdVisitsService.checkIn(id, { lat, lng, accuracy_m }),
    onSuccess: () => {
      invalidateAll(qc);
      showSuccessToast("Checked in");
    },
    onError: ErrorHandler.getMutationErrorHandler("Check-in failed"),
  });
};

export const useCheckOutVisit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string;
      outcome?: string;
      outcome_notes?: string;
      next_action?: string;
      next_action_at?: string;
      lat?: number;
      lng?: number;
    }) => bdVisitsService.checkOut(id, payload),
    onSuccess: () => {
      invalidateAll(qc);
      showSuccessToast("Visit completed");
    },
    onError: ErrorHandler.getMutationErrorHandler("Check-out failed"),
  });
};
