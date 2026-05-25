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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { usePicklist } from "@/hooks/use-picklist";
import { usersExtraService } from "@/lib/api/services/users-extra.service";
import { useCreateBDVisit, useUpdateBDVisit } from "../api/useBDVisits";
import type { BDVisit, BDVisitableType, BDVisitCreateData } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  visit?: BDVisit | null;
  /** When provided, pre-fills the parent target (Lead/Opp/Account/Contact). */
  defaults?: Partial<BDVisitCreateData> & {
    parent_name?: string;
  };
  onSaved?: () => void;
}

function toLocalInputValue(iso?: string | null): string {
  if (!iso) {
    // default = today + 1 day at 10:00 local
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  }
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export function VisitFormDialog({ open, onOpenChange, visit, defaults, onSaved }: Props) {
  const { items: activityTypes } = usePicklist("bd_activity_type");
  const create = useCreateBDVisit();
  const update = useUpdateBDVisit();

  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [title, setTitle] = useState("");
  const [activityTypeId, setActivityTypeId] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [duration, setDuration] = useState<number>(30);
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState<string>("");
  const [visitableType, setVisitableType] = useState<BDVisitableType>("Lead");
  const [visitableId, setVisitableId] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    usersExtraService.getAllActive().then((data: any) => {
      const arr = Array.isArray(data) ? data : data?.users || [];
      setUsers(arr.map((u: any) => ({ id: u.id || u._id, name: u.name })));
    }).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (visit) {
      setTitle(visit.title);
      setActivityTypeId(visit.activity_type_id || "");
      setScheduledDate(toLocalInputValue(visit.scheduled_date));
      setDuration(visit.scheduled_duration_min);
      setDescription(visit.description || "");
      setOwnerId(visit.owner_id);
      setVisitableType(visit.bd_visitable_type);
      setVisitableId(visit.bd_visitable_id);
    } else {
      setTitle(defaults?.title || "");
      setActivityTypeId(defaults?.activity_type_id || "");
      setScheduledDate(toLocalInputValue(defaults?.scheduled_date || null));
      setDuration(defaults?.scheduled_duration_min || 30);
      setDescription(defaults?.description || "");
      setOwnerId(defaults?.owner_id || "");
      setVisitableType(defaults?.bd_visitable_type || "Lead");
      setVisitableId(defaults?.bd_visitable_id || "");
    }
  }, [visit, defaults, open]);

  const activityType = useMemo(
    () => activityTypes.find((a) => a.id === activityTypeId),
    [activityTypes, activityTypeId]
  );

  // Auto-set duration when activity type changes (if user didn't override)
  useEffect(() => {
    if (activityType?.expected_duration_min && !visit) {
      setDuration(activityType.expected_duration_min);
    }
  }, [activityType, visit]);

  const submit = async () => {
    if (!title.trim()) return toast.error("Title is required");
    if (!visitableId) return toast.error("Parent record id is required");
    if (!scheduledDate) return toast.error("Scheduled date is required");

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      scheduled_date: new Date(scheduledDate).toISOString(),
      scheduled_duration_min: duration,
      activity_type_id: activityTypeId || undefined,
      owner_id: ownerId || undefined,
    };

    try {
      if (visit) {
        await update.mutateAsync({ id: visit.id, data: payload });
      } else {
        await create.mutateAsync({
          ...payload,
          bd_visitable_type: visitableType,
          bd_visitable_id: visitableId,
        });
      }
      onSaved?.();
      onOpenChange(false);
    } catch {
      // useMutation onError handler shows the toast
    }
  };

  const saving = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{visit ? "Edit BD Visit" : "Schedule BD Visit"}</DialogTitle>
          <DialogDescription>
            {defaults?.parent_name
              ? `For ${defaults.parent_name}. `
              : ""}
            Visits requiring approval are routed to the reporting manager.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {!visit && !defaults?.bd_visitable_id && (
            <div className="grid grid-cols-3 gap-2">
              <div className="grid gap-1.5 col-span-1">
                <Label>Parent Type</Label>
                <Select value={visitableType} onValueChange={(v) => setVisitableType(v as BDVisitableType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lead">Lead</SelectItem>
                    <SelectItem value="Opportunity">Opportunity</SelectItem>
                    <SelectItem value="Account">Account</SelectItem>
                    <SelectItem value="Contact">Contact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5 col-span-2">
                <Label>Parent ID</Label>
                <Input
                  value={visitableId}
                  placeholder="ObjectId of parent"
                  onChange={(e) => setVisitableId(e.target.value)}
                />
              </div>
            </div>
          )}
          <div className="grid gap-1.5">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Demo with Acme Travels" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Activity Type</Label>
              <Select value={activityTypeId || "__none__"} onValueChange={(v) => setActivityTypeId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {activityTypes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activityType?.requires_approval && (
                <p className="text-xs text-amber-500">Requires manager approval.</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label>Duration (min)</Label>
              <Input
                type="number"
                min={5}
                step={5}
                value={duration}
                onChange={(e) => setDuration(Math.max(5, Number(e.target.value) || 30))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Scheduled For *</Label>
              <Input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>BD Owner</Label>
              <Select value={ownerId || "__default__"} onValueChange={(v) => setOwnerId(v === "__default__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Auto from lead" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">Auto (parent&apos;s BD owner)</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Goal of the visit, who you're meeting, what you'll demo, etc."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {visit ? "Save Changes" : "Schedule Visit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
