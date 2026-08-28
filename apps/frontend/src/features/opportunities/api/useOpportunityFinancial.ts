import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    financialService,
    CostingLineItem,
    PaymentScheduleItemCreate,
    TransactionCreate,
    TransactionUpdate,
} from "@/lib/api/services/financial.service";

// ── Costing hooks ──────────────────────────────────────────────────────────────

export const useCosting = (opportunityId: string) => {
    return useQuery({
        queryKey: ["opportunities", opportunityId, "costing"],
        queryFn: () => financialService.getCosting(opportunityId),
        enabled: !!opportunityId,
    });
};

export const useUpsertCosting = (opportunityId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            selected_item_types: string[];
            items: CostingLineItem[];
        }) => financialService.upsertCosting(opportunityId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["opportunities", opportunityId, "costing"],
            });
            // Immediately sync visually with the Opportunity form's inclusions
            queryClient.invalidateQueries({
                queryKey: ["opportunities", opportunityId],
            });
            toast.success("Costing saved successfully");
        },
        onError: () => {
            toast.error("Failed to save costing");
        },
    });
};

export const useCostingItemTypes = (opportunityId: string) => {
    return useQuery({
        queryKey: ["costing-item-types"],
        queryFn: () => financialService.getCostingItemTypes(opportunityId),
        staleTime: 10 * 60 * 1000, // 10 min – static list
        enabled: !!opportunityId,
    });
};

// ── Payment Schedule hooks ─────────────────────────────────────────────────────

export const usePaymentSchedule = (opportunityId: string) => {
    return useQuery({
        queryKey: ["opportunities", opportunityId, "payment-schedule"],
        queryFn: () => financialService.getPaymentSchedule(opportunityId),
        enabled: !!opportunityId,
    });
};

export const useCreatePaymentItem = (opportunityId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: PaymentScheduleItemCreate) =>
            financialService.createPaymentScheduleItem(opportunityId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["opportunities", opportunityId, "payment-schedule"],
            });
            toast.success("Payment milestone added");
        },
        onError: () => toast.error("Failed to add payment milestone"),
    });
};

export const useUpdatePaymentItem = (opportunityId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            itemId,
            data,
        }: {
            itemId: string;
            data: Partial<PaymentScheduleItemCreate> & {
                status?: string;
                paid_at?: string;
                payment_method?: string;
                reference_number?: string;
                notes?: string;
            };
        }) => financialService.updatePaymentScheduleItem(opportunityId, itemId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["opportunities", opportunityId, "payment-schedule"],
            });
            // Refresh transactions since Received status creates a transaction
            queryClient.invalidateQueries({
                queryKey: ["opportunities", opportunityId, "transactions"],
            });
            toast.success("Payment milestone updated");
        },
        onError: () => toast.error("Failed to update milestone"),
    });
};

export const useDeletePaymentItem = (opportunityId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (itemId: string) =>
            financialService.deletePaymentScheduleItem(opportunityId, itemId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["opportunities", opportunityId, "payment-schedule"],
            });
            // Also refresh transactions: a Received item deletion cascades to
            // deleting the linked transaction on the backend.
            queryClient.invalidateQueries({
                queryKey: ["opportunities", opportunityId, "transactions"],
            });
            toast.success("Payment milestone deleted");
        },
        onError: () => toast.error("Failed to delete milestone"),
    });
};

// ── Transaction hooks ──────────────────────────────────────────────────────────

export const useTransactions = (opportunityId: string) => {
    return useQuery({
        queryKey: ["opportunities", opportunityId, "transactions"],
        queryFn: () => financialService.getTransactions(opportunityId),
        enabled: !!opportunityId,
    });
};

export const useCreateTransaction = (opportunityId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: TransactionCreate) =>
            financialService.createTransaction(opportunityId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["opportunities", opportunityId, "transactions"],
            });
            toast.success("Transaction created successfully");
        },
        onError: () => toast.error("Failed to create transaction"),
    });
};

export const useUpdateTransaction = (opportunityId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            txnId,
            data,
        }: {
            txnId: string;
            data: TransactionUpdate;
        }) => financialService.updateTransaction(opportunityId, txnId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["opportunities", opportunityId, "transactions"],
            });
            toast.success("Transaction updated successfully");
        },
        onError: () => toast.error("Failed to update transaction"),
    });
};
