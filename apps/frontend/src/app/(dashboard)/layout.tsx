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
import { useEffect, useState } from "react";
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
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { CommandPalette } from "@/components/search/CommandPalette";


export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session } = useSession();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleLogout = async () => {
        await signOut({ redirect: false });
        router.push("/login");
        router.refresh();
    };

    if (!mounted) {
        return null; // Or a simple skeleton to prevent hydration mismatch
    }

    return (
        <div className="flex min-h-screen flex-col bg-muted/40 text-foreground">
            <CommandPalette />
            {/* Premium Midnight Header */}
            <header className="sticky top-0 z-50 flex h-[72px] items-center gap-4 border-b border-indigo-950/20 bg-gradient-to-r from-[#0a0a2e] to-[#1a1a4a] px-6 text-white shadow-lg">
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/10 h-10 w-10 transition-colors"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                    <Menu className="h-6 w-6" />
                </Button>
                <Link href="/dashboard" className="flex shrink-0 items-center gap-2 font-extrabold tracking-tighter">
                    <span className="text-2xl bg-gradient-to-br from-white to-cyan-300 bg-clip-text text-transparent">Tutterfly</span>
                </Link>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="text-slate-100 hover:bg-white/10 text-base font-semibold px-4 h-10 transition-all">
                            Accounts <ChevronDown className="ml-1.5 h-4 w-4 opacity-70" />
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
                <div className="flex-1 px-8">
                    <div className="relative max-w-2xl group">
                        <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />
                        <Input
                            type="search"
                            placeholder="Universal search..."
                            className="h-11 border-none bg-white/5 pl-11 text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-cyan-500/30 text-base rounded-full backdrop-blur-sm transition-all focus:bg-white/10"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="gap-2.5 text-slate-100 hover:bg-white/10 text-base font-semibold h-11 px-4 rounded-full border border-white/5 transition-all">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)] animate-pulse" />
                                Available <ChevronDown className="h-4 w-4 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem>Available</DropdownMenuItem>
                            <DropdownMenuItem>Busy</DropdownMenuItem>
                            <DropdownMenuItem>Away</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <NotificationBell />
                    <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-white/10 hover:text-white h-11 w-11 rounded-full flex items-center justify-center transition-all bg-white/5 border border-white/5">
                        <span className="text-lg font-bold">W</span>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="gap-3 text-white hover:bg-white/10 text-base font-semibold h-11 px-4 rounded-full transition-all">
                                <Avatar className="h-8 w-8 border-2 border-cyan-500/30">
                                    <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-sm text-white font-bold">
                                        {session?.user?.name?.[0] ?? "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="hidden xl:inline">{session?.user?.name ?? "User"}</span> <ChevronDown className="h-4 w-4 opacity-50" />
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
                    <Button variant="ghost" size="icon" className="text-amber-400 hover:bg-white/10 hover:text-amber-300 h-11 w-11 rounded-full transition-all">
                        <Mail className="h-6 w-6" />
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
