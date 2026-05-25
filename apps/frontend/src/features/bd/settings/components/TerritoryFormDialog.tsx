"use client";

import { useEffect, useMemo, useState } from "react";
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
import { territoryService, type Territory, type Region } from "@/lib/api/services/territory.service";
import { usersExtraService } from "@/lib/api/services/users-extra.service";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  territory?: Territory | null;
  regions: Region[];
  onSaved: () => void;
}

const EMPTY: Omit<Territory, "id" | "region_name"> = {
  name: "",
  code: "",
  description: "",
  region_id: "",
  parent_territory_id: null,
  countries: [],
  states: [],
  postal_codes: [],
  users: [],
  manager_id: null,
  assignment_type: "geographic",
  is_active: true,
};

function csv(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function TerritoryFormDialog({ open, onOpenChange, territory, regions, onSaved }: Props) {
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [users, setUsers] = useState<Array<{ id: string; name: string; email?: string }>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    usersExtraService
      .getAllActive()
      .then((data: any) => {
        const arr = Array.isArray(data) ? data : data?.users || [];
        setUsers(
          arr.map((u: any) => ({ id: u.id || u._id, name: u.name, email: u.email }))
        );
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (territory) {
      const { id: _id, region_name: _rn, ...rest } = territory;
      setForm({ ...EMPTY, ...rest });
    } else {
      setForm(EMPTY);
    }
  }, [territory, open]);

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const toggleUser = (uid: string) => {
    setForm((f) => ({
      ...f,
      users: f.users.includes(uid) ? f.users.filter((x) => x !== uid) : [...f.users, uid],
    }));
  };

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.region_id) return toast.error("Region is required");
    setSaving(true);
    try {
      if (territory) {
        await territoryService.updateTerritory(territory.id, form);
        toast.success("Territory updated");
      } else {
        await territoryService.createTerritory(form);
        toast.success("Territory created");
      }
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{territory ? "Edit Territory" : "Create Territory"}</DialogTitle>
          <DialogDescription>
            Territories are geo-matched to leads via postal code → state → country in that priority.
            Wildcards like &ldquo;56*&rdquo; match any postal code starting with 56.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="tname">Name *</Label>
              <Input
                id="tname"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tcode">Code</Label>
              <Input
                id="tcode"
                value={form.code || ""}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Region *</Label>
              <Select
                value={form.region_id}
                onValueChange={(v) => setForm({ ...form, region_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Assignment Type</Label>
              <Select
                value={form.assignment_type || "geographic"}
                onValueChange={(v) =>
                  setForm({ ...form, assignment_type: v as Territory["assignment_type"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="geographic">Geographic</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="rule_based">Rule-based</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="tctry">Countries (comma-separated codes/names)</Label>
            <Input
              id="tctry"
              placeholder="IN, US, GB"
              value={(form.countries || []).join(", ")}
              onChange={(e) => setForm({ ...form, countries: csv(e.target.value) })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tst">States (comma-separated)</Label>
            <Input
              id="tst"
              placeholder="KA, MH, TN"
              value={(form.states || []).join(", ")}
              onChange={(e) => setForm({ ...form, states: csv(e.target.value) })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tpc">Postal codes (comma-separated; use * for wildcards)</Label>
            <Input
              id="tpc"
              placeholder="560001, 56*, 700*"
              value={(form.postal_codes || []).join(", ")}
              onChange={(e) => setForm({ ...form, postal_codes: csv(e.target.value) })}
            />
          </div>

          <div className="grid gap-1.5">
            <Label>BD Users (selectable for territory)</Label>
            <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
              {users.length === 0 && (
                <p className="text-xs text-muted-foreground">No active users in this tenant.</p>
              )}
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.users.includes(u.id)}
                    onChange={() => toggleUser(u.id)}
                  />
                  <span>{u.name}</span>
                  {u.email && <span className="text-muted-foreground text-xs">{u.email}</span>}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {form.users.length} user(s) selected. Round-robin uses oldest last_assigned_at.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Territory Manager</Label>
              <Select
                value={form.manager_id || "__none__"}
                onValueChange={(v) =>
                  setForm({ ...form, manager_id: v === "__none__" ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-7">
              <Switch
                id="tactive"
                checked={form.is_active ?? true}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label htmlFor="tactive" className="cursor-pointer">Active</Label>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="tdesc">Description</Label>
            <Textarea
              id="tdesc"
              rows={2}
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {territory ? "Save Changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
