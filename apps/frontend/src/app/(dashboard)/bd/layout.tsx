"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, MapPin, ListChecks, Receipt, Map as MapIcon } from "lucide-react";

const TABS = [
  { href: "/bd",            label: "Dashboard",          icon: LayoutDashboard },
  { href: "/bd/visits",     label: "Visits",             icon: MapPin },
  { href: "/bd/approvals",  label: "Pending Approvals",  icon: ListChecks },
  { href: "/bd/expenses",   label: "Expenses",           icon: Receipt },
  { href: "/bd/tracking",   label: "Live Tracking",      icon: MapIcon },
];

export default function BDPanelLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col h-full">
      <header className="border-b bg-background sticky top-0 z-20">
        <div className="px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">BD Panel</h1>
            <p className="text-xs text-muted-foreground">Field operations: visits, expenses, tracking.</p>
          </div>
        </div>
        <nav className="px-4 flex gap-1 overflow-x-auto">
          {TABS.map(({ href, label, icon: Icon }) => {
            const isActive = href === "/bd" ? pathname === "/bd" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-md border-b-2 -mb-px",
                  isActive
                    ? "border-primary text-primary font-medium bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
