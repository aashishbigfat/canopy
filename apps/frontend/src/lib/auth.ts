import { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { getApiBaseUrlNoSlash } from "@/lib/env";
import { logger } from "@/lib/logger";
import { compressPermissions, decompressPermissions } from "@/lib/permissions-compression";

// Fallback access-token lifetime if the JWT exp can't be decoded. Kept well
// under the 30-day refresh-token / session lifetime so refresh still fires.
const ACCESS_TOKEN_FALLBACK_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Decode a JWT's `exp` claim (seconds) into epoch ms, without verifying it. */
function decodeJwtExpiryMs(jwt?: string): number | null {
    if (!jwt) return null;
    try {
        const payload = jwt.split(".")[1];
        if (!payload) return null;
        const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
        const { exp } = JSON.parse(json);
        return typeof exp === "number" ? exp * 1000 : null;
    } catch {
        return null;
    }
}

/**
 * Exchange the 30-day refresh token for a fresh access token via the backend.
 * On failure (e.g. the refresh token itself expired at the 30-day cap), flags
 * the JWT so the client signs the user out cleanly.
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
    try {
        const baseUrl = getApiBaseUrlNoSlash().replace(/\/api\/v1$/, "");
        const res = await fetch(`${baseUrl}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: token.refreshToken }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.access_token) {
            throw new Error(data?.detail || `Refresh failed (${res.status})`);
        }
        return {
            ...token,
            accessToken: data.access_token,
            accessTokenExpires: decodeJwtExpiryMs(data.access_token) ?? Date.now() + ACCESS_TOKEN_FALLBACK_MS,
            error: undefined,
        };
    } catch (error) {
        logger.error("Token refresh failed:", error);
        // Keep the (stale) token but flag the error so the client can re-login.
        return { ...token, error: "RefreshAccessTokenError" };
    }
}

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
        // 30 days — matches the backend refresh-token lifetime (the hard cap).
        // The 7-day access token is refreshed silently in the jwt callback, so
        // an active user stays signed in for the full 30 days. After that the
        // refresh token expires and the user must log in again.
        maxAge: 30 * 24 * 60 * 60,
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            // 1) Initial sign-in — seed the token + access-token expiry.
            if (user) {
                token.accessToken = user.accessToken;
                token.refreshToken = user.refreshToken;
                token.accessTokenExpires = decodeJwtExpiryMs(user.accessToken) ?? Date.now() + ACCESS_TOKEN_FALLBACK_MS;
                token.id = user.id;
                token.role = user.role;
                token.tenantId = user.tenantId;
                (token as any).permissions = compressPermissions(user.permissions);
                token.industry = user.industry;
                token.modules = user.modules;
                return token;
            }

            // 2) Client-initiated update (e.g. permission/role refresh).
            if (trigger === "update" && session?.user) {
                if (session.user.permissions) {
                    (token as any).permissions = compressPermissions(session.user.permissions);
                }
                if (session.user.role) {
                    token.role = session.user.role;
                }
                if (session.user.industry) {
                    token.industry = session.user.industry;
                }
                if (session.user.modules) {
                    token.modules = session.user.modules;
                }
            }

            // 3) Access token still valid (60s safety buffer) → use as-is.
            if (token.accessTokenExpires && Date.now() < token.accessTokenExpires - 60_000) {
                return token;
            }

            // 4) Expired/near-expiry → silent refresh with the 30-day refresh token.
            if (token.refreshToken) {
                return await refreshAccessToken(token);
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.accessToken = token.accessToken as string;
                // refreshToken intentionally not exposed to the client.
                session.error = token.error;
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                (session.user as any).tenantId = token.tenantId as string;
                (session.user as any).permissions = decompressPermissions((token as any).permissions);
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
