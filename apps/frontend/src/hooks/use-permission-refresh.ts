"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { getApiBaseUrlNoSlash } from "@/lib/env";

/**
 * Polls the backend for fresh permissions at the given interval.
 * If permissions have changed (admin updated the user's role),
 * updates the NextAuth session in-place so the UI reacts immediately
 * without requiring logout/login.
 *
 * IMPORTANT: All session values are accessed through refs to prevent
 * the callback from being recreated on every session change (which
 * would cause an infinite update → re-render → update loop).
 */
export function usePermissionRefresh(intervalMs: number = 60_000) {
    const { data: session, update } = useSession();

    // Use refs to avoid recreating the callback when session changes
    const sessionRef = useRef(session);
    const updateRef = useRef(update);
    const isUpdatingRef = useRef(false);

    // Keep refs current without causing re-renders
    useEffect(() => {
        sessionRef.current = session;
        updateRef.current = update;
    }, [session, update]);

    useEffect(() => {
        // Don't start polling until we have a valid session
        if (!session?.accessToken) return;

        const refreshPermissions = async () => {
            // Prevent overlapping calls
            if (isUpdatingRef.current) return;

            const currentSession = sessionRef.current;
            if (!currentSession?.accessToken) return;

            try {
                const baseUrl = getApiBaseUrlNoSlash().replace(/\/api\/v1$/, "");
                const res = await fetch(`${baseUrl}/auth/me`, {
                    headers: {
                        Authorization: `Bearer ${currentSession.accessToken}`,
                    },
                });

                if (!res.ok) return;

                const data = await res.json();
                const freshPermissions: string[] = data.permissions || [];

                // Compare with current session permissions
                const currentPerms = (currentSession.user as any)?.permissions as string[] || [];
                const currentHash = JSON.stringify([...currentPerms].sort());
                const freshHash = JSON.stringify([...freshPermissions].sort());

                if (currentHash !== freshHash) {
                    isUpdatingRef.current = true;
                    try {
                        await updateRef.current({
                            ...currentSession,
                            user: {
                                ...currentSession.user,
                                permissions: freshPermissions,
                            },
                        });
                    } finally {
                        // Delay reset to prevent immediate re-trigger
                        setTimeout(() => {
                            isUpdatingRef.current = false;
                        }, 5_000);
                    }
                }
            } catch {
                // Silently fail — don't disrupt user experience
            }
        };

        // Initial check after mount (delay to let the page settle)
        const initialTimeout = setTimeout(refreshPermissions, 10_000);

        // Set up polling at the specified interval
        const interval = setInterval(refreshPermissions, intervalMs);

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(interval);
        };
        // Only re-create effect when accessToken or interval changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.accessToken, intervalMs]);
}
