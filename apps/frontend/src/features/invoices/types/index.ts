import { PaginatedResponse } from "@/lib/api/types";

export interface InvoiceItem {
    id: string;
    name: string;
    description?: string;
    quantity: number;
    unit_price: number;
    total: number;
    invoice_id: string;
}

export interface Payment {
    id: string;
    amount: number;
    payment_date?: string;
    payment_method: string;
    reference_number?: string;
    notes?: string;
    invoice_id: string;
    created_at: string;
}

export interface Invoice {
    id: string;
    invoice_number: string;
    name: string;

    quote_id?: string;
    opportunity_id?: string;
    contact_id?: string;
    account_id?: string;

    due_date?: string;
    currency: string;
    status: string;
    invoice_date: string;

    // Financials
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total: number;
    amount_paid: number;
    balance_due: number; // Important

    owner_id: string;
    tenant_id: string;
    created_at: string;
    updated_at: string;
}

export interface InvoiceDetail extends Invoice {
    items: InvoiceItem[];
    payments: Payment[];
}

export interface InvoiceCreateData {
    name: string;
    quote_id?: string;
    items: Partial<InvoiceItem>[];
    // ... others
}

export interface InvoiceFilters {
    page?: number;
    per_page?: number;
    search?: string;
    status?: 'draft' | 'sent' | 'paid' | 'overdue';
}

export type InvoiceResponse = PaginatedResponse<Invoice>;
