"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
    Bell,
    Building2,
    ChevronDown,
    Mail,
    Menu,
    Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const MAIN_NAV: { label: string; href: string }[] = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Accounts", href: "/accounts" },
    { label: "Contacts", href: "/contacts" },
    { label: "Leads", href: "/leads" },
    { label: "Suppliers", href: "/suppliers" },
    { label: "Opportunities", href: "/opportunities" },
    { label: "Tasks", href: "/tasks" },
    { label: "Drive", href: "/files" },
    { label: "Itineraries", href: "/itineraries" },
    { label: "Reports", href: "/reports" },
    { label: "Departure", href: "/departure" },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session } = useSession();

    const handleLogout = async () => {
        await signOut({ redirect: false });
        router.push("/login");
        router.refresh();
    };

    return (
        <div className="flex min-h-screen flex-col bg-muted/40 text-foreground">
            {/* Blue header bar (Tutterfly reference) */}
            <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-blue-800/30 bg-blue-600 px-4 text-white shadow-sm">
                <Link href="/dashboard" className="flex shrink-0 items-center gap-2 font-semibold">
                    <span className="text-lg">Tutterfly</span>
                </Link>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-white hover:bg-blue-500 hover:text-white">
                            Accounts <ChevronDown className="ml-1 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuLabel>Accounts</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/accounts">All Accounts</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/accounts/create">New Account</Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <div className="flex-1">
                    <div className="relative max-w-md">
                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/80" />
                        <Input
                            type="search"
                            placeholder="Search here..."
                            className="border-blue-500/50 bg-blue-500/30 pl-8 text-white placeholder:text-white/70 focus-visible:ring-white/50"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-1.5 text-white hover:bg-blue-500 hover:text-white">
                                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                Available <ChevronDown className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem>Available</DropdownMenuItem>
                            <DropdownMenuItem>Busy</DropdownMenuItem>
                            <DropdownMenuItem>Away</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-blue-500 hover:text-white">
                        <Bell className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-blue-500 hover:text-white">
                        <span className="text-lg font-semibold">W</span>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-2 text-white hover:bg-blue-500 hover:text-white">
                                <Avatar className="h-7 w-7 border border-white/30">
                                    <AvatarFallback className="bg-blue-500 text-sm text-white">
                                        {session?.user?.name?.[0] ?? "U"}
                                    </AvatarFallback>
                                </Avatar>
                                {session?.user?.name ?? "User"} <ChevronDown className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>{session?.user?.email ?? "Account"}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                                Log out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="ghost" size="icon" className="text-amber-300 hover:bg-blue-500 hover:text-amber-200">
                        <Mail className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="lg:hidden text-white hover:bg-blue-500 hover:text-white">
                        <Menu className="h-5 w-5" />
                    </Button>
                </div>
            </header>

            {/* Horizontal nav (Dashboard, Accounts, ...) */}
            <nav className="sticky top-14 z-30 flex border-b bg-background px-4 shadow-sm">
                <div className="flex gap-1 overflow-x-auto py-2">
                    {MAIN_NAV.map(({ label, href }) => {
                        const active =
                            href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
                        return (
                            <Link
                                key={href + label}
                                href={href}
                                className={cn(
                                    "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                    active
                                        ? "bg-muted text-foreground"
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                {label}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto">
                <div className="p-6">{children}</div>
            </main>
        </div>
    );
}
