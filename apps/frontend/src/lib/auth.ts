import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getApiBaseUrlNoSlash } from "@/lib/env";
import { logger } from "@/lib/logger";

export const authOptions: NextAuthOptions = {
    secret: process.env.NEXTAUTH_SECRET,
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
                industry: { label: "Industry", type: "text" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password || !credentials?.industry) return null;

                // The backend has an alias for /auth/login at the root domain.
                // We strip out the "/api/v1" suffix from the base URL so we hit the root.
                const baseUrl = getApiBaseUrlNoSlash().replace(/\/api\/v1$/, "");
                const backendUrl = `${baseUrl}/auth/login`;
                try {
                    const res = await fetch(backendUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password,
                            industry: credentials.industry,
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
        maxAge: 7 * 24 * 60 * 60, // 7 days (aligned with backend ACCESS_TOKEN_EXPIRE_MINUTES)
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
    logger: {
        error(code, metadata) {
            if (code === "JWT_SESSION_ERROR") {
                // NextAuth uses console.error by default, which triggers the Next.js error overlay.
                // We log it as a warning instead to prevent the dev overlay from crashing the screen.
                console.warn(`[NextAuth] Session invalid or expired (decryption failed)`);
            } else {
                console.error(`[NextAuth] ${code}`, metadata);
            }
        },
        warn(code) {
            console.warn(`[NextAuth] ${code}`);
        },
        debug(code, metadata) {
            console.debug(`[NextAuth] ${code}`, metadata);
        }
    }
};
