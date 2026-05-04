"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Award,
  ListTree,
  UserCog,
  Mail,
  Map,
  CreditCard,
  Tags,
  ListChecks,
  ShieldCheck,
  Settings as SettingsIcon,
} from "lucide-react";
import { ReactNode } from "react";

const ENTITY_TYPES = [
  "account",
  "contact",
  "lead",
  "opportunity",
  "supplier",
  "personal_account",
  "task",
] as const;

const SECTIONS: { title: string; items: { href: string; label: string; icon: ReactNode }[] }[] = [
  {
    title: "Company",
    items: [
      { href: "/settings", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
      { href: "/settings/company", label: "Company Profile", icon: <Building2 className="h-4 w-4" /> },
      { href: "/settings/leaderboard", label: "Leaderboard", icon: <Award className="h-4 w-4" /> },
      { href: "/settings/email-footer", label: "Email Footer", icon: <Mail className="h-4 w-4" /> },
    ],
  },
  {
    title: "Records & Fields",
    items: [
      { href: "/settings/custom-fields/lead", label: "Custom Fields", icon: <ListTree className="h-4 w-4" /> },
      { href: "/settings/standard-fields/lead", label: "Standard Fields", icon: <ListChecks className="h-4 w-4" /> },
      { href: "/settings/picklists/lead_status", label: "Picklists", icon: <Tags className="h-4 w-4" /> },
    ],
  },
  {
    title: "Routing & Org",
    items: [
      { href: "/settings/auto-assignment", label: "Auto-Assignment", icon: <UserCog className="h-4 w-4" /> },
      { href: "/settings/department-mapping", label: "Department Mapping", icon: <ShieldCheck className="h-4 w-4" /> },
      { href: "/settings/territory", label: "Territory", icon: <Map className="h-4 w-4" /> },
    ],
  },
  {
    title: "Billing",
    items: [
      { href: "/settings/billing", label: "Billing & Plans", icon: <CreditCard className="h-4 w-4" /> },
    ],
  },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full">
      <aside className="w-64 shrink-0 border-r bg-muted/30 p-4 overflow-y-auto">
        <div className="mb-4 flex items-center gap-2 px-2 text-sm font-semibold">
          <SettingsIcon className="h-4 w-4" />
          Settings
        </div>
        <nav className="space-y-6">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </div>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground hover:bg-muted",
                        )}
                      >
                        {item.icon}
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}

export { ENTITY_TYPES };
