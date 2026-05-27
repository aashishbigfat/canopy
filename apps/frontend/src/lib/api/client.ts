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
// When the token expires every in-flight API call returns 401 at once.
// isSessionExpiring gates the redirect so only one signOut + navigation
// fires regardless of how many concurrent requests fail simultaneously.
let isSessionExpiring = false;

apiClient.interceptors.response.use(
    (response) => {
        // A successful authenticated response means the token is valid — reset gate.
        if (isSessionExpiring) isSessionExpiring = false;
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
                // Re-fetch the session — if it was updated externally the new token may work.
                const session = await getSession();
                if (session?.accessToken) {
                    const oldToken = originalRequest.headers?.Authorization;
                    const newBearer = `Bearer ${session.accessToken}`;
                    if (oldToken !== newBearer) {
                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization = newBearer;
                        }
                        return apiClient(originalRequest);
                    }
                }

                // Token is the same (or missing) → confirmed expired.
                if (!isSessionExpiring) {
                    isSessionExpiring = true;

                    // Clear the NextAuth session cookie in the background — fire-and-forget.
                    // We don't await this; the page is navigating away regardless.
                    signOut({ redirect: false }).catch(() => {});

                    // Replace the current history entry so the back button skips
                    // the expired page and doesn't loop the user back to a broken state.
                    window.location.replace('/login?reason=expired');
                }
            } catch {
                // getSession failed (e.g. auth route temporarily unavailable).
                // Still redirect — better to send the user to login than leave them stuck.
                if (!isSessionExpiring) {
                    isSessionExpiring = true;
                    signOut({ redirect: false }).catch(() => {});
                    window.location.replace('/login?reason=expired');
                }
            }

            // Return a promise that never settles. This prevents the 401 from
            // propagating to the calling component (no "Failed to load" error UI).
            // All pending promises are garbage-collected once the page unloads.
            return new Promise(() => {});
        }

        if (error.response?.status === 403) {
            if (typeof window !== 'undefined' && !(originalRequest as any)._suppressForbiddenToast) {
                toast.warning("Access Denied: You do not have permission for this resource.");
            }
        }

        return Promise.reject(error);
    }
);
