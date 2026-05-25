"use client";

import Link from "next/link";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  useMyPendingApprovals, useApproveBDVisit, useRejectBDVisit,
} from "@/features/bd/visits/api/useBDVisits";
import {
  usePendingExpenseApprovals, useApproveExpense, useRejectExpense,
} from "@/features/bd/expenses/api/useExpenses";

export default function ApprovalsPage() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="visits">
        <TabsList>
          <TabsTrigger value="visits">Pending Visits</TabsTrigger>
          <TabsTrigger value="expenses">Pending Expenses</TabsTrigger>
        </TabsList>
        <TabsContent value="visits"><VisitApprovalsTab /></TabsContent>
        <TabsContent value="expenses"><ExpenseApprovalsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function VisitApprovalsTab() {
  const { data, isLoading } = useMyPendingApprovals();
  const approve = useApproveBDVisit();
  const reject = useRejectBDVisit();
  const [rejecting, setRejecting] = useState<{ id: string; title: string } | null>(null);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if ((data?.visits.length ?? 0) === 0) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">Nothing awaiting your approval.</CardContent></Card>;
  }

  return (
    <>
      <div className="space-y-3">
        {data!.visits.map((v) => (
          <Card key={v.id}>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/bd/visits/${v.id}`} className="font-medium hover:underline">{v.title}</Link>
                  <Badge variant="outline" className="capitalize text-xs">{v.activity_type_name || "Visit"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Scheduled {new Date(v.scheduled_date).toLocaleString()} · BD: {v.owner_name || "—"}
                  {v.parent_name && ` · ${v.bd_visitable_type}: ${v.parent_name}`}
                </p>
                {v.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{v.description}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline" size="sm"
                  className="text-red-500 border-red-500/40"
                  onClick={() => setRejecting({ id: v.id, title: v.title })}
                  disabled={reject.isPending}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                </Button>
                <Button size="sm" onClick={() => approve.mutate({ id: v.id })} disabled={approve.isPending}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <RejectDialog
        item={rejecting}
        onClose={() => setRejecting(null)}
        onReject={async (reason) => {
          if (rejecting) {
            await reject.mutateAsync({ id: rejecting.id, reason });
            setRejecting(null);
          }
        }}
        pending={reject.isPending}
      />
    </>
  );
}

function ExpenseApprovalsTab() {
  const { data, isLoading } = usePendingExpenseApprovals();
  const approve = useApproveExpense();
  const reject = useRejectExpense();
  const [rejecting, setRejecting] = useState<{ id: string; title: string } | null>(null);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if ((data?.expenses.length ?? 0) === 0) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">No expenses awaiting your approval.</CardContent></Card>;
  }

  return (
    <>
      <div className="space-y-3">
        {data!.expenses.map((e) => (
          <Card key={e.id}>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/bd/expenses/${e.id}`} className="font-medium hover:underline">{e.title}</Link>
                  <Badge variant="outline" className="capitalize text-xs">{e.category_name || "—"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {e.currency} {e.amount.toFixed(2)} · by {e.owner_name || "—"} on {new Date(e.incurred_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline" size="sm"
                  className="text-red-500 border-red-500/40"
                  onClick={() => setRejecting({ id: e.id, title: e.title })}
                  disabled={reject.isPending}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                </Button>
                <Button size="sm" onClick={() => approve.mutate({ id: e.id })} disabled={approve.isPending}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <RejectDialog
        item={rejecting}
        onClose={() => setRejecting(null)}
        onReject={async (reason) => {
          if (rejecting) {
            await reject.mutateAsync({ id: rejecting.id, reason });
            setRejecting(null);
          }
        }}
        pending={reject.isPending}
      />
    </>
  );
}

function RejectDialog({ item, onClose, onReject, pending }: any) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open={!!item} onOpenChange={(v: boolean) => { if (!v) { onClose(); setReason(""); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject &ldquo;{item?.title}&rdquo;?</DialogTitle>
          <DialogDescription>The submitter will be notified with this reason.</DialogDescription>
        </DialogHeader>
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button variant="destructive" disabled={pending || !reason.trim()} onClick={() => onReject(reason.trim())}>
            {pending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
