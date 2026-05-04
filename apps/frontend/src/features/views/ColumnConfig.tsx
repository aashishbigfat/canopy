"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Columns, GripVertical, Loader2 } from "lucide-react";
import {
  entityViewsService,
  type EntityColumn,
} from "@/lib/api/services/entity-views.service";
import type { EntityType } from "@/lib/api/services/field-registry.service";

export function ColumnConfig({ entity }: { entity: EntityType }) {
  const [open, setOpen] = useState(false);
  const [columns, setColumns] = useState<EntityColumn[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setColumns(await entityViewsService.listColumns(entity));
    } catch {
      toast.error("Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function toggleVisible(col: EntityColumn) {
    try {
      const updated = await entityViewsService.updateColumn(entity, col.id, {
        ...col,
        is_visible: !col.is_visible,
      });
      setColumns((arr) => arr.map((c) => (c.id === col.id ? updated : c)));
    } catch {
      toast.error("Update failed");
    }
  }

  async function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= columns.length) return;
    const next = [...columns];
    [next[idx], next[j]] = [next[j], next[idx]];
    setColumns(next);
    await entityViewsService.sortColumns(
      entity,
      next.map((c, i) => ({ id: c.id, sorting: i + 1 })),
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns className="mr-1 h-3 w-3" />
          Columns
        </Button>
      </SheetTrigger>
      <SheetContent className="w-96">
        <SheetHeader>
          <SheetTitle>Configure columns</SheetTitle>
          <SheetDescription>Toggle visibility and reorder columns.</SheetDescription>
        </SheetHeader>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : columns.length === 0 ? (
          <div className="mt-6 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No columns configured. Default columns will populate after first record.
          </div>
        ) : (
          <ul className="mt-6 space-y-1">
            {columns.map((c, idx) => (
              <li
                key={c.id}
                className="flex items-center gap-2 rounded-md border bg-card p-2"
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={idx === 0}
                    onClick={() => move(idx, -1)}
                    aria-label="Up"
                  >
                    <GripVertical className="h-3 w-3 rotate-180" />
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={idx === columns.length - 1}
                    onClick={() => move(idx, 1)}
                    aria-label="Down"
                  >
                    <GripVertical className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{c.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.field_key}
                    {c.is_additional && " · custom"}
                  </div>
                </div>
                <Switch
                  checked={c.is_visible}
                  onCheckedChange={() => toggleVisible(c)}
                />
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}
