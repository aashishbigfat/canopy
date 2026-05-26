"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import {
    ChevronDown,
    Menu,
    Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/Sidebar";
import { useEffect, useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { CommandPalette } from "@/components/search/CommandPalette";
import { GlobalSearchBar } from "@/components/search/GlobalSearchBar";
import { RouteGuard } from "@/components/permissions/RouteGuard";
import { usePermissionRefresh } from "@/hooks/use-permission-refresh";


export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { data: session } = useSession();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isLargeScreen, setIsLargeScreen] = useState(false);

    // Poll for fresh permissions every 60s — live permission updates without re-login
    usePermissionRefresh(60_000);

    useEffect(() => {
        setMounted(true);

        const mediaQuery = window.matchMedia("(min-width: 1024px)");
        setIsLargeScreen(mediaQuery.matches);

        const handler = (e: MediaQueryListEvent) => setIsLargeScreen(e.matches);
        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
    }, []);

    useEffect(() => {
        if (!isLargeScreen) {
            setIsSidebarOpen(false);
        }
    }, [pathname, isLargeScreen]);

    const queryClient = useQueryClient();

    const handleLogout = async () => {
        // Clear ALL React Query cache before logout to prevent stale
        // cross-tenant data from showing when a different user logs in
        queryClient.clear();
        await signOut({ redirect: false });
        router.push("/login");
        router.refresh();
    };

    if (!mounted) {
        return null; // Or a simple skeleton to prevent hydration mismatch
    }

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <CommandPalette />

            {/* Backdrop overlay for mobile/tablet */}
            {isSidebarOpen && !isLargeScreen && (
                <div
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar — fixed, pushes content via margin */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-[264px] transform border-r bg-sidebar transition-transform duration-300 ease-in-out",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <Sidebar />
            </aside>

            {/* Wrapper that shifts when sidebar opens */}
            <div
                className="flex flex-1 flex-col transition-all duration-300 ease-in-out"
                style={{ marginLeft: isSidebarOpen && isLargeScreen ? 264 : 0 }}
            >
                <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-card px-3 sm:px-5">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    >
                        <Menu className="h-5 w-5" />
                    </Button>
                    <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
                        <span className="text-base font-semibold tracking-tight text-primary">Travel CRM</span>
                    </Link>
                    <div className="hidden min-w-0 flex-1 px-4 lg:block">
                        <GlobalSearchBar />
                    </div>
                    <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                        <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9">
                            <Search className="h-4 w-4" />
                        </Button>
                        <div className="hidden xl:block">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="h-9 gap-2 rounded-md px-3 text-xs font-medium">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                        Available <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem>Available</DropdownMenuItem>
                                    <DropdownMenuItem>Busy</DropdownMenuItem>
                                    <DropdownMenuItem>Away</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <NotificationBell />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-9 gap-2 rounded-md px-2.5">
                                    <Avatar className="h-7 w-7 border">
                                        <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                                            {session?.user?.name?.[0] ?? "U"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="hidden xl:inline">{session?.user?.name ?? "User"}</span>
                                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
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
                    </div>
                </header>

                {/* Main content — wrapped with RouteGuard for permission enforcement */}
                <main
                    className="min-w-0 flex-1 overflow-y-auto bg-background"
                    onClick={() => isSidebarOpen && setIsSidebarOpen(false)}
                >
                    <div className="p-3 sm:p-4 lg:p-5"><RouteGuard>{children}</RouteGuard></div>
                </main>
            </div>
        </div>
    );
}
