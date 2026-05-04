"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  picklistsService,
  type PicklistType,
  type PicklistItem,
} from "@/lib/api/services/picklists.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, GripVertical, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PICKLIST_TYPES: { key: PicklistType; label: string }[] = [
  { key: "lead_status", label: "Lead Status" },
  { key: "sales_stage", label: "Sales Stage" },
  { key: "opportunity_type", label: "Opportunity Type" },
  { key: "opportunity_tag", label: "Opportunity Tag" },
  { key: "experience", label: "Experience" },
  { key: "industry", label: "Industry" },
  { key: "rating", label: "Rating" },
  { key: "account_type", label: "Account Type" },
  { key: "account_source", label: "Account Source" },
  { key: "source", label: "Source" },
  { key: "source_medium", label: "Source Medium" },
  { key: "supplier_service", label: "Supplier Service" },
  { key: "supplier_type", label: "Supplier Type" },
  { key: "supplier_rating", label: "Supplier Rating" },
  { key: "salutation", label: "Salutation" },
  { key: "task_priority", label: "Task Priority" },
  { key: "task_status", label: "Task Status" },
  { key: "category", label: "Category" },
  { key: "inclusion", label: "Inclusion" },
  { key: "itinerary_inclusion", label: "Itinerary Inclusion" },
  { key: "destination", label: "Destination" },
];

export function PicklistsManager({ type }: { type: PicklistType }) {
  const [items, setItems] = useState<PicklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", description: "", is_active: true });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const rows = await picklistsService.list(type);
      setItems(rows);
    } catch {
      toast.error("Failed to load picklist items");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  async function handleCreate() {
    if (!draft.name) {
      toast.error("Name required");
      return;
    }
    setSaving(true);
    try {
      await picklistsService.create(type, draft);
      toast.success("Created");
      setOpen(false);
      setDraft({ name: "", description: "", is_active: true });
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: PicklistItem) {
    try {
      await picklistsService.update(type, item.id, { is_active: !item.is_active });
      setItems((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, is_active: !item.is_active } : p)),
      );
    } catch {
      toast.error("Toggle failed");
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this item?")) return;
    try {
      await picklistsService.delete(type, id);
      setItems((prev) => prev.filter((p) => p.id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
    }
  }

  async function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...items];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setItems(next);
    await picklistsService.sort(
      type,
      next.map((it, i) => ({ id: it.id, sorting: i + 1 })),
    );
  }

  async function moveDown(idx: number) {
    if (idx === items.length - 1) return;
    const next = [...items];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setItems(next);
    await picklistsService.sort(
      type,
      next.map((it, i) => ({ id: it.id, sorting: i + 1 })),
    );
  }

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-1 border-b">
        {PICKLIST_TYPES.map((t) => (
          <Link
            key={t.key}
            href={`/settings/picklists/${t.key}`}
            className={cn(
              "rounded-t-md border border-b-0 px-3 py-2 text-sm",
              t.key === type
                ? "border-input bg-background font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {PICKLIST_TYPES.find((p) => p.key === type)?.label || type}
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage dropdown values used across the app.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add picklist value</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>Name</Label>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={draft.is_active}
                  onCheckedChange={(v: boolean) => setDraft({ ...draft, is_active: v })}
                />
                <Label>Active</Label>
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
          No values yet. Click <strong>New</strong> to add one.
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-left">
              <tr>
                <th className="w-10 px-3 py-2"></th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Active</th>
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
                  <td className="px-3 py-2 font-medium">{item.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{item.description || "—"}</td>
                  <td className="px-3 py-2">
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={() => toggleActive(item)}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => deleteItem(item.id)}>
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
