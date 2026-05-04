"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { EntityType } from "@/lib/api/services/field-registry.service";

const ENTITIES: { key: EntityType; label: string }[] = [
  { key: "lead", label: "Leads" },
  { key: "opportunity", label: "Opportunities" },
  { key: "account", label: "Accounts" },
  { key: "personal_account", label: "Person Accounts" },
  { key: "contact", label: "Contacts" },
  { key: "supplier", label: "Suppliers" },
  { key: "task", label: "Tasks" },
];

export function EntityTabs({
  basePath,
  entity,
}: {
  basePath: "/settings/custom-fields" | "/settings/standard-fields";
  entity: EntityType;
}) {
  return (
    <nav className="flex flex-wrap gap-1 border-b">
      {ENTITIES.map((e) => (
        <Link
          key={e.key}
          href={`${basePath}/${e.key}`}
          className={cn(
            "rounded-t-md border border-b-0 px-3 py-2 text-sm",
            e.key === entity
              ? "border-input bg-background font-medium"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {e.label}
        </Link>
      ))}
    </nav>
  );
}
