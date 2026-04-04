import { apiClient } from "@/lib/api/client";

const BASE = "/opportunities";

export interface CostingLineItem {
    item_type: string;
    supplier_id?: string;
    supplier_name?: string;
    destination_ids: string[];
    destination_names: string[];
    amount: number;
    cost_amount: number;
}

export interface CostingData {
    id?: string;
    opportunity_id: string;
    tenant_id: string;
    selected_item_types: string[];
    items: CostingLineItem[];
    total_amount: number;
    total_cost: number;
    profit: number;
    profit_percent: number;
    created_at?: string;
    updated_at?: string;
}

export interface PaymentScheduleItem {
    id: string;
    opportunity_id: string;
    tenant_id: string;
    description?: string;
    due_date?: string;
    amount: number;
    status: "Pending" | "Received";
    payment_method?: string;
    reference_number?: string;
    notes?: string;
    paid_at?: string;
    transaction_id?: string;
    created_at?: string;
    updated_at?: string;
}

export interface PaymentScheduleItemCreate {
    description?: string;
    due_date?: string;
    amount: number;
    status?: string;
    payment_method?: string;
    reference_number?: string;
    notes?: string;
}

// ── Transaction types ────────────────────────────────────────────────────────

export interface Transaction {
    id: string;
    opportunity_id: string;
    tenant_id: string;
    transaction_type: "Receive" | "Pay" | "Refund";
    amount: number;
    transaction_date?: string;
    payment_mode?: string;
    reference_id?: string;
    supplier?: string;
    service?: string;
    destination?: string;
    note?: string;
    payment_schedule_item_id?: string;
    created_at?: string;
    updated_at?: string;
}

export interface TransactionCreate {
    transaction_type: "Receive" | "Pay" | "Refund";
    amount: number;
    transaction_date?: string;
    payment_mode?: string;
    reference_id?: string;
    supplier?: string;
    service?: string;
    destination?: string;
    note?: string;
}

export interface TransactionUpdate {
    amount?: number;
    transaction_date?: string;
    payment_mode?: string;
    reference_id?: string;
    supplier?: string;
    service?: string;
    destination?: string;
    note?: string;
}

export const financialService = {
    // ── Tenant Financial Config ───────────────────────────────────────────────
    getFinancialConfig: async (): Promise<{ default_tax_misc_supplier: string }> => {
        const res = await apiClient.get<{ default_tax_misc_supplier: string }>(
            `/opportunities/financial-config`
        );
        return res.data;
    },

    // ── Costing ──────────────────────────────────────────────────────────────
    getCosting: async (opportunityId: string): Promise<CostingData> => {
        const res = await apiClient.get<CostingData>(
            `${BASE}/${opportunityId}/costing`
        );
        return res.data;
    },

    upsertCosting: async (
        opportunityId: string,
        data: { selected_item_types: string[]; items: CostingLineItem[] }
    ): Promise<CostingData> => {
        const res = await apiClient.post<CostingData>(
            `${BASE}/${opportunityId}/costing`,
            data
        );
        return res.data;
    },

    getCostingItemTypes: async (opportunityId: string): Promise<{ item_types: string[]; fixed_item_types: string[] }> => {
        const res = await apiClient.get<{ item_types: string[]; fixed_item_types: string[] }>(
            `${BASE}/${opportunityId}/costing/item-types`
        );
        return res.data;
    },

    getCostingDestinations: async (opportunityId: string): Promise<{ id: string; name: string }[]> => {
        const res = await apiClient.get<{ destinations: { id: string; name: string }[] }>(
            `${BASE}/${opportunityId}/costing/destinations`
        );
        return res.data.destinations;
    },

    // ── Payment Schedule ─────────────────────────────────────────────────────
    getPaymentSchedule: async (
        opportunityId: string
    ): Promise<PaymentScheduleItem[]> => {
        const res = await apiClient.get<PaymentScheduleItem[]>(
            `${BASE}/${opportunityId}/payment-schedule`
        );
        return res.data;
    },

    createPaymentScheduleItem: async (
        opportunityId: string,
        data: PaymentScheduleItemCreate
    ): Promise<PaymentScheduleItem> => {
        const res = await apiClient.post<PaymentScheduleItem>(
            `${BASE}/${opportunityId}/payment-schedule`,
            data
        );
        return res.data;
    },

    updatePaymentScheduleItem: async (
        opportunityId: string,
        itemId: string,
        data: Partial<PaymentScheduleItemCreate> & {
            status?: string;
            paid_at?: string;
            payment_method?: string;
            reference_number?: string;
            notes?: string;
        }
    ): Promise<PaymentScheduleItem> => {
        const res = await apiClient.put<PaymentScheduleItem>(
            `${BASE}/${opportunityId}/payment-schedule/${itemId}`,
            data
        );
        return res.data;
    },

    deletePaymentScheduleItem: async (
        opportunityId: string,
        itemId: string
    ): Promise<void> => {
        await apiClient.delete(
            `${BASE}/${opportunityId}/payment-schedule/${itemId}`
        );
    },

    // ── Transactions ─────────────────────────────────────────────────────────
    getTransactions: async (
        opportunityId: string
    ): Promise<Transaction[]> => {
        const res = await apiClient.get<Transaction[]>(
            `${BASE}/${opportunityId}/transactions`
        );
        return res.data;
    },

    createTransaction: async (
        opportunityId: string,
        data: TransactionCreate
    ): Promise<Transaction> => {
        const res = await apiClient.post<Transaction>(
            `${BASE}/${opportunityId}/transactions`,
            data
        );
        return res.data;
    },

    updateTransaction: async (
        opportunityId: string,
        txnId: string,
        data: TransactionUpdate
    ): Promise<Transaction> => {
        const res = await apiClient.put<Transaction>(
            `${BASE}/${opportunityId}/transactions/${txnId}`,
            data
        );
        return res.data;
    },
};
