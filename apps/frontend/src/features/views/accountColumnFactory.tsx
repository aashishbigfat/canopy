"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Eye } from "lucide-react";
import { OwnerPopover } from "@/components/shared/OwnerPopover";
import type { EntityType } from "@/lib/api/services/field-registry.service";
import { defaultColumnsFor } from "./accountFields";

/** sourceName (users, sales_stages, …) → (id → name) map, built by each table. */
export type ViewLookups = Record<string, Map<string, string>>;

export interface ColumnFactoryCtx {
  entity: EntityType;
  openDetail?: (id: string) => void;
  lookups?: ViewLookups;
}

// Clickable record-identifier field + its detail route, per module.
const IDENTIFIER: Record<string, { field: string; basePath: string }> = {
  account: { field: "name", basePath: "accounts" },
  personal_account: { field: "first_name", basePath: "person-accounts" },
  contact: { field: "first_name", basePath: "contacts" },
  lead: { field: "first_name", basePath: "leads" },
  opportunity: { field: "name", basePath: "opportunities" },
};

// lookup field_key → how to resolve its display name: a *_name already on the
// row (preferred) and/or a ViewLookups source map (id→name).
const LOOKUP_CONFIG: Record<string, Record<string, { nameField?: string; source?: string }>> = {
  account: {
    owner_id: { nameField: "owner_name", source: "users" },
    acc_type_id: { nameField: "account_type_name", source: "account_types" },
    category_id: { nameField: "category_name", source: "categories" },
    industry_id: { source: "industries" },
    acc_parent_id: { nameField: "acc_parent_name", source: "parents" },
    created_by: { source: "users" },
    last_modified_by_id: { source: "users" },
  },
  personal_account: {
    owner_id: { nameField: "owner_name", source: "users" },
    category_id: { nameField: "category_name", source: "categories" },
    created_by: { source: "users" },
    last_modified_by_id: { source: "users" },
  },
  contact: {
    account_id: { nameField: "account_name" },
    owner_id: { nameField: "owner_name", source: "users" },
    created_by: { source: "users" },
    last_modified_by_id: { source: "users" },
  },
  lead: {
    lead_status_id: { source: "lead_statuses" },
    source_id: { source: "sources" },
    source_medium_id: { source: "source_mediums" },
    industry_id: { source: "industries" },
    owner_id: { nameField: "owner_name", source: "users" },
    created_by: { source: "users" },
    last_modified_by_id: { source: "users" },
  },
  opportunity: {
    account_id: { nameField: "account_name" },
    contact_id: { nameField: "contact_name" },
    sales_stage_id: { nameField: "sales_stage_name", source: "sales_stages" },
    opportunity_type_id: { source: "opportunity_types" },
    owner_id: { nameField: "owner_name", source: "users" },
    created_by: { source: "users" },
    last_modified_by_id: { source: "users" },
  },
};

const DATE_FIELDS = new Set(["created_at", "updated_at", "close_date"]);

function prettify(key: string): string {
  return key.replace(/_id$/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function fmtDate(v: any): string {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}

function makeColumn(key: string, labels: Map<string, string>, ctx: ColumnFactoryCtx): ColumnDef<any> {
  const header = labels.get(key) || prettify(key);
  const entity = ctx.entity;

  // Custom / additional field — value under row.custom_fields[<id>].
  if (key.startsWith("additional:")) {
    const fieldId = key.slice("additional:".length);
    return {
      id: key,
      header,
      cell: ({ row }) => {
        const cf = (row.original as any).custom_fields?.[fieldId];
        return <div className="text-muted-foreground">{cf?.value || "-"}</div>;
      },
    };
  }

  // Industry-data (nested) fields — e.g. travel_date, destination_ids, no_of_pax.
  if (key.startsWith("industry_data.")) {
    const sub = key.slice("industry_data.".length);
    return {
      id: key,
      header,
      cell: ({ row }) => {
        const idata = (row.original as any).industry_data || {};
        if (sub === "destination_ids") {
          const names = idata.destination_names;
          if (Array.isArray(names) && names.length) return <div className="text-muted-foreground">{names.join(", ")}</div>;
          const ids: string[] = Array.isArray(idata.destination_ids) ? idata.destination_ids : [];
          const resolved = ids.map((i) => ctx.lookups?.destinations?.get(i)).filter(Boolean);
          return <div className="text-muted-foreground">{resolved.length ? resolved.join(", ") : "-"}</div>;
        }
        const v = idata[sub];
        return <div className="text-muted-foreground">{v ?? "-"}</div>;
      },
    };
  }

  // Clickable record identifier — link + quick-view.
  const ident = IDENTIFIER[entity];
  if (ident && key === ident.field) {
    return {
      id: key,
      header,
      cell: ({ row }) => {
        const r = row.original as any;
        const text = r[key] || "-";
        return (
          <div className="flex items-center gap-2">
            {ctx.openDetail && (
              <button
                type="button"
                onClick={() => ctx.openDetail!(r.id)}
                title="Quick view"
                className="flex-shrink-0 text-primary hover:text-primary/80"
              >
                <Eye className="h-4 w-4" />
              </button>
            )}
            <Link
              href={`/${ident.basePath}/${r.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate max-w-[200px] font-medium text-primary hover:underline"
              title={text}
            >
              {text}
            </Link>
          </div>
        );
      },
    };
  }

  // Owner — interactive popover for account modules; plain name elsewhere.
  if (key === "owner_id" && (entity === "account" || entity === "personal_account")) {
    return {
      id: key,
      header,
      cell: ({ row }) => (
        <OwnerPopover
          ownerId={(row.original as any).owner_id}
          ownerName={
            (row.original as any).owner_name ||
            ctx.lookups?.users?.get((row.original as any).owner_id) ||
            undefined
          }
        />
      ),
    };
  }

  // Record ID.
  if (key === "id") {
    return {
      id: "record_id",
      header,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{(row.original as any).id}</span>
      ),
    };
  }

  // Date fields.
  if (DATE_FIELDS.has(key)) {
    return {
      id: key,
      header,
      cell: ({ row }) => <div className="text-muted-foreground">{fmtDate((row.original as any)[key])}</div>,
    };
  }

  // Lookup fields resolved via a *_name on the row or an id→name source map.
  const lk = LOOKUP_CONFIG[entity]?.[key];
  if (lk) {
    return {
      id: key,
      header,
      cell: ({ row }) => {
        const r = row.original as any;
        const id = r[key];
        const name =
          (lk.nameField && r[lk.nameField]) ||
          (id && lk.source && ctx.lookups?.[lk.source]?.get(id)) ||
          "-";
        return <div className="text-muted-foreground">{name}</div>;
      },
    };
  }

  // Plain text/number field.
  return {
    id: key,
    accessorKey: key,
    header,
    cell: ({ row }) => (
      <div className="max-w-[220px] truncate text-muted-foreground" title={(row.original as any)[key] ?? ""}>
        {(row.original as any)[key] ?? "-"}
      </div>
    ),
  };
}

/**
 * Build a module's table columns for the active view. `displayColumns` empty =>
 * the entity's default column set.
 */
export function buildEntityColumns(
  displayColumns: string[] | undefined,
  fieldLabels: Map<string, string>,
  ctx: ColumnFactoryCtx,
): ColumnDef<any>[] {
  const keys = displayColumns && displayColumns.length ? displayColumns : defaultColumnsFor(ctx.entity);
  return keys.map((k) => makeColumn(k, fieldLabels, ctx));
}
