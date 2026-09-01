"use client";

import * as React from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  entityViewsService,
  type EntityView,
  type FilterRule,
} from "@/lib/api/services/entity-views.service";
import {
  customFieldsService,
  type EntityType,
} from "@/lib/api/services/field-registry.service";
import { accountService } from "@/features/accounts/services/accountService";
import { contactsService } from "@/lib/api/services/contacts.service";
import { destinationsService } from "@/lib/api/services/destinations.service";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { operatorsForType, operatorArityForType } from "./fieldMeta";
import type { LogicalType } from "./fieldMeta";
import {
  standardFieldsFor,
  realCustomFields,
  accountRefFieldsFor,
  contactRefFieldsFor,
  type OptionList,
} from "./accountFields";
import { AsyncEntitySelect } from "./AsyncEntitySelect";

type Row = { field: string; operator: string; value: any };
type FieldMeta = { key: string; label: string; type: LogicalType };

const ADD = "additional:";

export function EditListFiltersDialog({
  open,
  onOpenChange,
  entity,
  view,
  onSaved,
  lookupOptions = {},
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entity: EntityType;
  view: EntityView;
  onSaved: (view: EntityView) => void;
  /** field_key → value options for lookup filters (provided by the module table). */
  lookupOptions?: Record<string, OptionList>;
}) {
  const [scope, setScope] = React.useState<string>("all");
  const [rows, setRows] = React.useState<Row[]>([]);
  // Inline editor: editing===null closed; -1 = new row; >=0 = edit that row.
  const [editing, setEditing] = React.useState<number | null>(null);
  const [draft, setDraft] = React.useState<Row | null>(null);
  const [saving, setSaving] = React.useState(false);
  // id→name for account-reference values (resolved via search; can't live in
  // the bounded form-data list at scale).
  const [labelCache, setLabelCache] = React.useState<Record<string, string>>({});

  const standard = React.useMemo<FieldMeta[]>(() => standardFieldsFor(entity), [entity]);

  const { data: customFields = [] } = useQuery({
    queryKey: ["custom-fields", entity],
    queryFn: () => customFieldsService.list(entity, true),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });
  const custom = React.useMemo<FieldMeta[]>(
    () =>
      realCustomFields(entity, customFields).map((f) => ({
        key: ADD + f.id,
        label: f.label || f.name,
        type: "string" as LogicalType,
      })),
    [customFields, entity],
  );
  // Async reference fields (server search) per module.
  const accountRefs = React.useMemo(() => accountRefFieldsFor(entity), [entity]);
  const contactRefs = React.useMemo(() => contactRefFieldsFor(entity), [entity]);
  const isRef = React.useCallback(
    (field: string) => accountRefs.has(field) || contactRefs.has(field),
    [accountRefs, contactRefs],
  );
  const accountSearch = React.useCallback((q: string) => accountService.autocompleteAccounts(q), []);
  const contactSearch = React.useCallback(
    (q: string, signal?: AbortSignal) =>
      contactsService.searchContactAutocomplete(q, signal).then((rs) => rs.map((r) => ({ id: r.id, name: r.name }))),
    [],
  );

  // Destination is an unbounded picklist (cities). Rather than dump thousands of
  // options into a plain <Select>, load the full set once (for label resolution)
  // and drive the value editor with a type-to-search picker, mirroring how
  // Account/Contact references already work in this dialog.
  const DEST_FIELD = "industry_data.destination_ids";
  const hasDestination = React.useMemo(() => standard.some((f) => f.key === DEST_FIELD), [standard]);
  const { data: allDestinations = [] } = useQuery({
    queryKey: ["destinations", "filter-all"],
    queryFn: () => destinationsService.getDestinations({ limit: 100000 }).then((r) => r.destinations),
    staleTime: 5 * 60 * 1000,
    enabled: open && hasDestination,
  });
  const destMap = React.useMemo(() => {
    const m = new Map<string, string>();
    allDestinations.forEach((d) => m.set(d.id, d.name));
    return m;
  }, [allDestinations]);
  const destinationSearch = React.useCallback(
    async (q: string) => {
      const query = q.trim().toLowerCase();
      const base = query ? allDestinations.filter((d) => d.name.toLowerCase().includes(query)) : allDestinations;
      return base.slice(0, 50).map((d) => ({ id: d.id, name: d.name }));
    },
    [allDestinations],
  );

  const fieldByKey = React.useMemo(() => {
    const m = new Map<string, FieldMeta>();
    [...standard, ...custom].forEach((f) => m.set(f.key, f));
    return m;
  }, [standard, custom]);

  React.useEffect(() => {
    if (!open) return;
    setScope(view.scope || "all");
    setRows((view.filter_rules || []).map((r) => ({ field: r.field, operator: r.operator, value: r.value ?? "" })));
    setEditing(null);
    setDraft(null);
  }, [open, view]);

  // Resolve names for any reference ids in saved rules (so summaries show names).
  React.useEffect(() => {
    if (!open) return;
    (view.filter_rules || []).forEach((r) => {
      if (!r.value || labelCache[r.value]) return;
      if (accountRefs.has(r.field)) {
        accountService.getAccount(r.value).then((a) => setLabelCache((c) => ({ ...c, [r.value]: a.name }))).catch(() => {});
      } else if (contactRefs.has(r.field)) {
        contactsService
          .getContact(r.value)
          .then((c2: any) => {
            const nm = c2.full_name || `${c2.first_name || ""} ${c2.last_name || ""}`.trim() || r.value;
            setLabelCache((c) => ({ ...c, [r.value]: nm }));
          })
          .catch(() => {});
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, view]);

  // ── helpers ───────────────────────────────────────────────────────────────
  const optionsFor = (field: string): OptionList => lookupOptions[field] || [];
  const lookupName = (field: string, id: string) => {
    if (isRef(field)) return labelCache[id] || id;
    if (field === DEST_FIELD) return destMap.get(id) || labelCache[id] || id;
    return optionsFor(field).find((o) => o.id === id)?.name || id;
  };

  const opLabel = (type: LogicalType, op: string) =>
    operatorsForType(type).find((o) => o.value === op)?.label || op;

  const summaryFor = (row: Row): string => {
    const fm = fieldByKey.get(row.field);
    const type = fm?.type ?? "string";
    const arity = operatorArityForType(type, row.operator);
    const label = opLabel(type, row.operator);
    if (arity === "none") return label;
    if (arity === "two") {
      const v = Array.isArray(row.value) ? row.value : ["", ""];
      return `${label} ${v[0]} to ${v[1]}`;
    }
    const v = type === "lookup" ? lookupName(row.field, row.value) : row.value;
    return `${label} ${v ?? ""}`.trim();
  };

  // ── editor actions ──────────────────────────────────────────────────────────
  const openNew = () => {
    const first = standard[0];
    setDraft({ field: first.key, operator: operatorsForType(first.type)[0].value, value: "" });
    setEditing(-1);
  };
  const openEdit = (i: number) => {
    setDraft({ ...rows[i] });
    setEditing(i);
  };
  const patchDraft = (p: Partial<Row>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const onDraftField = (field: string) => {
    const type = fieldByKey.get(field)?.type ?? "string";
    setDraft({ field, operator: operatorsForType(type)[0].value, value: "" });
  };
  const commitDraft = () => {
    if (!draft) return;
    setRows((r) => {
      if (editing === -1) return [...r, draft];
      return r.map((row, i) => (i === editing ? draft : row));
    });
    setEditing(null);
    setDraft(null);
  };
  const removeRow = (i: number) => {
    setRows((r) => r.filter((_, idx) => idx !== i));
    if (editing === i) {
      setEditing(null);
      setDraft(null);
    }
  };
  const removeAll = () => {
    setRows([]);
    setEditing(null);
    setDraft(null);
  };

  const draftValueEditor = () => {
    if (!draft) return null;
    const type = fieldByKey.get(draft.field)?.type ?? "string";
    const arity = operatorArityForType(type, draft.operator);
    if (arity === "none") return <div className="text-xs text-muted-foreground">No value needed</div>;

    // Reference lookups (Account / Contact) → server search, unbounded option set.
    if (isRef(draft.field)) {
      const isAccount = accountRefs.has(draft.field);
      return (
        <AsyncEntitySelect
          value={draft.value || ""}
          label={draft.value ? labelCache[draft.value] : undefined}
          search={isAccount ? accountSearch : contactSearch}
          placeholder={isAccount ? "Search accounts…" : "Search contacts…"}
          onSelect={(id, name) => {
            patchDraft({ value: id });
            setLabelCache((c) => ({ ...c, [id]: name }));
          }}
        />
      );
    }

    // Destination → unbounded picklist; type-to-search (never a giant list).
    if (draft.field === DEST_FIELD) {
      return (
        <AsyncEntitySelect
          value={draft.value || ""}
          label={draft.value ? destMap.get(draft.value) || labelCache[draft.value] : undefined}
          search={destinationSearch}
          placeholder="Search destinations…"
          onSelect={(id, name) => {
            patchDraft({ value: id });
            setLabelCache((c) => ({ ...c, [id]: name }));
          }}
        />
      );
    }

    // Lookup / picklist fields → searchable pick from their values (never a raw
    // id box, and never an unsearchable wall of options).
    if (type === "lookup") {
      const options = optionsFor(draft.field);
      return (
        <SearchableSelect
          options={options.map((o) => ({ label: o.name, value: o.id }))}
          value={draft.value || ""}
          onValueChange={(v) => patchDraft({ value: v })}
          placeholder={options.length ? "Select…" : "Loading…"}
          searchPlaceholder="Search…"
          disabled={!options.length}
        />
      );
    }
    const inputType = type === "date" ? "date" : type === "number" ? "number" : "text";
    if (arity === "two") {
      const arr = Array.isArray(draft.value) ? draft.value : ["", ""];
      return (
        <div className="flex items-center gap-1">
          <Input type={inputType} value={arr[0] ?? ""} onChange={(e) => patchDraft({ value: [e.target.value, arr[1] ?? ""] })} className="h-9" />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type={inputType} value={arr[1] ?? ""} onChange={(e) => patchDraft({ value: [arr[0] ?? "", e.target.value] })} className="h-9" />
        </div>
      );
    }
    return <Input type={inputType} value={draft.value ?? ""} onChange={(e) => patchDraft({ value: e.target.value })} className="h-9" />;
  };

  const save = async () => {
    const filter_rules: FilterRule[] = rows
      .filter((r) => r.field && r.operator)
      .map((r) => {
        const type = fieldByKey.get(r.field)?.type ?? "string";
        const arity = operatorArityForType(type, r.operator);
        return arity === "none" ? { field: r.field, operator: r.operator } : { field: r.field, operator: r.operator, value: r.value };
      });
    setSaving(true);
    try {
      const updated = await entityViewsService.updateView(entity, view.id, { filter_rules, scope });
      toast.success("Filters saved");
      onSaved(updated);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to save filters");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        {/* Header — Cancel / Save (pr-12 clears the Sheet's built-in close X) */}
        <div className="flex items-center justify-between bg-primary px-4 py-3 pr-12 text-primary-foreground">
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <SheetTitle className="text-sm font-semibold text-primary-foreground">Edit List Filters</SheetTitle>
          <Button variant="secondary" size="sm" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* Show me */}
          <div className="rounded-md bg-muted/40 p-3">
            <div className="text-xs text-muted-foreground">Show me</div>
            <div className="mt-1 font-medium">
              All {entity === "personal_account" ? "person accounts" : "accounts"}
            </div>
          </div>

          {/* Committed filter rows */}
          {rows.map((row, i) => (
            <button
              key={i}
              type="button"
              onClick={() => openEdit(i)}
              className="flex w-full items-start justify-between rounded-md border p-3 text-left hover:bg-accent"
            >
              <div>
                <div className="text-sm font-medium">{fieldByKey.get(row.field)?.label || row.field}</div>
                <div className="text-xs text-muted-foreground">{summaryFor(row)}</div>
              </div>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  removeRow(i);
                }}
                className="ml-2 text-muted-foreground hover:text-destructive"
                aria-label="Remove filter"
              >
                <X className="h-4 w-4" />
              </span>
            </button>
          ))}

          {/* Add Filter / Remove All */}
          <div className="flex items-center justify-between">
            <Button type="button" variant="link" className="h-auto p-0" onClick={openNew}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Filter
            </Button>
            {rows.length > 0 && (
              <Button type="button" variant="link" className="h-auto p-0 text-muted-foreground" onClick={removeAll}>
                Remove All
              </Button>
            )}
          </div>

          {/* Inline editor */}
          {editing !== null && draft && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Fields</Label>
                <Select value={draft.field} onValueChange={onDraftField}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Field" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectGroup>
                      <SelectLabel className="border-b border-border bg-primary/10 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">Standard Fields</SelectLabel>
                      {standard.map((f) => (
                        <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                      ))}
                    </SelectGroup>
                    {custom.length > 0 && (
                      <SelectGroup>
                        <SelectLabel className="mt-1 border-t border-border bg-primary/10 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">Custom Fields</SelectLabel>
                        {custom.map((f) => (
                          <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Operator</Label>
                <Select value={draft.operator} onValueChange={(v) => patchDraft({ operator: v, value: "" })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Operator" /></SelectTrigger>
                  <SelectContent>
                    {operatorsForType(fieldByKey.get(draft.field)?.type ?? "string").map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">value</Label>
                {draftValueEditor()}
              </div>

              <div className="flex justify-end">
                <Button type="button" size="sm" onClick={commitDraft}>Done</Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
