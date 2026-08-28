"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  dashboardsExtraService,
  type QuickLink,
} from "@/lib/api/services/dashboards-extra.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, ExternalLink, Link as LinkIcon } from "lucide-react";

export function QuickLinksWidget() {
  const [items, setItems] = useState<QuickLink[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ label: "", url: "", icon: "" });

  async function load() {
    try {
      setItems(await dashboardsExtraService.listQuickLinks());
    } catch {
      // silent
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function save() {
    if (!draft.label || !draft.url) return toast.error("Label and URL required");
    try {
      await dashboardsExtraService.saveQuickLink(draft);
      setOpen(false);
      setDraft({ label: "", url: "", icon: "" });
      await load();
    } catch {
      toast.error("Save failed");
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold">
          <LinkIcon className="h-4 w-4 text-primary" />
          Quick links
        </h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add quick link</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>Label</Label>
                <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
              </div>
              <div>
                <Label>URL</Label>
                <Input
                  type="url"
                  value={draft.url}
                  onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No links yet. Click <strong>+</strong> to add one.
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between rounded-md p-2 hover:bg-muted/40"
            >
              <a
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center gap-2 text-sm hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {l.label}
              </a>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                onClick={async () => {
                  await dashboardsExtraService.deleteQuickLink(l.id);
                  await load();
                }}
                aria-label="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
