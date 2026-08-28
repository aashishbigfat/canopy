const STORAGE_KEY = "opportunities_hierarchy_scope";
const COOKIE_NAME = "opportunities_hierarchy_scope";

/** Sync so server components can read scope via cookies(). */
function setCookie(value: boolean) {
    if (typeof document === "undefined") return;
    const v = value ? "1" : "0";
    document.cookie = `${COOKIE_NAME}=${v}; path=/; max-age=31536000; SameSite=Lax`;
}

export function getOpportunitiesHierarchyScope(): boolean {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function setOpportunitiesHierarchyScope(enabled: boolean) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    setCookie(enabled);
}

/** Call once on dashboard mount so cookie matches localStorage after login. */
export function syncOpportunitiesHierarchyScopeCookie() {
    if (typeof window === "undefined") return;
    const v = window.localStorage.getItem(STORAGE_KEY) === "1";
    document.cookie = `${COOKIE_NAME}=${v ? "1" : "0"}; path=/; max-age=31536000; SameSite=Lax`;
}
