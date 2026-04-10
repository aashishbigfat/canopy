"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname();
    const { data: session } = useSession();

    return (
        <div className={cn("h-full flex flex-col w-[260px] bg-white text-slate-900 border-r", className)}>
            <div className="flex-1 overflow-y-auto py-6 px-3">
                <div className="mb-6 px-4">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-600" />
                        <span className="text-xl font-bold text-blue-600">Tutterfly</span>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <div key={item.href} className="flex flex-col mb-1">
                                <Button
                                    asChild
                                    variant="ghost"
                                    className={cn(
                                        "w-full justify-start h-10 px-4 rounded-xl transition-all duration-200",
                                        isActive
                                            ? "bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 shadow-sm"
                                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    <Link href={item.href} className="flex items-center w-full">
                                        <item.icon className={cn(
                                            "mr-3 size-[20px]",
                                            isActive ? "text-blue-600" : "text-slate-400"
                                        )} />
                                        <span className="text-[14px] font-semibold flex-1">
                                            {item.title}
                                        </span>
                                    </Link>
                                </Button>
                                {item.submenu && isActive && (
                                    <div className="ml-10 mt-1 flex flex-col gap-1 border-l-2 border-slate-100 pl-3 py-1">
                                        {item.submenu.map((sub) => {
                                            const isSubActive = pathname === sub.href || pathname.startsWith(`${sub.href}/`);
                                            return (
                                                <Link
                                                    key={sub.href}
                                                    href={sub.href}
                                                    className={cn(
                                                        "text-[13px] font-medium px-3 py-1.5 rounded-lg transition-colors",
                                                        isSubActive 
                                                            ? "text-blue-600 bg-blue-50/50" 
                                                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
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

            {/* Premium Footer */}
            <div className="mt-auto p-4 border-t bg-slate-50/30">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white shadow-sm border border-slate-100">
                    <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                        <span className="text-white font-bold text-sm">
                            {session?.user?.name?.[0] || 'A'}
                        </span>
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-[13px] font-bold text-slate-800 truncate leading-tight mb-0.5">
                            {session?.user?.name || 'Admin User'}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate leading-tight">
                            {session?.user?.email || 'admin@tutterfly.com'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
