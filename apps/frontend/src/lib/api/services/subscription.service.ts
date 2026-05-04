/**
 * Phase 15 — Subscription / billing.
 */
import { apiClient } from "@/lib/api/client";

const BASE = "/subscription";

export interface Plan {
  id: string;
  name: string;
  amount: number;
  interval?: string;
  currency?: string;
}

export const subscriptionService = {
  listProducts: async () => (await apiClient.get(`${BASE}/products`)).data,
  createProduct: async (payload: { name: string; description?: string; is_active?: boolean }) =>
    (await apiClient.post(`${BASE}/products`, payload)).data,
  createPlan: async (payload: any) => (await apiClient.post(`${BASE}/plans`, payload)).data,
  plansByProduct: async (productId: string) =>
    (await apiClient.get(`${BASE}/plans/by-product/${productId}`)).data,
  getPlan: async (planId: string): Promise<Plan> =>
    (await apiClient.get(`${BASE}/plans/${planId}`)).data,
  createCustomerSubscription: async (payload: any) =>
    (await apiClient.post(`${BASE}/customer-subscriptions`, payload)).data,
  createSubExisting: async (payload: any) =>
    (await apiClient.post(`${BASE}/subscriptions/existing-user`, payload)).data,
  checkoutDetails: async (payload: any) =>
    (await apiClient.post(`${BASE}/subscriptions/checkout-details`, payload)).data,
  triggerUpdate: async () =>
    (await apiClient.get(`${BASE}/subscriptions/update`)).data,
  triggerUpgrade: async () =>
    (await apiClient.get(`${BASE}/subscriptions/upgrade`)).data,
  checkUserExists: async (email: string) =>
    (await apiClient.post(`${BASE}/check-user`, { email })).data,
  exceptions: async () => (await apiClient.get(`${BASE}/check-exception`)).data,
  existingUsers: async () => (await apiClient.get(`${BASE}/existing-users`)).data,
  tenantStatus: async () => (await apiClient.get(`${BASE}/tenant-status`)).data,
  userPlanModules: async (productId: string) =>
    (await apiClient.get(`${BASE}/user-plan-modules/${productId}`)).data,
  billingSummary: async () => (await apiClient.get(`${BASE}/billing-summary`)).data,
};
