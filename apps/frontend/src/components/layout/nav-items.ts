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
    Map
} from "lucide-react";

export interface NavItem {
    title: string;
    href: string;
    icon: any;
    requiredPermission: string;
    submenu?: { title: string; href: string; requiredPermission: string }[];
}

export const navItems: NavItem[] = [
    {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        requiredPermission: "view_dashboard",
    },
    {
        title: "Accounts",
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
        title: "Leads",
        href: "/leads",
        icon: Users,
        requiredPermission: "view_lead",
    },
    {
        title: "Suppliers",
        href: "/suppliers",
        icon: Truck,
        requiredPermission: "view_supplier",
    },
    {
        title: "Opportunities",
        href: "/opportunities",
        icon: Target,
        requiredPermission: "view_opportunity",
    },
    {
        title: "Tasks",
        href: "/tasks",
        icon: CheckSquare,
        requiredPermission: "view_task",
    },
    {
        title: "Drive",
        href: "/files",
        icon: HardDrive,
        requiredPermission: "view_file",
    },
    {
        title: "Itineraries",
        href: "/itineraries",
        icon: Map, // Will need to import Map or stick to Plane
        requiredPermission: "view_itinerary",
    },
    {
        title: "Reports",
        href: "/reports",
        icon: FileBarChart,
        requiredPermission: "view_reports",
    },
    {
        title: "Departure",
        href: "/departure",
        icon: LogOut,
        requiredPermission: "view_dashboard",
    },
    {
        title: "Admin",
        href: "/admin",
        icon: Settings,
        requiredPermission: "view_user",
        submenu: [
            { title: "User Management", href: "/admin/users", requiredPermission: "view_user" },
            { title: "Role Management", href: "/admin/role-management", requiredPermission: "view_role" },
            { title: "Hierarchies", href: "/admin/hierarchies", requiredPermission: "view_department" },
            { title: "Departments", href: "/admin/departments", requiredPermission: "view_department" },
        ]
    },
];
