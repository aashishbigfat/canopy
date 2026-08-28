"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { territoryService, type Region } from "@/lib/api/services/territory.service";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  region?: Region | null;
  regions: Region[];
  onSaved: () => void;
}

const EMPTY: Omit<Region, "id"> = {
  name: "",
  code: "",
  description: "",
  parent_id: null,
  manager_id: null,
  currency: "",
  timezone: "",
  is_active: true,
};

export function RegionFormDialog({ open, onOpenChange, region, regions, onSaved }: Props) {
  const [form, setForm] = useState<Omit<Region, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (region) {
      const { id: _id, ...rest } = region;
      setForm({ ...EMPTY, ...rest });
    } else {
      setForm(EMPTY);
    }
  }, [region, open]);

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      if (region) {
        await territoryService.updateRegion(region.id, form);
        toast.success("Region updated");
      } else {
        await territoryService.createRegion(form);
        toast.success("Region created");
      }
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Exclude self + descendants from parent options to prevent cycles.
  const parentOptions = regions.filter((r) => r.id !== region?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{region ? "Edit Region" : "Create Region"}</DialogTitle>
          <DialogDescription>
            Regions group territories (e.g. North India, EMEA). They can nest under a parent.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="rname">Name *</Label>
            <Input
              id="rname"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="rcode">Code</Label>
              <Input
                id="rcode"
                value={form.code || ""}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Parent Region</Label>
              <Select
                value={form.parent_id || "__none__"}
                onValueChange={(v) =>
                  setForm({ ...form, parent_id: v === "__none__" ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {parentOptions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="rcurr">Currency</Label>
              <Input
                id="rcurr"
                placeholder="INR"
                value={form.currency || ""}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rtz">Timezone</Label>
              <Input
                id="rtz"
                placeholder="Asia/Kolkata"
                value={form.timezone || ""}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rdesc">Description</Label>
            <Textarea
              id="rdesc"
              rows={2}
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Switch
              id="ractive"
              checked={form.is_active ?? true}
              onCheckedChange={(v) => setForm({ ...form, is_active: v })}
            />
            <Label htmlFor="ractive" className="cursor-pointer">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {region ? "Save Changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
