import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { apiClient } from "@/lib/api/client";
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

                try {
                    const { data } = await apiClient.post('/auth/login', {
                        email: credentials.email,
                        password: credentials.password,
                    });

                    if (data.access_token) {
                        return {
                            id: data.user.id,
                            name: data.user.name,
                            email: data.user.email,
                            accessToken: data.access_token,
                            refreshToken: data.refresh_token,
                            role: data.user.role_ids?.[0], // Taking first role for now
                            tenantId: data.user.tenant_id,
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
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
};
