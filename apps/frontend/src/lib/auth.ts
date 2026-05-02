import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getApiBaseUrlNoSlash } from "@/lib/env";
import { logger } from "@/lib/logger";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                // The backend has an alias for /auth/login at the root domain.
                // We strip out the "/api/v1" suffix from the base URL so we hit the root.
                const baseUrl = getApiBaseUrlNoSlash().replace(/\/api\/v1$/, "");
                const backendUrl = `${baseUrl}/auth/login`;
                console.log("[Auth] Calling backend at", backendUrl);
                try {
                    const res = await fetch(backendUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password,
                        }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                        logger.error("Auth error:", res.status, data);
                        return null;
                    }

                    if (data.access_token) {
                        return {
                            id: data.user.id,
                            name: data.user.name,
                            email: data.user.email,
                            accessToken: data.access_token,
                            refreshToken: data.refresh_token,
                            role: data.user.role_ids?.[0], // Taking first role for now
                            tenantId: data.user.tenant_id,
                            permissions: data.user.permissions || [],
                            industry: data.user.industry || "travel",
                            modules: data.user.modules || {},
                        };
                    }
                    return null;
                } catch (error) {
                    // Log error in development only
                    logger.error("Auth error:", error);
                    return null;
                }
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.accessToken = user.accessToken;
                token.refreshToken = user.refreshToken;
                token.id = user.id;
                token.role = user.role;
                token.tenantId = user.tenantId;
                token.permissions = user.permissions;
                token.industry = user.industry;
                token.modules = user.modules;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.accessToken = token.accessToken as string;
                session.refreshToken = token.refreshToken as string;
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                (session.user as any).tenantId = token.tenantId as string;
                session.user.permissions = token.permissions as string[];
                (session.user as any).industry = token.industry as string;
                (session.user as any).modules = token.modules as Record<string, boolean>;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
};
