"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Pencil, Send, CheckCircle2, XCircle, Receipt, Banknote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  useExpense, useSubmitExpense, useApproveExpense, useRejectExpense, useReimburseExpense,
} from "@/features/bd/expenses/api/useExpenses";
import { ExpenseFormDialog } from "@/features/bd/expenses/components/ExpenseFormDialog";
import { expensesService } from "@/lib/api/services/expenses.service";

interface Receipt {
  file_id: string;
  filename: string;
  mime_type: string;
  presigned_url: string | null;
}

export default function ExpenseDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as string;
  const { data: exp, isLoading } = useExpense(id);

  const [editOpen, setEditOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reimbOpen, setReimbOpen] = useState(false);

  const submit = useSubmitExpense();
  const approve = useApproveExpense();
  const reject = useRejectExpense();
  const reimb = useReimburseExpense();

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const reloadReceipts = async () => {
    try {
      const list = await expensesService.listReceipts(id);
      setReceipts(list);
    } catch {
      /* swallow */
    }
  };

  useEffect(() => { if (id) reloadReceipts(); }, [id]);

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!exp) return <div className="text-muted-foreground">Expense not found.</div>;

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        await expensesService.uploadReceipt(id, files[i]);
      }
      toast.success(`${files.length} receipt(s) uploaded`);
      await reloadReceipts();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const canSubmit = exp.status === "draft";
  const canEdit = exp.status === "draft";
  const canApprove = exp.status === "submitted";
  const canReimburse = exp.status === "approved";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase">{exp.category_name || "Expense"}</p>
          <h1 className="text-2xl font-semibold">{exp.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="capitalize">{exp.status}</Badge>
            <span className="text-sm text-muted-foreground">
              {new Date(exp.incurred_at).toLocaleDateString()} · by {exp.owner_name || "—"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <KV label="Amount" value={`${exp.currency} ${exp.amount.toFixed(2)}`} />
            <KV label="Category" value={exp.category_name || "—"} />
            <KV label="Incurred" value={new Date(exp.incurred_at).toLocaleDateString()} />
            <KV label="Submitted" value={exp.submitted_at ? new Date(exp.submitted_at).toLocaleString() : "—"} />
            <KV label="Reporting Manager" value={exp.reporting_manager_name || "—"} />
            <KV label="Linked Visit" value={exp.bd_visit_title || "—"} />
            {exp.bd_visit_id && (
              <div className="col-span-2">
                <Link href={`/bd/visits/${exp.bd_visit_id}`} className="text-xs text-primary hover:underline">
                  Open linked visit →
                </Link>
              </div>
            )}
            {exp.description && (
              <div className="col-span-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Description</p>
                <p className="whitespace-pre-wrap">{exp.description}</p>
              </div>
            )}
            {exp.approval_notes && (
              <div className="col-span-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Approval Notes</p>
                <p className="whitespace-pre-wrap">{exp.approval_notes}</p>
              </div>
            )}
            {exp.rejection_reason && (
              <div className="col-span-2">
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">Rejection Reason</p>
                <p>{exp.rejection_reason}</p>
              </div>
            )}
            {exp.reimbursement_reference && (
              <div className="col-span-2">
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Reimbursement Reference</p>
                <p className="font-mono text-xs">{exp.reimbursement_reference}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {canSubmit && (
              <Button className="w-full" size="lg" onClick={() => submit.mutate(id)} disabled={submit.isPending}>
                <Send className="h-4 w-4 mr-1" /> Submit for Approval
              </Button>
            )}
            {canApprove && (
              <>
                <Button className="w-full" size="lg" onClick={() => approve.mutate({ id })} disabled={approve.isPending}>
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
            {canReimburse && (
              <Button className="w-full" size="lg" onClick={() => setReimbOpen(true)} disabled={reimb.isPending}>
                <Banknote className="h-4 w-4 mr-1" /> Mark Reimbursed
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Receipts {receipts.length > 0 && `(${receipts.length})`}
          </CardTitle>
          {canEdit && (
            <>
              <input
                ref={fileInput}
                type="file"
                accept="image/*,application/pdf"
                multiple
                capture="environment"
                className="hidden"
                onChange={(e) => upload(e.target.files)}
              />
              <Button size="sm" variant="outline" onClick={() => fileInput.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Add Receipt
              </Button>
            </>
          )}
        </CardHeader>
        <CardContent>
          {receipts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No receipts attached.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {receipts.map((r) => (
                <a
                  key={r.file_id}
                  href={r.presigned_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square rounded-md overflow-hidden border bg-muted flex items-center justify-center hover:border-primary"
                >
                  {r.presigned_url && r.mime_type.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.presigned_url} alt={r.filename} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-xs text-center p-2 text-muted-foreground">{r.filename}</div>
                  )}
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ExpenseFormDialog open={editOpen} onOpenChange={setEditOpen} expense={exp} />

      <RejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        pending={reject.isPending}
        onReject={async (reason) => {
          await reject.mutateAsync({ id, reason });
          setRejectOpen(false);
        }}
      />

      <ReimbDialog
        open={reimbOpen}
        onOpenChange={setReimbOpen}
        pending={reimb.isPending}
        onReimburse={async (ref) => {
          await reimb.mutateAsync({ id, reference: ref });
          setReimbOpen(false);
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

function RejectDialog({ open, onOpenChange, onReject, pending }: any) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { onOpenChange(v); if (!v) setReason(""); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Expense</DialogTitle>
          <DialogDescription>The submitter will be notified with this reason.</DialogDescription>
        </DialogHeader>
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
          <Button variant="destructive" disabled={pending || !reason.trim()} onClick={() => onReject(reason.trim())}>
            {pending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReimbDialog({ open, onOpenChange, onReimburse, pending }: any) {
  const [ref, setRef] = useState("");
  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { onOpenChange(v); if (!v) setRef(""); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as Reimbursed</DialogTitle>
          <DialogDescription>Record the payment reference for finance audit.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label>Reference (UTR / cheque number / etc.)</Label>
          <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="UTR12345678" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
          <Button disabled={pending} onClick={() => onReimburse(ref || undefined)}>
            {pending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
