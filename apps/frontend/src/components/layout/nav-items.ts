import {
    LayoutDashboard,
    Users,
    Contact,
    Target,
    Briefcase,
    FileText,
    Settings,
    Plane,
    Building2,
    Receipt
} from "lucide-react";

export interface NavItem {
    title: string;
    href: string;
    icon: any;
    submenu?: { title: string; href: string }[];
}

export const navItems: NavItem[] = [
    {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "Accounts",
        href: "/accounts",
        icon: Building2,
    },
    {
        title: "Contacts",
        href: "/contacts",
        icon: Contact,
    },
    {
        title: "Leads",
        href: "/leads",
        icon: Users,
    },
    {
        title: "Opportunities",
        href: "/opportunities",
        icon: Target,
    },
    {
        title: "Operations",
        href: "/operations", // Parent, maybe non-clickable
        icon: Plane,
        submenu: [
            { title: "Itineraries", href: "/itineraries" },
            { title: "Suppliers", href: "/suppliers" },
            { title: "Departures", href: "/departures" },
        ],
    },
    {
        title: "Finance",
        href: "/finance",
        icon: Receipt,
        submenu: [
            { title: "Quotes", href: "/quotes" },
            { title: "Invoices", href: "/invoices" },
        ],
    },
    {
        title: "Documents",
        href: "/files",
        icon: FileText,
    },
    {
        title: "Admin",
        href: "/admin",
        icon: Settings,
    },
];
