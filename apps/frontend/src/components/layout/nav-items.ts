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
        title: "Person Accounts",
        href: "/person-accounts",
        icon: Users,
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
        title: "Suppliers",
        href: "/suppliers",
        icon: Truck,
    },
    {
        title: "Opportunities",
        href: "/opportunities",
        icon: Target,
    },
    {
        title: "Tasks",
        href: "/tasks",
        icon: CheckSquare,
    },
    {
        title: "Drive",
        href: "/files",
        icon: HardDrive,
    },
    {
        title: "Itineraries",
        href: "/itineraries",
        icon: Map, // Will need to import Map or stick to Plane
    },
    {
        title: "Reports",
        href: "/reports",
        icon: FileBarChart,
    },
    {
        title: "Departure",
        href: "/departure",
        icon: LogOut,
    },
    {
        title: "Admin",
        href: "/admin",
        icon: Settings,
    },
];
