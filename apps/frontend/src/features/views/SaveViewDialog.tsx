"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  entityViewsService,
  type EntityView,
} from "@/lib/api/services/entity-views.service";
import type { EntityType } from "@/lib/api/services/field-registry.service";

export type SaveViewMode = "new" | "rename" | "share";

const TITLES: Record<SaveViewMode, string> = {
  new: "Add New List View",
  rename: "Rename List View",
  share: "Sharing Settings",
};

/**
 * Create / rename / re-share a saved list view. The "Who sees this list view?"
 * radio maps to EntityView.is_public (Only I = private, All users = public).
 */
export function SaveViewDialog({
  open,
  onOpenChange,
  entity,
  mode,
  view,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entity: EntityType;
  mode: SaveViewMode;
  view?: EntityView | null;
  onSaved: (view: EntityView) => void;
}) {
  const [name, setName] = React.useState("");
  const [isPublic, setIsPublic] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setName(mode === "new" ? "" : view?.name ?? "");
    setIsPublic(mode === "new" ? false : !!view?.is_public);
  }, [open, mode, view]);

  const save = async () => {
    const trimmed = name.trim();
    if (mode !== "share" && !trimmed) {
      toast.error("Please enter a view name");
      return;
    }
    setSaving(true);
    try {
      let result: EntityView;
      if (mode === "new") {
        result = await entityViewsService.createView(entity, {
          name: trimmed,
          is_public: isPublic,
        });
      } else {
        if (!view) return;
        result = await entityViewsService.updateView(entity, view.id, {
          ...(mode === "rename" ? { name: trimmed } : {}),
          ...(mode === "share" ? { is_public: isPublic } : {}),
        });
      }
      toast.success(mode === "new" ? "View added" : "View updated");
      onSaved(result);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to save view");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{TITLES[mode]}</DialogTitle>
          {mode === "new" && (
            <DialogDescription>Fill the form and add the list view.</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {mode !== "share" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">List Name</Label>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My accounts"
              />
            </div>
          )}

          {mode !== "rename" && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Who sees this list view?
              </Label>
              <RadioGroup
                value={isPublic ? "public" : "private"}
                onValueChange={(v) => setIsPublic(v === "public")}
              >
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="private" /> Only I can see this list view
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="public" /> All users can see this list view
                </label>
              </RadioGroup>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : mode === "new" ? "Add" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
