import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getSession, signOut } from 'next-auth/react';
import { API_BASE_URL } from '@/lib/env';
import { toast } from 'sonner';

// Token refresh management
let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

const addRefreshSubscriber = (callback: (token: string | null) => void) => {
    refreshSubscribers.push(callback);
};

const onTokenRefreshed = (token: string | null) => {
    refreshSubscribers.forEach(callback => callback(token));
    refreshSubscribers = [];
};

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

    // Diagnostic log
    const fullUrl = config.baseURL ? `${config.baseURL}${config.url}` : config.url;
    console.log(`[API Request] ${config.method?.toUpperCase()} ${fullUrl}`);

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

// Response Interceptor: Handle 401 and Token Refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (typeof window === 'undefined') {
                return Promise.reject(error);
            }

            originalRequest._retry = true;

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    addRefreshSubscriber((token: string | null) => {
                        if (token) {
                            if (originalRequest.headers) {
                                originalRequest.headers.Authorization = `Bearer ${token}`;
                            }
                            resolve(apiClient(originalRequest));
                        } else {
                            reject(new Error('Token refresh failed'));
                        }
                    });
                });
            }

            isRefreshing = true;

            try {
                const session = await getSession();
                if (!session?.refreshToken) {
                    throw new Error('No refresh token available');
                }

                const response = await axios.post(`${API_BASE_URL}auth/refresh`, {
                    refresh_token: session.refreshToken,
                });

                const newAccessToken = response.data.access_token;

                // Update the session with new token
                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                }

                onTokenRefreshed(newAccessToken);

                return apiClient(originalRequest);
            } catch (refreshError) {
                // Refresh failed, notify subscribers and sign out user
                onTokenRefreshed(null);
                
                // Start sign out immediately but do not await to unblock caller
                signOut({ callbackUrl: '/login' });
                
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        } else if (error.response?.status === 403) {
            // Permission denied
            if (typeof window !== 'undefined') {
                toast.warning("Access Denied: You do not have permission for this resource.");
            }
        }

        return Promise.reject(error);
    }
);
