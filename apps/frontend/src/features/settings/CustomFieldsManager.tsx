"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  customFieldsService,
  type AdditionalField,
  type AdditionalFieldCreate,
  type EntityType,
} from "@/lib/api/services/field-registry.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, GripVertical, Loader2 } from "lucide-react";

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Long Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "Date & Time" },
  { value: "checkbox", label: "Checkbox" },
  { value: "dropdown", label: "Dropdown" },
  { value: "multiselect", label: "Multi-select" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "url", label: "URL" },
];

export function CustomFieldsManager({ entity }: { entity: EntityType }) {
  const [items, setItems] = useState<AdditionalField[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AdditionalFieldCreate>({
    name: "",
    label: "",
    field_type: "text",
    is_active: true,
    is_mandatory: false,
    options: [],
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const rows = await customFieldsService.list(entity);
      setItems(rows);
    } catch (e) {
      toast.error("Failed to load custom fields");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity]);

  async function handleCreate() {
    if (!draft.name) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const optionsArr =
        draft.field_type === "dropdown" || draft.field_type === "multiselect"
          ? (typeof draft.options === "string"
              ? (draft.options as unknown as string).split(",").map((s) => s.trim()).filter(Boolean)
              : draft.options)
          : [];
      await customFieldsService.create(entity, { ...draft, options: optionsArr });
      toast.success("Field created");
      setOpen(false);
      setDraft({
        name: "",
        label: "",
        field_type: "text",
        is_active: true,
        is_mandatory: false,
        options: [],
      });
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: AdditionalField) {
    try {
      await customFieldsService.toggleStatus(entity, item.id, !item.is_active);
      setItems((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, is_active: !item.is_active } : p)),
      );
    } catch (e) {
      toast.error("Toggle failed");
    }
  }

  async function toggleMandatory(item: AdditionalField) {
    try {
      await customFieldsService.toggleMandatory(entity, item.id, !item.is_mandatory);
      setItems((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, is_mandatory: !item.is_mandatory } : p)),
      );
    } catch (e) {
      toast.error("Toggle failed");
    }
  }

  async function deleteField(id: string) {
    if (!confirm("Delete this field? Existing values will be lost.")) return;
    try {
      await customFieldsService.delete(entity, id);
      setItems((prev) => prev.filter((p) => p.id !== id));
      toast.success("Deleted");
    } catch (e) {
      toast.error("Delete failed");
    }
  }

  async function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...items];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setItems(next);
    await customFieldsService.sort(
      entity,
      next.map((it, i) => ({ id: it.id, sorting: i + 1 })),
    );
  }

  async function moveDown(idx: number) {
    if (idx === items.length - 1) return;
    const next = [...items];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setItems(next);
    await customFieldsService.sort(
      entity,
      next.map((it, i) => ({ id: it.id, sorting: i + 1 })),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Custom Fields</h2>
          <p className="text-sm text-muted-foreground">
            Add tenant-specific fields to every {entity} record.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Field
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New custom field — {entity}</DialogTitle>
              <DialogDescription>Define a new field for this entity.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>Name (machine name)</Label>
                <Input
                  placeholder="e.g. travel_passport_no"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Label (display)</Label>
                <Input
                  placeholder="e.g. Passport Number"
                  value={draft.label || ""}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={draft.field_type}
                  onValueChange={(v) => setDraft({ ...draft, field_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(draft.field_type === "dropdown" || draft.field_type === "multiselect") && (
                <div>
                  <Label>Options (comma-separated)</Label>
                  <Input
                    placeholder="Option A, Option B, Option C"
                    value={(draft.options as any) || ""}
                    onChange={(e) =>
                      setDraft({ ...draft, options: e.target.value as any })
                    }
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch
                  checked={!!draft.is_mandatory}
                  onCheckedChange={(v: boolean) => setDraft({ ...draft, is_mandatory: v })}
                />
                <Label>Mandatory</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          No custom fields yet. Click <strong>New Field</strong> to add one.
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="crm-table-header">
              <tr>
                <th className="w-10 px-3 py-2"></th>
                <th className="px-3 py-2">Name / Label</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2">Mandatory</th>
                <th className="px-3 py-2 text-right">Actions</th>
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
                    <div className="font-medium">{item.label || item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.name}</div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{item.field_type}</td>
                  <td className="px-3 py-2">
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={() => toggleActive(item)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Switch
                      checked={item.is_mandatory}
                      onCheckedChange={() => toggleMandatory(item)}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteField(item.id)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
