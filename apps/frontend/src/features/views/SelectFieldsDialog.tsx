"use client";

import * as React from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  entityViewsService,
  type EntityView,
} from "@/lib/api/services/entity-views.service";
import {
  customFieldsService,
  type EntityType,
} from "@/lib/api/services/field-registry.service";
import { DualListbox, type DualItem } from "./DualListbox";
import { standardFieldsFor, standardFieldByKey, realCustomFields, defaultColumnsFor } from "./accountFields";

const ADD = "additional:";

/**
 * "Select Fields to display" — choose & order columns for a saved view.
 * Standard fields (full catalog) and Additional (custom) fields have separate
 * transfer lists; each Available list excludes whatever is already Visible.
 * Saved as EntityView.display_columns (standard keys + "additional:<id>").
 */
export function SelectFieldsDialog({
  open,
  onOpenChange,
  entity,
  view,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entity: EntityType;
  view: EntityView;
  onSaved: (view: EntityView) => void;
}) {
  const [visStd, setVisStd] = React.useState<DualItem[]>([]);
  const [visAdd, setVisAdd] = React.useState<DualItem[]>([]);
  const [saving, setSaving] = React.useState(false);
  const seededRef = React.useRef(false);

  const standard = React.useMemo(() => standardFieldsFor(entity), [entity]);
  const stdLabel = React.useMemo(() => standardFieldByKey(entity), [entity]);

  const customQ = useQuery({
    queryKey: ["custom-fields", entity],
    queryFn: () => customFieldsService.list(entity, true),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });
  // Drop additional-field records that merely duplicate standard fields, so the
  // "Additional Fields" lists show only genuine custom fields.
  const addFields = React.useMemo(
    () => realCustomFields(entity, customQ.data ?? []),
    [customQ.data, entity],
  );
  const addLabel = React.useMemo(() => {
    const m = new Map<string, string>();
    addFields.forEach((f) => m.set(f.id, f.label || f.name));
    return m;
  }, [addFields]);

  // Seed Visible lists once per open, after custom fields have settled (so the
  // saved additional columns get proper labels). Never re-seed — that would
  // discard the user's in-dialog moves.
  React.useEffect(() => {
    if (!open) {
      seededRef.current = false;
      return;
    }
    if (seededRef.current || !customQ.isSuccess) return;
    const cols =
      view.display_columns && view.display_columns.length
        ? view.display_columns
        : defaultColumnsFor(entity);
    const std: DualItem[] = [];
    const add: DualItem[] = [];
    cols.forEach((key) => {
      if (key.startsWith(ADD)) {
        const id = key.slice(ADD.length);
        add.push({ key, label: addLabel.get(id) || id });
      } else {
        std.push({ key, label: stdLabel.get(key)?.label || key });
      }
    });
    setVisStd(std);
    setVisAdd(add);
    seededRef.current = true;
  }, [open, customQ.isSuccess, view, entity, addLabel, stdLabel]);

  // Available = catalog/custom MINUS whatever is already Visible.
  const availStd: DualItem[] = React.useMemo(() => {
    const chosen = new Set(visStd.map((i) => i.key));
    return standard
      .filter((f) => !chosen.has(f.key))
      .map((f) => ({ key: f.key, label: f.label }));
  }, [standard, visStd]);

  const availAdd: DualItem[] = React.useMemo(() => {
    const chosen = new Set(visAdd.map((i) => i.key));
    return addFields
      .filter((f) => !chosen.has(ADD + f.id))
      .map((f) => ({ key: ADD + f.id, label: f.label || f.name }));
  }, [addFields, visAdd]);

  const save = async () => {
    const display_columns = [...visStd.map((i) => i.key), ...visAdd.map((i) => i.key)];
    if (display_columns.length === 0) {
      toast.error("Select at least one field to display");
      return;
    }
    setSaving(true);
    try {
      const updated = await entityViewsService.updateView(entity, view.id, { display_columns });
      toast.success("Columns updated");
      onSaved(updated);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to update columns");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Select Fields to Display</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <DualListbox
            available={availStd}
            value={visStd}
            onChange={setVisStd}
            availableLabel="Available Standard Fields"
            visibleLabel="Visible Standard Fields"
          />
          <DualListbox
            available={availAdd}
            value={visAdd}
            onChange={setVisAdd}
            availableLabel="Available Additional Fields"
            visibleLabel="Visible Additional Fields"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
