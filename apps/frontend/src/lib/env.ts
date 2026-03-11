/**
 * Central env for API base URL.
 *
 * TWO backends are supported:
 *   - Local:  NEXT_PUBLIC_API_URL        (default, e.g. http://localhost:8000/api/v1)
 *   - Remote: NEXT_PUBLIC_REMOTE_API_URL (deployed, e.g. http://15.206.79.199:8000/api/v1)
 *
 * How to switch (client-side only):
 *   ?apiUrl=remote   → switches to the deployed backend and persists choice in localStorage
 *   ?apiUrl=local    → switches back to local backend
 *   No param         → uses whatever was persisted, falling back to NEXT_PUBLIC_API_URL
 *
 * Server-side (SSR) always uses NEXT_PUBLIC_API_URL (no localStorage available).
 */

const LOCAL_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const REMOTE_API_BASE = "/api/v1";

const STORAGE_KEY = "tutterfly_api_target"; // "local" | "remote" | "auto"

function normalise(url: string): string {
    let n = (url || "").trim();
    if (!n) return "";
    // Remove trailing slash
    n = n.replace(/\/$/, "");
    // Ensure it ends in /api/v1 if it doesn't already
    if (!n.endsWith("/api/v1") && !n.includes("/api/v1/")) {
        n = `${n}/api/v1`;
    }
    return n;
}

/**
 * Returns the API base URL (no trailing slash).
 * Works on both server and client.
 */
function getBaseNoSlash(): string {
    // ── Server-side Logic (SSR) ──────────────────────────────────────────────
    if (typeof window === "undefined") {
        const isProd = process.env.NODE_ENV === "production";
        const isVercel = !!process.env.VERCEL || !!process.env.NEXT_PUBLIC_VERCEL_URL;

        // On Vercel or in Production builds, default to REMOTE unless explicitly 
        // overridden by NEXT_PUBLIC_API_URL pointing to localhost.
        if (isVercel || isProd) {
            return normalise(REMOTE_API_BASE);
        }
        return normalise(LOCAL_API_BASE);
    }

    // ── Client-side Logic: Automatic Detection ──────────────────────────────
    const hostname = window.location.hostname;
    const params = new URLSearchParams(window.location.search);
    const qp = params.get("apiUrl");

    // Manual override via query param
    if (qp === "remote") {
        localStorage.setItem(STORAGE_KEY, "remote");
    } else if (qp === "local") {
        localStorage.setItem(STORAGE_KEY, "local");
    } else if (qp === "auto") {
        localStorage.removeItem(STORAGE_KEY);
    }

    // Cleanup URL if params were used
    if (qp) {
        const url = new URL(window.location.href);
        url.searchParams.delete("apiUrl");
        window.history.replaceState({}, "", url.toString());
    }

    const savedTarget = localStorage.getItem(STORAGE_KEY);

    // 1. If explicitly set to remote, use remote
    if (savedTarget === "remote") return normalise(REMOTE_API_BASE);
    // 2. If explicitly set to local, use local
    if (savedTarget === "local") return normalise(LOCAL_API_BASE);

    // 3. Auto-detection (default)
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
    if (isLocal) {
        return normalise(LOCAL_API_BASE);
    } else {
        // If we are on an IP or a real domain, assume remote
        return normalise(REMOTE_API_BASE);
    }
}

export const API_BASE_URL = getBaseNoSlash() + "/";

/** Base URL without trailing slash */
export function getApiBaseUrlNoSlash(): string {
    return getBaseNoSlash();
}

/** Which backend is currently active? */
export function getActiveBackendTarget(): string {
    if (typeof window === "undefined") return "server-default";
    const hostname = window.location.hostname;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
    return (hostname === "localhost" || hostname === "127.0.0.1") ? "local (auto)" : "remote (auto)";
}
