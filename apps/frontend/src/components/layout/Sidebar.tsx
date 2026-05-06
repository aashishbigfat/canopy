"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getNavItems } from "./nav-items";
import { filterNavItemsForPermissions } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import type { IndustryType } from "@/lib/industry-labels";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname();
    const { data: session } = useSession();

    // Build industry-aware nav items and filter by permissions
    const userPermissions = (session?.user as any)?.permissions as string[] | undefined;
    const industry = ((session?.user as any)?.industry ?? "travel") as IndustryType;
    const modules = ((session?.user as any)?.modules ?? {}) as Record<string, boolean>;
    
    const visibleNavItems = useMemo(
        () => filterNavItemsForPermissions(getNavItems(industry, modules), userPermissions),
        [userPermissions, industry, modules]
    );

    return (
        <div className={cn("h-full flex flex-col w-[264px] bg-sidebar text-sidebar-foreground", className)}>
            <div className="flex-1 overflow-y-auto py-6 px-3">
                <div className="mb-6 px-4">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <span className="text-base font-semibold tracking-tight text-primary">Workspace</span>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    {visibleNavItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <div key={item.href} className="flex flex-col mb-1">
                                <Button
                                    asChild
                                    variant="ghost"
                                    className={cn(
                                        "w-full justify-start h-9 px-3 rounded-md transition-colors",
                                        isActive
                                            ? "bg-sidebar-accent text-primary hover:bg-sidebar-accent"
                                            : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
                                    )}
                                >
                                    <Link href={item.href} className="flex items-center w-full">
                                        <item.icon className={cn(
                                            "mr-3 size-4.5",
                                            isActive ? "text-primary" : "text-sidebar-foreground/60"
                                        )} />
                                        <span className="flex-1 text-sm font-medium">
                                            {item.title}
                                        </span>
                                    </Link>
                                </Button>
                                {item.submenu && isActive && (
                                    <div className="ml-8 mt-1 flex flex-col gap-1 border-l border-sidebar-border pl-3 py-1">
                                        {item.submenu.map((sub) => {
                                            const isSubActive = pathname === sub.href || pathname.startsWith(`${sub.href}/`);
                                            return (
                                                <Link
                                                    key={sub.href}
                                                    href={sub.href}
                                                    className={cn(
                                                        "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                                                        isSubActive 
                                                            ? "bg-sidebar-accent/70 text-primary"
                                                            : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                                                    )}
                                                >
                                                    {sub.title}
                                                </Link>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="mt-auto border-t border-sidebar-border p-4">
                <div className="flex items-center gap-3 rounded-md border border-sidebar-border bg-card p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                        <span className="text-white font-bold text-sm">
                            {session?.user?.name?.[0] || 'A'}
                        </span>
                    </div>
                    <div className="overflow-hidden">
                        <p className="truncate text-xs font-semibold leading-tight text-sidebar-foreground">
                            {session?.user?.name || 'Admin User'}
                        </p>
                        <p className="truncate text-[11px] leading-tight text-sidebar-foreground/70">
                            {session?.user?.email || 'admin@tutterfly.com'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
