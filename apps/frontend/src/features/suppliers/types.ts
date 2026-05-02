import { PaginatedResponse } from "@/lib/api/types";

export interface Supplier {
    id: string;
    name: string;
    company_name?: string;
    supplier_type: string;

    email?: string;
    phone?: string;
    mobile?: string;
    website?: string;
    
    // Service Areas
    services?: string[];
    countries?: string[];
    states?: string[];
    destinations?: string[];

    // Address
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;

    // Contact Person
    contact_person_name?: string;
    contact_person_email?: string;
    contact_person_phone?: string;

    // Finance
    payment_terms?: string;
    credit_limit?: number;

    // Metadata
    is_preferred: boolean;
    is_active: boolean;
    rating?: number;
    notes?: string;

    owner_id: string;
    tenant_id: string;
    created_at: string;
    updated_at: string;
}

export interface SupplierCreateData {
    name: string;
    supplier_type: string;
    owner_id?: string;
    email?: string;
    phone?: string;
    // ... other optional fields matching SupplierBase
}

export interface SupplierFilters {
    page?: number;
    per_page?: number;
    search?: string;
    supplier_type?: string;
    is_preferred?: boolean;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}
export type SupplierResponse = {
    suppliers: Supplier[];
    total: number;
    page: number;
    per_page: number;
    pages: number;
};

export interface SupplierContact {
    id: string;
    supplier_id: string;
    name: string;
    designation?: string;
    department?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    is_primary: boolean;
    is_active: boolean;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface SupplierContactCreateData {
    name: string;
    designation?: string;
    department?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    is_primary?: boolean;
    notes?: string;
}
