import NextAuth from "next-auth";

declare module "next-auth" {
    interface Session {
        accessToken?: string;
        refreshToken?: string;
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            role?: string;
            tenantId?: string;
            permissions?: string[];
            industry?: string;
            modules?: Record<string, boolean>;
        };
    }

    interface User {
        id: string;
        name?: string;
        email?: string;
        role?: string;
        tenantId?: string;
        accessToken?: string;
        refreshToken?: string;
        permissions?: string[];
        industry?: string;
        modules?: Record<string, boolean>;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken?: string;
        refreshToken?: string;
        id?: string;
        role?: string;
        tenantId?: string;
        permissions?: string[];
        industry?: string;
        modules?: Record<string, boolean>;
    }
}
