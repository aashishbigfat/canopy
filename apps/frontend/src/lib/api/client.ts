import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getSession, signOut } from 'next-auth/react';
import { API_BASE_URL } from '@/lib/env';
import { toast } from 'sonner';

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Get auth headers for server-side requests
 */
export const getAuthHeaders = (accessToken?: string) => {
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};

// Request Interceptor: Attach Token and fix path resolution
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    // Strip leading slash from URL to ensure it correctly appends to baseURL
    if (config.url?.startsWith('/')) {
        config.url = config.url.substring(1);
    }

    if (typeof window !== 'undefined') {
        const session = await getSession();
        if (session?.accessToken) {
            config.headers.Authorization = `Bearer ${session.accessToken}`;
        }
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response Interceptor: Handle 401 (expired backend token)
//
// The backend JWT has a fixed expiry and there is no /auth/refresh endpoint.
// When the token expires, every API call returns 401. Rather than auto-signing
// out (which is disruptive during HMR / hot-reload), we show a single toast
// warning and let the user manually re-login.
let has401Warned = false;

apiClient.interceptors.response.use(
    (response) => {
        // A successful authenticated response means the token is valid;
        // reset the warning flag so future expirations are caught.
        if (has401Warned) has401Warned = false;
        return response;
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (typeof window === 'undefined') {
                return Promise.reject(error);
            }

            originalRequest._retry = true;

            try {
                // Re-fetch the session — if it was updated externally the new
                // token may work.
                const session = await getSession();
                if (session?.accessToken) {
                    const oldToken = originalRequest.headers?.Authorization;
                    const newBearer = `Bearer ${session.accessToken}`;
                    if (oldToken !== newBearer) {
                        // Token changed — retry with the new one
                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization = newBearer;
                        }
                        return apiClient(originalRequest);
                    }
                }

                // Token is the same → expired. Show warning ONCE.
                if (!has401Warned) {
                    has401Warned = true;
                    toast.error("Session expired — please log in again.", {
                        duration: 10000,
                        action: {
                            label: "Log in",
                            onClick: () => signOut({ callbackUrl: '/login' }),
                        },
                    });
                }
            } catch {
                // getSession itself failed — silently reject
            }
        } else if (error.response?.status === 403) {
            if (typeof window !== 'undefined') {
                toast.warning("Access Denied: You do not have permission for this resource.");
            }
        }

        return Promise.reject(error);
    }
);

