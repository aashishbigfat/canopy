import {
    LayoutDashboard,
    Users,
    Contact,
    Target,
    HardDrive,
    FileText,
    Settings,
    Plane,
    Building2,
    Truck,
    CheckSquare,
    FileBarChart,
    LogOut,
    Menu,
    Map,
    Briefcase,
} from "lucide-react";

import type { IndustryLabelMap, IndustryType } from "@/lib/industry-labels";
import { INDUSTRY_LABELS } from "@/lib/industry-labels";

export interface NavItem {
    title: string;
    href: string;
    icon: any;
    requiredPermission: string;
    submenu?: { title: string; href: string; requiredPermission: string }[];
}

// ---------------------------------------------------------------------------
// Core nav items — always visible, labels depend on industry
// ---------------------------------------------------------------------------
function coreNavItems(labels: IndustryLabelMap): NavItem[] {
    return [
        {
            title: "Dashboard",
            href: "/dashboard",
            icon: LayoutDashboard,
            requiredPermission: "view_dashboard",
            submenu: [
                { title: "Overview",    href: "/dashboard",            requiredPermission: "view_dashboard" },
                { title: "Leaderboard", href: "/dashboard/leaderboard", requiredPermission: "view_dashboard" },
                { title: "Incentives",  href: "/dashboard/incentive",   requiredPermission: "view_dashboard" },
            ],
        },
        {
            title: labels.leads,
            href: "/leads",
            icon: Users,
            requiredPermission: "view_lead",
        },
        {
            title: labels.opportunities,
            href: "/opportunities",
            icon: Target,
            requiredPermission: "view_opportunity",
        },
        {
            title: labels.accounts,
            href: "/accounts",
            icon: Building2,
            requiredPermission: "view_account",
        },
        {
            title: "Person Accounts",
            href: "/person-accounts",
            icon: Users,
            requiredPermission: "view_account",
        },
        {
            title: "Contacts",
            href: "/contacts",
            icon: Contact,
            requiredPermission: "view_contact",
        },
        {
            title: labels.suppliers,
            href: "/suppliers",
            icon: Truck,
            requiredPermission: "view_supplier",
        },
        {
            title: "Tasks",
            href: "/tasks",
            icon: CheckSquare,
            requiredPermission: "view_task",
        },
        {
            title: "BD Panel",
            href: "/bd",
            icon: Briefcase,
            requiredPermission: "view_bd_panel",
            submenu: [
                { title: "Dashboard",         href: "/bd",            requiredPermission: "view_bd_panel" },
                { title: "My Visits",         href: "/bd/visits",     requiredPermission: "view_bd_visit" },
                { title: "Pending Approvals", href: "/bd/approvals",  requiredPermission: "approve_bd_visit" },
                { title: "My Expenses",       href: "/bd/expenses",   requiredPermission: "view_expense" },
                { title: "Live Tracking",     href: "/bd/tracking",   requiredPermission: "view_live_tracking" },
            ],
        },
        {
            title: "Drive",
            href: "/files",
            icon: HardDrive,
            requiredPermission: "view_file",
        },
    ];
}

// ---------------------------------------------------------------------------
// Industry-specific nav items — only for industries that have real pages
// ---------------------------------------------------------------------------
function travelNavItems(modules: Record<string, boolean>): NavItem[] {
    const items: NavItem[] = [];
    if (modules.itineraries !== false) {
        items.push({
            title: "Itineraries",
            href: "/itineraries",
            icon: Map,
            requiredPermission: "view_itinerary",
        });
    }
    if (modules.destinations !== false) {
        items.push({
            title: "Departure",
            href: "/departure",
            icon: LogOut,
            requiredPermission: "view_dashboard",
        });
    }
    return items;
}

// ---------------------------------------------------------------------------
// Trailing nav items — always at the bottom (Reports, Admin, Settings)
// ---------------------------------------------------------------------------
function trailingNavItems(): NavItem[] {
    return [
        {
            title: "Reports",
            href: "/reports",
            icon: FileBarChart,
            requiredPermission: "view_reports",
        },
        {
            title: "Admin",
            href: "/admin",
            icon: Settings,
            requiredPermission: "view_user",
            submenu: [
                { title: "User", href: "/admin/users", requiredPermission: "view_user" },
                { title: "Profiles & Permissions", href: "/admin/role-management", requiredPermission: "view_role" },
                { title: "Roles", href: "/admin/hierarchies", requiredPermission: "view_hierarchy" },
            ],
        },
        {
            title: "Settings",
            href: "/settings",
            icon: Settings,
            requiredPermission: "manage_system",
            submenu: [
                { title: "Company Profile", href: "/settings/company", requiredPermission: "manage_system" },
                { title: "Custom Fields", href: "/settings/custom-fields/lead", requiredPermission: "manage_system" },
                { title: "Standard Fields", href: "/settings/standard-fields/lead", requiredPermission: "manage_system" },
                { title: "Picklists", href: "/settings/picklists/lead_status", requiredPermission: "manage_system" },
                { title: "Auto-Assignment", href: "/settings/auto-assignment", requiredPermission: "manage_system" },
                { title: "Leaderboard", href: "/settings/leaderboard", requiredPermission: "manage_system" },
                { title: "Email Footer", href: "/settings/email-footer", requiredPermission: "manage_system" },
                { title: "Territory", href: "/settings/territory", requiredPermission: "manage_territory" },
                { title: "BD Activity Types", href: "/settings/picklists/bd_activity_type", requiredPermission: "manage_system" },
                { title: "Expense Categories", href: "/settings/picklists/expense_category", requiredPermission: "manage_system" },
                { title: "Automation Rules", href: "/settings/automation", requiredPermission: "manage_automation_rules" },
            ],
        },
    ];
}

// ---------------------------------------------------------------------------
// Public API — dynamic nav items factory
// ---------------------------------------------------------------------------

/**
 * Build the navigation items list based on industry and enabled modules.
 *
 * IMPORTANT: We only add extra nav items for industries that have REAL pages
 * backed by actual routes. Don't add phantom menu entries that will 404.
 * Currently only travel has extra pages (Itineraries, Departure).
 */
export function getNavItems(
    industry: IndustryType = "travel",
    modules: Record<string, boolean> = {},
): NavItem[] {
    const labels = INDUSTRY_LABELS[industry] ?? INDUSTRY_LABELS.travel;
    const core = coreNavItems(labels);

    // Only travel has extra pages with real routes
    let industryItems: NavItem[] = [];
    if (industry === "travel") {
        industryItems = travelNavItems(modules);
    }

    return [...core, ...industryItems, ...trailingNavItems()];
}

// Backward compatibility — static export uses travel defaults
export const navItems: NavItem[] = getNavItems("travel", {
    destinations: true,
    itineraries: true,
    packages: true,
    suppliers: true,
});
