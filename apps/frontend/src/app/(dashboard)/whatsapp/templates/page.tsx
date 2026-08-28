"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { messagingService, type WhatsAppTemplate } from "@/lib/api/services/messaging.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Loader2 } from "lucide-react";

const CATS = ["MARKETING", "UTILITY", "AUTHENTICATION"] as const;

export default function WhatsAppTemplatesPage() {
  const [items, setItems] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    language: "en",
    category: "MARKETING",
    body: "",
    header: "",
    footer: "",
  });

  async function load() {
    setLoading(true);
    try {
      setItems(await messagingService.listTemplates());
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
    if (!draft.name || !draft.body) {
      toast.error("Name and body required");
      return;
    }
    try {
      await messagingService.createTemplate(draft);
      setOpen(false);
      setDraft({ name: "", language: "en", category: "MARKETING", body: "", header: "", footer: "" });
      await load();
      toast.success("Template created");
    } catch {
      toast.error("Create failed");
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">WhatsApp Templates</h1>
          <p className="text-sm text-muted-foreground">
            Pre-approved message templates for WhatsApp Business.
          </p>
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
              <DialogTitle>New template</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>Name</Label>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Language</Label>
                  <Input
                    value={draft.language}
                    onChange={(e) => setDraft({ ...draft, language: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={draft.category}
                    onValueChange={(v) => setDraft({ ...draft, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Header (optional)</Label>
                <Input
                  value={draft.header}
                  onChange={(e) => setDraft({ ...draft, header: e.target.value })}
                />
              </div>
              <div>
                <Label>Body</Label>
                <Textarea
                  rows={4}
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                />
              </div>
              <div>
                <Label>Footer (optional)</Label>
                <Input
                  value={draft.footer}
                  onChange={(e) => setDraft({ ...draft, footer: e.target.value })}
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <div key={t.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{t.name}</div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await messagingService.deleteTemplate(t.id);
                    await load();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded bg-muted px-1.5 py-0.5">{t.category}</span>
                <span>·</span>
                <span>{t.language}</span>
                <span>·</span>
                <span
                  className={
                    t.status === "approved" ? "text-green-600" : "text-muted-foreground"
                  }
                >
                  {t.status}
                </span>
              </div>
              <pre className="whitespace-pre-wrap rounded bg-muted/30 p-2 text-xs">
                {t.body}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
