"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  standardFieldsService,
  type StandardField,
  type EntityType,
} from "@/lib/api/services/field-registry.service";
import { Switch } from "@/components/ui/switch";
import { Loader2, GripVertical, ShieldCheck } from "lucide-react";

export function StandardFieldsManager({ entity }: { entity: EntityType }) {
  const [items, setItems] = useState<StandardField[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const rows = await standardFieldsService.list(entity);
      setItems(rows);
    } catch (e) {
      toast.error("Failed to load standard fields");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity]);

  async function toggleActive(item: StandardField) {
    if (item.system_mandatory) {
      toast.error("System-mandatory fields cannot be deactivated");
      return;
    }
    try {
      await standardFieldsService.toggleStatus(entity, item.id, !item.is_active);
      setItems((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, is_active: !item.is_active } : p)),
      );
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Toggle failed");
    }
  }

  async function toggleMandatory(item: StandardField) {
    if (item.system_mandatory) {
      toast.error("System-mandatory cannot be unset");
      return;
    }
    try {
      await standardFieldsService.toggleMandatory(entity, item.id, !item.is_mandatory);
      setItems((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, is_mandatory: !item.is_mandatory } : p)),
      );
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Toggle failed");
    }
  }

  async function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...items];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setItems(next);
    await standardFieldsService.sort(
      entity,
      next.map((it, i) => ({ id: it.id, sorting: i + 1 })),
    );
  }

  async function moveDown(idx: number) {
    if (idx === items.length - 1) return;
    const next = [...items];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setItems(next);
    await standardFieldsService.sort(
      entity,
      next.map((it, i) => ({ id: it.id, sorting: i + 1 })),
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Standard Fields</h2>
        <p className="text-sm text-muted-foreground">
          Configure built-in fields. System-mandatory fields cannot be turned off.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          No standard fields registered for {entity}. Default fields will populate on first use.
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-left">
              <tr>
                <th className="w-10 px-3 py-2"></th>
                <th className="px-3 py-2">Field</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2">Mandatory</th>
                <th className="px-3 py-2 text-right">System</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 text-muted-foreground">
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        className="hover:text-foreground"
                        onClick={() => moveUp(idx)}
                        disabled={idx === 0}
                        aria-label="Move up"
                      >
                        <GripVertical className="h-3 w-3 rotate-180" />
                      </button>
                      <button
                        type="button"
                        className="hover:text-foreground"
                        onClick={() => moveDown(idx)}
                        disabled={idx === items.length - 1}
                        aria-label="Move down"
                      >
                        <GripVertical className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{item.label || item.field_key}</div>
                    <div className="text-xs text-muted-foreground">{item.field_key}</div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{item.field_type}</td>
                  <td className="px-3 py-2">
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={() => toggleActive(item)}
                      disabled={item.system_mandatory}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Switch
                      checked={item.is_mandatory}
                      onCheckedChange={() => toggleMandatory(item)}
                      disabled={item.system_mandatory}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    {item.system_mandatory ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                        <ShieldCheck className="h-3 w-3" />
                        locked
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
