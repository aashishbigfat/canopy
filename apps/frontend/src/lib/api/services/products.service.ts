import { apiClient } from "@/lib/api/client";

const BASE_URL = "/products";

export interface Product {
    id: string;
    name: string;
    product_code?: string;
    description?: string;
    category?: string;
    unit_price?: number;
    cost_price?: number;
    currency?: string;
    unit?: string;
    tax_rate?: number;
    is_active: boolean;
    is_featured: boolean;
    image_url?: string;
    created_at: string;
    updated_at: string;
}

export interface ProductListResponse {
    products: Product[];
    total: number;
}

export interface ProductCreateData {
    name: string;
    product_code?: string;
    description?: string;
    category?: string;
    unit_price?: number;
    cost_price?: number;
    currency?: string;
    unit?: string;
    tax_rate?: number;
    is_active?: boolean;
    is_featured?: boolean;
    image_url?: string;
}

export const productsService = {
    getProducts: async (params?: {
        category?: string;
        is_active?: boolean;
        is_featured?: boolean;
        skip?: number;
        limit?: number
    }): Promise<ProductListResponse> => {
        const response = await apiClient.get<ProductListResponse>(BASE_URL, { params });
        return response.data;
    },

    getProduct: async (id: string): Promise<Product> => {
        const response = await apiClient.get<Product>(`${BASE_URL}/${id}`);
        return response.data;
    },

    createProduct: async (data: ProductCreateData): Promise<Product> => {
        const response = await apiClient.post<Product>(BASE_URL, data);
        return response.data;
    },

    updateProduct: async (id: string, data: Partial<ProductCreateData>): Promise<Product> => {
        const response = await apiClient.put<Product>(`${BASE_URL}/${id}`, data);
        return response.data;
    },

    deleteProduct: async (id: string): Promise<void> => {
        await apiClient.delete(`${BASE_URL}/${id}`);
    },

    searchProducts: async (query: string): Promise<ProductListResponse> => {
        const response = await apiClient.get<ProductListResponse>(`${BASE_URL}/search`, {
            params: { query }
        });
        return response.data;
    },
};
