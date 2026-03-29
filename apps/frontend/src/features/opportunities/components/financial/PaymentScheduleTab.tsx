"use client";

import { useState } from "react";
import { Plus, Trash2, CheckCircle2, Clock, Loader2, Calendar, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
    usePaymentSchedule,
    useCreatePaymentItem,
    useUpdatePaymentItem,
    useDeletePaymentItem,
} from "../../api/useOpportunityFinancial";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PAYMENT_METHODS = ["Cash", "Card", "Bank Transfer", "UPI", "Cheque", "Online", "Other"];

interface Props {
    opportunityId: string;
}

interface FormState {
    description: string;
    due_date: string;
    amount: string;
    payment_method: string;
    reference_number: string;
    notes: string;
}

const emptyForm = (): FormState => ({
    description: "",
    due_date: "",
    amount: "",
    payment_method: "",
    reference_number: "",
    notes: "",
});

export function PaymentScheduleTab({ opportunityId }: Props) {
    const { data: items = [], isLoading } = usePaymentSchedule(opportunityId);
    const { mutate: createItem, isPending: isCreating } = useCreatePaymentItem(opportunityId);
    const { mutate: updateItem, isPending: isUpdating } = useUpdatePaymentItem(opportunityId);
    const { mutate: deleteItem } = useDeletePaymentItem(opportunityId);

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm());
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const totalScheduled = items.reduce((s, i) => s + i.amount, 0);
    const totalPaid = items.filter((i) => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
    const totalPending = totalScheduled - totalPaid;

    const handleCreate = () => {
        if (!form.amount || parseFloat(form.amount) <= 0) return;
        createItem(
            {
                description: form.description || undefined,
                due_date: form.due_date ? new Date(form.due_date).toISOString() : undefined,
                amount: parseFloat(form.amount),
                payment_method: form.payment_method || undefined,
                reference_number: form.reference_number || undefined,
                notes: form.notes || undefined,
                status: "Pending",
            },
            {
                onSuccess: () => {
                    setForm(emptyForm());
                    setShowForm(false);
                },
            }
        );
    };

    const togglePaid = (item: any) => {
        updateItem({
            itemId: item.id,
            data: {
                status: item.status === "Paid" ? "Pending" : "Paid",
            },
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="ml-2 text-slate-500 text-sm">Loading payment schedule...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Total Scheduled</p>
                    <p className="text-lg font-bold text-slate-800 mt-0.5">
                        ₹{totalScheduled.toLocaleString("en-IN")}
                    </p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Total Paid</p>
                    <p className="text-lg font-bold text-emerald-700 mt-0.5">
                        ₹{totalPaid.toLocaleString("en-IN")}
                    </p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">Pending</p>
                    <p className="text-lg font-bold text-amber-700 mt-0.5">
                        ₹{totalPending.toLocaleString("en-IN")}
                    </p>
                </div>
            </div>

            {/* ── Add Payment Button ── */}
            <div className="flex justify-between items-center">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payment Milestones</p>
                {!showForm && (
                    <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 h-8 text-xs"
                        onClick={() => setShowForm(true)}
                    >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Add Payment
                    </Button>
                )}
            </div>

            {/* ── Add Form ── */}
            {showForm && (
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/40 space-y-3">
                    <p className="text-sm font-semibold text-slate-700">New Payment Milestone</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-medium">Description</label>
                            <Input
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="e.g. Advance payment"
                                className="h-8 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-medium">Amount (₹) *</label>
                            <Input
                                type="number"
                                min={0}
                                value={form.amount}
                                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                placeholder="0.00"
                                className="h-8 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-medium">Due Date</label>
                            <Input
                                type="date"
                                value={form.due_date}
                                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                                className="h-8 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-medium">Payment Method</label>
                            <select
                                value={form.payment_method}
                                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                                className="w-full h-8 text-sm border border-slate-200 rounded-md px-2 bg-white focus:outline-none focus:border-blue-400"
                            >
                                <option value="">Select method...</option>
                                {PAYMENT_METHODS.map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-medium">Reference No.</label>
                            <Input
                                value={form.reference_number}
                                onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                                placeholder="UTR / Ref number"
                                className="h-8 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-medium">Notes</label>
                            <Input
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                placeholder="Optional notes"
                                className="h-8 text-sm"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                        <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 h-8 text-xs px-6"
                            onClick={handleCreate}
                            disabled={isCreating || !form.amount}
                        >
                            {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => { setShowForm(false); setForm(emptyForm()); }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {/* ── Payment Items Table ── */}
            {items.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Due Date</th>
                                <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Method</th>
                                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="px-3 py-3">
                                        <p className="font-medium text-slate-800 text-sm">{item.description || "—"}</p>
                                        {item.reference_number && (
                                            <p className="text-[10px] text-slate-400 mt-0.5">Ref: {item.reference_number}</p>
                                        )}
                                    </td>
                                    <td className="px-3 py-3">
                                        {item.due_date ? (
                                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                                <Calendar className="h-3 w-3 text-slate-400" />
                                                {format(new Date(item.due_date), "dd MMM yyyy")}
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                        <span className="font-semibold text-slate-800">
                                            ₹{item.amount.toLocaleString("en-IN")}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3">
                                        <span className="text-xs text-slate-600">{item.payment_method || "—"}</span>
                                    </td>
                                    <td className="px-3 py-3">
                                        <button
                                            onClick={() => togglePaid(item)}
                                            disabled={isUpdating}
                                            className="flex items-center gap-1.5 group"
                                        >
                                            {item.status === "Paid" ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 flex items-center gap-1 cursor-pointer text-[11px]">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Paid
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 hover:bg-amber-100 flex items-center gap-1 cursor-pointer text-[11px]">
                                                    <Clock className="h-3 w-3" />
                                                    Pending
                                                </Badge>
                                            )}
                                        </button>
                                        {item.paid_at && (
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                Paid {format(new Date(item.paid_at), "dd MMM yyyy")}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-2 py-3">
                                        <button
                                            onClick={() => setDeleteId(item.id)}
                                            className="h-6 w-6 rounded hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                !showForm && (
                    <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                        <IndianRupee className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                        <p className="text-slate-500 font-medium text-sm">No payment milestones added</p>
                        <p className="text-slate-400 text-xs mt-1">Track payment milestones and their status here</p>
                    </div>
                )
            )}

            {/* ── Delete Confirm Dialog ── */}
            <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete milestone?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This payment milestone will be permanently removed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-500 hover:bg-red-600"
                            onClick={() => {
                                if (deleteId) {
                                    deleteItem(deleteId, { onSuccess: () => setDeleteId(null) });
                                }
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
