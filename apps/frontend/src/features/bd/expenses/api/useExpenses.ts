import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { expensesService } from "@/lib/api/services/expenses.service";
import { ErrorHandler, showSuccessToast } from "@/lib/error-handler";
import type { ExpenseCreateData, ExpenseFilters } from "../types";

export const useExpenses = (filters: ExpenseFilters = {}) =>
  useQuery({
    queryKey: ["expenses", filters],
    queryFn: () => expensesService.list(filters),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

export const useExpense = (id: string) =>
  useQuery({
    queryKey: ["expenses", id],
    queryFn: () => expensesService.get(id),
    enabled: !!id,
  });

export const useExpenseSummary = () =>
  useQuery({
    queryKey: ["expenses", "summary"],
    queryFn: () => expensesService.summary(),
    staleTime: 60_000,
  });

export const usePendingExpenseApprovals = () =>
  useQuery({
    queryKey: ["expenses", "pending-approvals"],
    queryFn: () => expensesService.pendingApprovals(),
    staleTime: 30_000,
  });

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["expenses"] });
}

export const useCreateExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ExpenseCreateData) => expensesService.create(data),
    onSuccess: () => { invalidate(qc); showSuccessToast("Expense created"); },
    onError: ErrorHandler.getMutationErrorHandler("Failed to create expense"),
  });
};

export const useUpdateExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExpenseCreateData> }) =>
      expensesService.update(id, data),
    onSuccess: () => { invalidate(qc); showSuccessToast("Expense updated"); },
    onError: ErrorHandler.getMutationErrorHandler("Failed to update expense"),
  });
};

export const useDeleteExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expensesService.remove(id),
    onSuccess: () => { invalidate(qc); showSuccessToast("Expense deleted"); },
    onError: ErrorHandler.getMutationErrorHandler("Failed to delete expense"),
  });
};

export const useSubmitExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expensesService.submit(id),
    onSuccess: () => { invalidate(qc); showSuccessToast("Expense submitted"); },
    onError: ErrorHandler.getMutationErrorHandler("Failed to submit expense"),
  });
};

export const useApproveExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      expensesService.approve(id, notes),
    onSuccess: () => { invalidate(qc); showSuccessToast("Expense approved"); },
    onError: ErrorHandler.getMutationErrorHandler("Failed to approve expense"),
  });
};

export const useRejectExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      expensesService.reject(id, reason),
    onSuccess: () => { invalidate(qc); showSuccessToast("Expense rejected"); },
    onError: ErrorHandler.getMutationErrorHandler("Failed to reject expense"),
  });
};

export const useReimburseExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reference }: { id: string; reference?: string }) =>
      expensesService.reimburse(id, reference),
    onSuccess: () => { invalidate(qc); showSuccessToast("Marked reimbursed"); },
    onError: ErrorHandler.getMutationErrorHandler("Failed to mark reimbursed"),
  });
};
