/**
 * Central env for API base URL. Use this everywhere (client + server) so
 * requests always go to the backend, never to the frontend origin.
 * Set NEXT_PUBLIC_API_URL in .env / .env.local (e.g. http://localhost:8000/api/v1).
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
