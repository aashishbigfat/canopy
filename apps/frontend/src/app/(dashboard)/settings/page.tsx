import Link from "next/link";
import {
  Building2,
  Award,
  Mail,
  ListTree,
  ListChecks,
  Tags,
  UserCog,
  ShieldCheck,
  Map,
  Briefcase,
  Receipt,
  Zap,
} from "lucide-react";

const CARDS = [
  {
    href: "/settings/company",
    title: "Company Profile",
    desc: "Branding, address, bank details, GSTIN, logo upload.",
    icon: Building2,
  },
  {
    href: "/settings/leaderboard",
    title: "Leaderboard",
    desc: "Configure parameters, accolades, and performance scoring.",
    icon: Award,
  },
  {
    href: "/settings/email-footer",
    title: "Email Footer",
    desc: "Tenant-wide and per-user signature blocks.",
    icon: Mail,
  },
  {
    href: "/settings/custom-fields/lead",
    title: "Custom Fields",
    desc: "Add custom fields to every record type. Drag to sort.",
    icon: ListTree,
  },
  {
    href: "/settings/standard-fields/lead",
    title: "Standard Fields",
    desc: "Toggle visibility / mandatory on built-in fields.",
    icon: ListChecks,
  },
  {
    href: "/settings/picklists/lead_status",
    title: "Picklists",
    desc: "Manage 18 dropdown lists (stages, statuses, ratings, etc.).",
    icon: Tags,
  },
  {
    href: "/settings/auto-assignment",
    title: "Auto-Assignment",
    desc: "Round-robin, weighted, country-wise lead routing.",
    icon: UserCog,
  },
  {
    href: "/settings/department-mapping",
    title: "Department Mapping",
    desc: "Department → users / products / destinations.",
    icon: ShieldCheck,
  },
  {
    href: "/settings/territory",
    title: "Territory",
    desc: "Regions, sub-regions, country trees, BD reports.",
    icon: Map,
  },
  {
    href: "/settings/picklists/bd_activity_type",
    title: "BD Activity Types",
    desc: "Visit categories (Demo, Site Survey, Follow-up). Per-industry overrides.",
    icon: Briefcase,
  },
  {
    href: "/settings/picklists/expense_category",
    title: "Expense Categories",
    desc: "Meals, Travel, Lodging. Set auto-approve thresholds and receipt rules.",
    icon: Receipt,
  },
  {
    href: "/settings/automation",
    title: "Automation Rules",
    desc: "Trigger BD visits, notifications, owner changes when conditions match.",
    icon: Zap,
  },
];

export default function SettingsLanding() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure how your tenant works. Changes apply to all users.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map(({ href, title, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-lg border bg-card p-4 transition hover:border-primary hover:shadow-sm"
          >
            <div className="mb-3 flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">{title}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
