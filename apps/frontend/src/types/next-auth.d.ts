import NextAuth from "next-auth";

declare module "next-auth" {
    interface Session {
        accessToken?: string;
        // refreshToken is intentionally NOT exposed on the client session — it
        // lives only in the encrypted JWT and is used server-side in the jwt
        // callback to mint new access tokens.
        /** Set to "RefreshAccessTokenError" when a silent token refresh failed. */
        error?: string;
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
        /** Epoch ms when the current access token expires (decoded from its exp claim). */
        accessTokenExpires?: number;
        /** Set to "RefreshAccessTokenError" when a silent token refresh failed. */
        error?: string;
        id?: string;
        role?: string;
        tenantId?: string;
        permissions?: string[];
        industry?: string;
        modules?: Record<string, boolean>;
    }
}
