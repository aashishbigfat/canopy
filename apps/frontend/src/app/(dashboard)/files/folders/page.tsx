"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  filesExtraService,
  type FileFolder,
} from "@/lib/api/services/files-extra.service";
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
import { Plus, Trash2, Folder, Loader2 } from "lucide-react";

export default function FileFoldersPage() {
  const [items, setItems] = useState<FileFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", description: "", is_public: false });

  async function load() {
    setLoading(true);
    try {
      setItems(await filesExtraService.listFolders());
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
    if (!draft.name) return toast.error("Name required");
    try {
      await filesExtraService.createFolder(draft);
      setOpen(false);
      setDraft({ name: "", description: "", is_public: false });
      await load();
    } catch {
      toast.error("Create failed");
    }
  }

  return (
    <div className="p-6 max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">File Folders</h1>
          <p className="text-sm text-muted-foreground">Group your files. Share with users or whole tenant.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New folder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New folder</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>Name</Label>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
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
                  checked={draft.is_public}
                  onCheckedChange={(v: boolean) => setDraft({ ...draft, is_public: v })}
                />
                <Label>Visible to whole tenant</Label>
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
          No folders yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((f) => (
            <div key={f.id} className="rounded-lg border p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4 text-amber-600" />
                  <div className="font-semibold">{f.name}</div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    if (confirm("Delete folder?")) {
                      await filesExtraService.deleteFolder(f.id);
                      await load();
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {f.description && (
                <p className="text-sm text-muted-foreground">{f.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
