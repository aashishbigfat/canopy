"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, MapPin, CheckCircle2, XCircle, Pencil, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  useBDVisit, useApproveBDVisit, useRejectBDVisit, useCheckInVisit, useCheckOutVisit,
} from "@/features/bd/visits/api/useBDVisits";
import { VisitFormDialog } from "@/features/bd/visits/components/VisitFormDialog";
import { VisitPhotoGallery } from "@/features/bd/visits/components/VisitPhotoGallery";
import { useLiveTracking } from "@/features/bd/tracking/useLiveTracking";

export default function VisitDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const visitId = params.id as string;
  const { data: visit, isLoading } = useBDVisit(visitId);

  const [editOpen, setEditOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);

  const approve = useApproveBDVisit();
  const reject = useRejectBDVisit();
  const checkIn = useCheckInVisit();
  const checkOut = useCheckOutVisit();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!visit) {
    return <div className="text-muted-foreground">Visit not found.</div>;
  }

  const handleCheckIn = async () => {
    if (!navigator.geolocation) {
      // Submit without GPS — backend accepts null
      try {
        await checkIn.mutateAsync({ id: visit.id });
      } catch {}
      return;
    }
    const opts: PositionOptions = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await checkIn.mutateAsync({
            id: visit.id,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy_m: pos.coords.accuracy,
          });
        } catch {}
      },
      async (err) => {
        // Permission denied / timeout — proceed without GPS
        toast.warning("Location unavailable; checking in without GPS.");
        try {
          await checkIn.mutateAsync({ id: visit.id });
        } catch {}
      },
      opts
    );
  };

  const isCheckedIn = !!visit.check_in_at && !visit.check_out_at;
  const canCheckIn = (visit.approval_status === "approved" || visit.approval_status === "not_required") &&
    visit.status === "approved" && !visit.check_in_at;
  const canCheckOut = isCheckedIn;
  const canApprove = visit.approval_status === "pending";

  // Live GPS pings while the visit is in_progress (only when this tab is open).
  const live = useLiveTracking({
    visitId: visit.id,
    enabled: visit.status === "in_progress",
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {visit.activity_type_name || "BD Visit"} · {visit.bd_visitable_type}
          </p>
          <h1 className="text-2xl font-semibold">{visit.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="capitalize">{visit.status.replace("_", " ")}</Badge>
            <Badge variant="outline" className="capitalize">{visit.approval_status.replace("_", " ")}</Badge>
            {visit.parent_name && (
              <span className="text-sm text-muted-foreground">· {visit.parent_name}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Schedule & Outcome</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <KV label="Scheduled" value={new Date(visit.scheduled_date).toLocaleString()} />
            <KV label="Duration" value={`${visit.scheduled_duration_min} min`} />
            <KV label="BD Owner" value={visit.owner_name || "—"} />
            <KV label="Reporting Manager" value={visit.reporting_manager_name || "—"} />
            <KV label="Checked In" value={visit.check_in_at ? new Date(visit.check_in_at).toLocaleString() : "—"} />
            <KV label="Checked Out" value={visit.check_out_at ? new Date(visit.check_out_at).toLocaleString() : "—"} />
            <KV label="GPS (in)" value={visit.check_in_lat != null ? `${visit.check_in_lat.toFixed(5)}, ${visit.check_in_lng?.toFixed(5)} (±${Math.round(visit.check_in_accuracy_m || 0)}m)` : "—"} />
            <KV label="Outcome" value={visit.outcome || "—"} />
            <div className="col-span-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Description</p>
              <p>{visit.description || "—"}</p>
            </div>
            {visit.outcome_notes && (
              <div className="col-span-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Outcome Notes</p>
                <p className="whitespace-pre-wrap">{visit.outcome_notes}</p>
              </div>
            )}
            {visit.next_action && (
              <div className="col-span-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Next Action</p>
                <p>{visit.next_action} {visit.next_action_at && `· by ${new Date(visit.next_action_at).toLocaleDateString()}`}</p>
              </div>
            )}
            {visit.rejection_reason && (
              <div className="col-span-2">
                <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">Rejection Reason</p>
                <p>{visit.rejection_reason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {canApprove && (
              <>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => approve.mutate({ id: visit.id })}
                  disabled={approve.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-red-500 border-red-500/40"
                  size="lg"
                  onClick={() => setRejectOpen(true)}
                  disabled={reject.isPending}
                >
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
              </>
            )}
            {canCheckIn && (
              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckIn}
                disabled={checkIn.isPending}
              >
                {checkIn.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <LogIn className="h-4 w-4 mr-1" />}
                Check In (with GPS)
              </Button>
            )}
            {canCheckOut && (
              <Button
                className="w-full"
                size="lg"
                variant="outline"
                onClick={() => setCheckOutOpen(true)}
                disabled={checkOut.isPending}
              >
                <LogOut className="h-4 w-4 mr-1" /> Check Out
              </Button>
            )}
            {visit.address_snapshot && (
              <Card className="mt-3 bg-muted/30">
                <CardContent className="p-3 text-xs">
                  <p className="font-semibold flex items-center gap-1 mb-1">
                    <MapPin className="h-3 w-3" /> Visit Address
                  </p>
                  {[visit.address_snapshot.street, visit.address_snapshot.city, visit.address_snapshot.state, visit.address_snapshot.zip, visit.address_snapshot.country]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>

      {visit.status === "in_progress" && (
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <CardContent className="p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium">Live tracking active</span>
              <span className="text-muted-foreground">
                {live.lastPushAt
                  ? `Last sync ${live.lastPushAt.toLocaleTimeString()}`
                  : "Buffering first ping…"}
              </span>
            </div>
            {live.queued > 0 && <span className="text-muted-foreground">{live.queued} queued</span>}
            {live.error && <span className="text-red-500">{live.error}</span>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <VisitPhotoGallery visitId={visit.id} canEdit={visit.status !== "cancelled"} />
        </CardContent>
      </Card>

      <VisitFormDialog open={editOpen} onOpenChange={setEditOpen} visit={visit} />

      <RejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onReject={async (reason) => {
          await reject.mutateAsync({ id: visit.id, reason });
          setRejectOpen(false);
        }}
        pending={reject.isPending}
      />

      <CheckOutDialog
        open={checkOutOpen}
        onOpenChange={setCheckOutOpen}
        pending={checkOut.isPending}
        onCheckOut={async (payload) => {
          // Try to grab GPS one last time
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              async (pos) => {
                await checkOut.mutateAsync({
                  id: visit.id,
                  ...payload,
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                });
                setCheckOutOpen(false);
              },
              async () => {
                await checkOut.mutateAsync({ id: visit.id, ...payload });
                setCheckOutOpen(false);
              },
              { enableHighAccuracy: true, timeout: 5000 }
            );
          } else {
            await checkOut.mutateAsync({ id: visit.id, ...payload });
            setCheckOutOpen(false);
          }
        }}
      />
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function RejectDialog({
  open, onOpenChange, onReject, pending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onReject: (reason: string) => Promise<void>;
  pending: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setReason(""); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Visit</DialogTitle>
          <DialogDescription>The BD will be notified with this reason.</DialogDescription>
        </DialogHeader>
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for rejection" />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => reason.trim() && onReject(reason.trim())}
            disabled={pending || !reason.trim()}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CheckOutDialog({
  open, onOpenChange, onCheckOut, pending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCheckOut: (payload: { outcome: string; outcome_notes?: string; next_action?: string; next_action_at?: string }) => Promise<void>;
  pending: boolean;
}) {
  const [outcome, setOutcome] = useState<string>("successful");
  const [notes, setNotes] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextActionAt, setNextActionAt] = useState("");

  return (
    <Dialog open={open} onOpenChange={(v) => {
      onOpenChange(v);
      if (!v) { setOutcome("successful"); setNotes(""); setNextAction(""); setNextActionAt(""); }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Check Out</DialogTitle>
          <DialogDescription>Record the outcome and any follow-up.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Outcome *</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="successful">Successful</SelectItem>
                <SelectItem value="deal_progressed">Deal progressed</SelectItem>
                <SelectItem value="no_show">No-show</SelectItem>
                <SelectItem value="rescheduled">Rescheduled</SelectItem>
                <SelectItem value="lead_not_interested">Lead not interested</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Next Action</Label>
              <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="Send proposal" />
            </div>
            <div className="grid gap-1.5">
              <Label>Next Action By</Label>
              <Input type="date" value={nextActionAt} onChange={(e) => setNextActionAt(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
          <Button
            onClick={() => onCheckOut({
              outcome,
              outcome_notes: notes || undefined,
              next_action: nextAction || undefined,
              next_action_at: nextActionAt ? new Date(nextActionAt).toISOString() : undefined,
            })}
            disabled={pending}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Complete Visit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
