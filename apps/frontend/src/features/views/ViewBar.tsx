"use client";

import { useState } from "react";
import { toast } from "sonner";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pin, PinOff, Plus, ChevronDown, Trash2 } from "lucide-react";
import { useEntityView } from "./useEntityView";
import type { EntityType } from "@/lib/api/services/field-registry.service";

export function ViewBar({
  entity,
  onViewChange,
  currentFilters,
}: {
  entity: EntityType;
  onViewChange?: (filters: Record<string, any> | null) => void;
  currentFilters?: Record<string, any>;
}) {
  const {
    views,
    activeView,
    activeViewId,
    setActiveViewId,
    pin,
    unpin,
    isPinned,
    deleteView,
    createView,
    pinned,
  } = useEntityView(entity);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) {
      toast.error("Name required");
      return;
    }
    setSaving(true);
    try {
      const v = await createView({
        name,
        filters: currentFilters || {},
        is_public: isPublic,
      });
      setActiveViewId(v.id);
      onViewChange?.(v.filters);
      toast.success("View saved");
      setOpen(false);
      setName("");
      setIsPublic(false);
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  function selectView(id: string | null) {
    setActiveViewId(id);
    if (!id) {
      onViewChange?.(null);
      return;
    }
    const v = views.find((x) => x.id === id);
    if (v) onViewChange?.(v.filters);
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {activeView ? activeView.name : "All records"}
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Views</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => selectView(null)}>All records</DropdownMenuItem>
          <DropdownMenuSeparator />
          {pinned.length > 0 && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Pinned
              </DropdownMenuLabel>
              {pinned.map((p) => {
                const v = views.find((x) => x.id === p.view_id);
                if (!v) return null;
                return (
                  <DropdownMenuItem key={p.id} onClick={() => selectView(v.id)}>
                    <Pin className="mr-2 h-3 w-3" />
                    {v.name}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuLabel className="text-xs text-muted-foreground">All views</DropdownMenuLabel>
          {views.length === 0 && (
            <DropdownMenuItem disabled>No saved views</DropdownMenuItem>
          )}
          {views.map((v) => (
            <DropdownMenuItem
              key={v.id}
              onClick={() => selectView(v.id)}
              className="flex items-center justify-between"
            >
              <span>{v.name}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isPinned(v.id)) unpin(v.id);
                    else pin(v.id);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={isPinned(v.id) ? "Unpin" : "Pin"}
                >
                  {isPinned(v.id) ? (
                    <PinOff className="h-3 w-3" />
                  ) : (
                    <Pin className="h-3 w-3" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete view?")) void deleteView(v.id);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="mr-1 h-3 w-3" />
            Save current
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save view</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={isPublic}
                onCheckedChange={(v: boolean) => setIsPublic(v)}
              />
              <Label>Visible to whole tenant</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
