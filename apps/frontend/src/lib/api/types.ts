import { DefaultSession } from "next-auth";

export interface ApiResponse<T = unknown> {
    data: T;
    message?: string;
    status: number;
}

export interface PaginatedResponse<T> extends ApiResponse {
    data: T[];
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}

// Extend NextAuth types to include accessToken
declare module "next-auth" {
    interface Session {
        accessToken?: string;
        user: {
            id: string;
            role?: string;
        } & DefaultSession["user"];
    }

    interface User {
        id: string;
        accessToken?: string;
        role?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken?: string;
        role?: string;
        id?: string;
    }
}
