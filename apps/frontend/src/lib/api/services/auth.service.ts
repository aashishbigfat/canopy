import { apiClient } from '../client';

export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    token: string;
    new_password: string;
}

export interface AuthResponse {
    error: boolean;
    message: string;
}

export const authService = {
    async forgotPassword(data: ForgotPasswordRequest): Promise<AuthResponse> {
        const response = await apiClient.post<AuthResponse>('auth/password-reset', data);
        return response.data;
    },

    async resetPassword(data: ResetPasswordRequest): Promise<AuthResponse> {
        const response = await apiClient.post<AuthResponse>('auth/password-reset/confirm', data);
        return response.data;
    },
};
