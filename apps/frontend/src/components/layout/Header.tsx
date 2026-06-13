"use client";

import Link from "next/link";
import { User, LogOut, Settings, Bell, Search } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Header() {
    const { data: session } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Initialize with URL search params if present
    const initialSearch = searchParams.get("search") || "";
    const [searchTerm, setSearchTerm] = useState(initialSearch);

    // Use the new generic debounce hook
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    // Trigger navigation when the debounced term changes
    useEffect(() => {
        // Prevent pushing immediately on mount if it matches the URL
        if (debouncedSearchTerm === initialSearch && !debouncedSearchTerm) return;

        const params = new URLSearchParams(searchParams.toString());
        if (debouncedSearchTerm) {
            params.set("search", debouncedSearchTerm);
        } else {
            params.delete("search");
        }

        // Push to current path to preserve view/filters if we are on a list page
        const newUrl = `?${params.toString()}`;
        router.push(newUrl);
    }, [debouncedSearchTerm, router, searchParams]);

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6 shadow-sm">
            <div className="w-full flex-1">
                <form className="hidden md:block" onSubmit={(e) => e.preventDefault()}>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search customers, quotes, invoices..."
                            className="w-full bg-background pl-8 md:w-[300px] lg:w-[400px]"
                        />
                    </div>
                </form>
            </div>
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-600" />
                    <span className="sr-only">Notifications</span>
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src="/avatars/01.png" alt={session?.user?.name || "User"} />
                                <AvatarFallback>{session?.user?.name?.[0] || "U"}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{session?.user?.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {session?.user?.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem asChild>
                                <Link href="/profile">
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Profile</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/admin/settings">
                                    <Settings className="mr-2 h-4 w-4" />
                                    <span>Settings</span>
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
