"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "next-auth/react";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname();
    const { data: session } = useSession();

    return (
        <div className={cn("pb-12 h-screen border-r bg-background", className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-primary">
                        Tutterfly CRM
                    </h2>
                    <div className="space-y-1">
                        {navItems.map((item) => (
                            <div key={item.href}>
                                {!item.submenu ? (
                                    <Button
                                        asChild
                                        variant={pathname.startsWith(item.href) ? "secondary" : "ghost"}
                                        className="w-full justify-start"
                                    >
                                        <Link href={item.href}>
                                            <item.icon className="mr-2 h-4 w-4" />
                                            {item.title}
                                        </Link>
                                    </Button>
                                ) : (
                                    <div className="py-2">
                                        <h3 className="mb-1 px-4 text-sm font-medium text-muted-foreground">
                                            {item.title}
                                        </h3>
                                        {item.submenu.map((sub) => (
                                            <Button
                                                key={sub.href}
                                                asChild
                                                variant={pathname.startsWith(sub.href) ? "secondary" : "ghost"}
                                                className="w-full justify-start pl-8"
                                            >
                                                <Link href={sub.href}>
                                                    {sub.title}
                                                </Link>
                                            </Button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* User Footer */}
            <div className="absolute bottom-4 left-0 w-full px-4">
                <div className="flex items-center gap-2 p-2 rounded-md bg-secondary/50">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-xs font-bold">{session?.user?.name?.[0] || 'U'}</span>
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium truncate">{session?.user?.name || 'Guest'}</p>
                        <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
