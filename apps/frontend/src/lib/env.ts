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

const LOCAL_API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const REMOTE_API_BASE = process.env.NEXT_PUBLIC_REMOTE_API_URL ?? "http://localhost:8000/api/v1";

const STORAGE_KEY = "tutterfly_api_target"; // "local" | "remote"

function normalise(url: string): string {
    return (url || "").replace(/\/$/, "");
}

function isValidBase(url: string): boolean {
    const n = normalise(url);
    return n !== "" && n !== "undefined" && !n.includes(":3000");
}

/**
 * Returns the API base URL (no trailing slash).
 * Works on both server and client.
 */
function getBaseNoSlash(): string {
    // ── Server-side: Always use the Primary Env Var ──────────────────────────
    if (typeof window === "undefined") {
        return normalise(LOCAL_API_BASE);
    }

    // ── Client-side: Check for optional debug switch ─────────────────────────
    const params = new URLSearchParams(window.location.search);
    const qp = params.get("apiUrl");

    if (qp === "remote") {
        localStorage.setItem(STORAGE_KEY, "remote");
        // Remove the param from URL to keep it clean
        const url = new URL(window.location.href);
        url.searchParams.delete("apiUrl");
        window.history.replaceState({}, "", url.toString());
    } else if (qp === "local") {
        localStorage.removeItem(STORAGE_KEY);
        const url = new URL(window.location.href);
        url.searchParams.delete("apiUrl");
        window.history.replaceState({}, "", url.toString());
    }

    const target = localStorage.getItem(STORAGE_KEY);
    const base = target === "remote" ? REMOTE_API_BASE : LOCAL_API_BASE;

    return normalise(base);
}

export const API_BASE_URL = getBaseNoSlash() + "/";

/** Base URL without trailing slash */
export function getApiBaseUrlNoSlash(): string {
    return getBaseNoSlash();
}

/** Convenience: which backend is currently active? ("local" | "remote") */
export function getActiveBackendTarget(): "local" | "remote" {
    if (typeof window === "undefined") return "local";
    return (localStorage.getItem(STORAGE_KEY) as "local" | "remote") ?? "local";
}
