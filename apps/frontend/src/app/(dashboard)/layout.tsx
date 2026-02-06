"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
    Bell,
    ChevronDown,
    Mail,
    Menu,
    Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/Sidebar";
import { useState } from "react";
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


export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session } = useSession();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = async () => {
        await signOut({ redirect: false });
        router.push("/login");
        router.refresh();
    };

    return (
        <div className="flex min-h-screen flex-col bg-muted/40 text-foreground">
            {/* Blue header bar (Tutterfly reference) */}
            <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b border-blue-800/30 bg-blue-600 px-4 text-white shadow-sm">
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-blue-500 hover:text-white"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                    <Menu className="h-5 w-5" />
                </Button>
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
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Sidebar Overlay */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-black/40"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <aside className={cn(
                    "fixed inset-y-0 left-0 z-50 w-[260px] transform transition-transform duration-300 ease-in-out bg-background shadow-2xl",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}>
                    <Sidebar />
                </aside>

                {/* Main content */}
                <main className="flex-1 overflow-y-auto bg-muted/20">
                    <div className="p-6">{children}</div>
                </main>
            </div>
        </div>
    );
}
