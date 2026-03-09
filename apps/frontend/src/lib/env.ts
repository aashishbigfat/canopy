/**
 * Single source for backend API base URL (must include /api/v1).
 *
 * All API calls use this (apiClient baseURL, getApiBaseUrlNoSlash for fetch).
 * Set NEXT_PUBLIC_API_URL in .env / Vercel so every route hits the backend.
 *
 * Optional: NEXT_PUBLIC_REMOTE_API_URL for ?apiUrl=remote (client-side switch).
 * Server-side always uses NEXT_PUBLIC_API_URL.
 */
const FALLBACK_API_BASE = "http://localhost:8000/api/v1";

function getBaseNoSlash(): string {
    const base = process.env.NEXT_PUBLIC_API_URL ?? FALLBACK_API_BASE;
    const normalized = (base || "").replace(/\/$/, "");
    if (normalized.includes(":3000") || normalized === "" || normalized === "undefined") {
        return FALLBACK_API_BASE;
    }
    return normalized;
}

export const API_BASE_URL = getBaseNoSlash() + "/";

/** Base URL without trailing slash, for building paths like `${getApiBaseUrlNoSlash()}/accounts/1` */
export function getApiBaseUrlNoSlash(): string {
    return getBaseNoSlash();
}
