import type { NavItem } from "@/components/layout/nav-items";

/**
 * Maps URL prefixes to a single permission the user must have (from backend roles).
 * Longest prefix wins. Aligns with apps/backend/app/services/role_service.py ALL_PERMISSIONS.
 */
const ROUTE_RULES: { prefix: string; permission: string }[] = [
    { prefix: "/admin/role-management", permission: "view_role" },
    { prefix: "/admin/users", permission: "view_user" },
    { prefix: "/admin/departments", permission: "manage_system" },
    { prefix: "/admin/hierarchies", permission: "manage_system" },
    { prefix: "/admin", permission: "view_user" },
    { prefix: "/person-accounts", permission: "view_contact" },
    { prefix: "/accessflow/opportunities", permission: "view_opportunity" },
    { prefix: "/accounts", permission: "view_account" },
    { prefix: "/contacts", permission: "view_contact" },
    { prefix: "/leads", permission: "view_lead" },
    { prefix: "/suppliers", permission: "view_supplier" },
    { prefix: "/opportunities", permission: "view_opportunity" },
    { prefix: "/tasks", permission: "view_task" },
    { prefix: "/files", permission: "view_file" },
    { prefix: "/itineraries", permission: "view_itinerary" },
    { prefix: "/reports", permission: "view_reports" },
    { prefix: "/events", permission: "view_event" },
    { prefix: "/products", permission: "view_product" },
    { prefix: "/quotes", permission: "view_quote" },
    { prefix: "/notifications", permission: "manage_notifications" },
    { prefix: "/search", permission: "view_dashboard" },
    { prefix: "/departure", permission: "view_dashboard" },
    { prefix: "/dashboard", permission: "view_dashboard" },
];

const sortedRules = [...ROUTE_RULES].sort((a, b) => b.prefix.length - a.prefix.length);

export function getRoutePermission(pathname: string): string | null {
    for (const rule of sortedRules) {
        if (pathname === rule.prefix || pathname.startsWith(rule.prefix + "/")) {
            return rule.permission;
        }
    }
    return null;
}

export function hasPermission(userPermissions: string[] | undefined, required: string): boolean {
    if (!userPermissions?.length) return false;
    return userPermissions.includes(required);
}

export function canAccessPath(pathname: string, userPermissions: string[] | undefined): boolean {
    const required = getRoutePermission(pathname);
    if (required === null) return true;
    return hasPermission(userPermissions, required);
}

/** Sidebar: only items the user has permission to see. */
export function filterNavItemsForPermissions(
    items: NavItem[],
    userPermissions: string[] | undefined
): NavItem[] {
    const perms = userPermissions ?? [];
    const out: NavItem[] = [];
    for (const item of items) {
        const req = item.requiredPermission;
        
        // ENFORCE PARENT PERMISSION FIRST
        // If a parent item requires a permission, the user MUST have it to see the item or its submenus.
        if (req && !perms.includes(req)) {
            continue;
        }

        if (item.submenu?.length) {
            const sub = item.submenu.filter((s) => perms.includes(s.requiredPermission));
            if (sub.length === 0) continue;
            out.push({ ...item, submenu: sub });
            continue;
        }
        
        out.push(item);
    }
    return out;
}
