/**
 * Module-flag gating for industry-vertical pages.
 *
 * Mirrors the backend's `require_module(...)` middleware that protects the
 * industry routers. A travel-only tenant must not see /patients, /providers,
 * etc. — both because the API would 403 and (more importantly for UX) because
 * the page itself shouldn't render.
 *
 * Source of truth for module names lives in
 * apps/backend/app/constants/industry_registry.py — INDUSTRY_MODULE_DEFAULTS.
 */
const MODULE_RULES: { prefix: string; module: string }[] = [
    // Healthcare
    { prefix: "/patients", module: "patients" },
    { prefix: "/providers", module: "providers" },
    { prefix: "/appointments", module: "appointments" },
    { prefix: "/care-plans", module: "care_plans" },
    { prefix: "/referrals", module: "referrals" },
    { prefix: "/insurance-verifications", module: "insurance" },

    // Education
    { prefix: "/programs", module: "programs" },
    { prefix: "/admissions", module: "admissions" },
    { prefix: "/enrollments", module: "enrollments" },

    // Manufacturing
    { prefix: "/boms", module: "bom" },
    { prefix: "/production-orders", module: "production_orders" },
    { prefix: "/work-orders", module: "work_orders" },
    { prefix: "/inventory", module: "inventory" },
    { prefix: "/quality-inspections", module: "quality_inspections" },
    { prefix: "/product-catalog", module: "product_catalog" },

    // Travel
    { prefix: "/destinations", module: "destinations" },
    { prefix: "/itineraries", module: "itineraries" },
    { prefix: "/packages", module: "packages" },
    { prefix: "/departure", module: "departures" },
];

const sortedModuleRules = [...MODULE_RULES].sort((a, b) => b.prefix.length - a.prefix.length);

export function getRouteModule(pathname: string): string | null {
    for (const rule of sortedModuleRules) {
        if (pathname === rule.prefix || pathname.startsWith(rule.prefix + "/")) {
            return rule.module;
        }
    }
    return null;
}

export function hasModule(modules: Record<string, boolean> | undefined, name: string): boolean {
    return !!modules && modules[name] === true;
}
