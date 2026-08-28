"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  searchExtrasService,
  type SupplierTemplate,
} from "@/lib/api/services/search-extras.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus, Trash2 } from "lucide-react";

export default function SupplierTemplatesPage() {
  const [items, setItems] = useState<SupplierTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", subject: "", body_html: "" });

  async function load() {
    setLoading(true);
    try {
      setItems(await searchExtrasService.listSupplierTemplates());
    } catch {
      toast.error("Load failed");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function create() {
    if (!draft.name || !draft.subject) return toast.error("Name and subject required");
    try {
      await searchExtrasService.createSupplierTemplate(draft);
      setOpen(false);
      setDraft({ name: "", subject: "", body_html: "" });
      await load();
    } catch {
      toast.error("Create failed");
    }
  }

  return (
    <div className="p-6 max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Supplier email templates</h1>
          <p className="text-sm text-muted-foreground">RFQ + supplier outreach templates.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New supplier template</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>Name</Label>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div>
                <Label>Subject</Label>
                <Input
                  value={draft.subject}
                  onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                />
              </div>
              <div>
                <Label>Body</Label>
                <Textarea
                  rows={8}
                  value={draft.body_html}
                  onChange={(e) => setDraft({ ...draft, body_html: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={create}>Create</Button>
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
          No templates yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((t) => (
            <div key={t.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-sm text-muted-foreground">{t.subject}</div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await searchExtrasService.deleteSupplierTemplate(t.id);
                    await load();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
