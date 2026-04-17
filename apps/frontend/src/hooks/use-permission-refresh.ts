"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useCallback } from "react";
import { getApiBaseUrlNoSlash } from "@/lib/env";

/**
 * Polls the backend every 60 seconds for fresh permissions.
 * If permissions have changed (admin updated the user's role),
 * updates the NextAuth session in-place so the UI reacts immediately
 * without requiring logout/login.
 */
export function usePermissionRefresh(intervalMs: number = 60_000) {
    const { data: session, update } = useSession();
    const prevPermissions = useRef<string | null>(null);

    const refreshPermissions = useCallback(async () => {
        if (!session?.accessToken) return;

        try {
            // /auth/me is at the root level (no /api/v1 prefix)
            const baseUrl = getApiBaseUrlNoSlash().replace(/\/api\/v1$/, "");
            const res = await fetch(`${baseUrl}/auth/me`, {
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                },
            });

            if (!res.ok) return;

            const data = await res.json();
            const freshPermissions: string[] = data.permissions || [];

            // Compare with current session permissions
            const currentHash = JSON.stringify(((session.user as any)?.permissions as string[] || []).sort());
            const freshHash = JSON.stringify(freshPermissions.sort());

            if (currentHash !== freshHash) {
                // Permissions changed — update session
                await update({
                    ...session,
                    user: {
                        ...session.user,
                        permissions: freshPermissions,
                    },
                });
                // Store new state
                prevPermissions.current = freshHash;
            }
        } catch {
            // Silently fail — don't disrupt user experience
        }
    }, [session?.accessToken, (session?.user as any)?.permissions, update]);

    useEffect(() => {
        if (!session?.accessToken) return;

        // Initial check after mount (with a small delay)
        const initialTimeout = setTimeout(refreshPermissions, 5_000);

        // Set up polling
        const interval = setInterval(refreshPermissions, intervalMs);

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(interval);
        };
    }, [session?.accessToken, intervalMs, refreshPermissions]);
}
