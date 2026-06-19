"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Minus, Loader2, IndianRupee, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { usePaymentSchedule, useUpdatePaymentItem } from "../../api/useOpportunityFinancial";
import { financialService, PaymentScheduleItem as PSItem } from "@/lib/api/services/financial.service";
import { formatCurrency, formatDate } from "@/lib/format";

interface Props {
    opportunityId: string;
    opportunityAmount: number;
    isLocked?: boolean;
}

interface ScheduleRow {
    id?: string;
    due_date: string;
    amount: number;
    percentage: number;
    status: "Pending" | "Received";
}

// ── Payment Received Dialog ─────────────────────────────────────────────────

const PAYMENT_MODES = ["Select Payment Mode", "Cash", "Cheque", "Online", "Other"];

interface PaymentReceivedDialogProps {
    item: PSItem;
    onConfirm: (data: {
        payment_method: string;
        reference_number: string;
        notes: string;
        paid_at: string;
    }) => Promise<void>;
    onCancel: () => void;
}

function PaymentReceivedDialog({ item, onConfirm, onCancel }: PaymentReceivedDialogProps) {
    const [paymentMethod, setPaymentMethod] = useState("");
    const [referenceNumber, setReferenceNumber] = useState("");
    const [notes, setNotes] = useState("");
    const [paidAt, setPaidAt] = useState(new Date().toISOString().split("T")[0]);
    const [isSaving, setIsSaving] = useState(false);

    const handleConfirm = async () => {
        setIsSaving(true);
        try {
            await onConfirm({
                payment_method: paymentMethod && paymentMethod !== "Select Payment Mode" ? paymentMethod : "",
                reference_number: referenceNumber,
                notes,
                paid_at: new Date(paidAt).toISOString(),
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Safe close (prevent close while saving)
    const safeClose = useCallback(() => {
        if (!isSaving) onCancel();
    }, [isSaving, onCancel]);

    // Escape key handler
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") safeClose();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [safeClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={safeClose} />

            {/* Dialog */}
            <div className="relative bg-card rounded-xl shadow-2xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <div>
                        <h3 className="text-base font-semibold text-foreground">Payment Received</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Amount:{" "}
                                {formatCurrency(item.amount)}
                        </p>
                    </div>
                    <button
                        onClick={safeClose}
                        disabled={isSaving}
                        className="h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                        <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    {/* Amount Received (read-only display) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                Amount Received
                            </label>
                                {formatCurrency(item.amount)}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                Date Received<span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="date"
                                value={paidAt}
                                onChange={(e) => setPaidAt(e.target.value)}
                                className="h-10"
                            />
                        </div>
                    </div>

                    {/* Payment Mode & Reference */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                Payment Mode
                            </label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="w-full h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
                            >
                                {PAYMENT_MODES.map((mode) => (
                                    <option
                                        key={mode}
                                        value={mode === "Select Payment Mode" ? "" : mode}
                                    >
                                        {mode}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                Reference ID
                            </label>
                            <Input
                                type="text"
                                value={referenceNumber}
                                onChange={(e) => setReferenceNumber(e.target.value)}
                                placeholder="Reference / Txn ID"
                                className="h-10"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                            Note
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Any notes about this payment..."
                            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground min-h-[72px] focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors resize-y"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-muted/50 rounded-b-xl">
                    <Button
                        variant="outline"
                        onClick={safeClose}
                        disabled={isSaving}
                        className="h-9 px-5 text-sm"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isSaving || !paidAt}
                        className="bg-emerald-600 hover:bg-emerald-700 h-9 px-5 text-sm"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Confirm Receipt"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function PaymentScheduleTab({ opportunityId, opportunityAmount, isLocked = false }: Props) {
    const queryClient = useQueryClient();
    const { data: savedItems = [], isLoading } = usePaymentSchedule(opportunityId);
    const updateMutation = useUpdatePaymentItem(opportunityId);

    const [rows, setRows] = useState<ScheduleRow[]>([]);
    const [editMode, setEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const initRef = useRef(false);

    // Payment Received dialog state
    const [pendingReceiveItem, setPendingReceiveItem] = useState<PSItem | null>(null);

    // Initialize rows from saved items on load
    useEffect(() => {
        if (savedItems.length > 0) {
            setRows(
                savedItems.map((item) => ({
                    id: item.id,
                    due_date: item.due_date
                        ? new Date(item.due_date).toISOString().split("T")[0]
                        : new Date().toISOString().split("T")[0],
                    amount: item.amount || 0,
                    percentage:
                        opportunityAmount > 0
                            ? parseFloat(((item.amount / opportunityAmount) * 100).toFixed(2))
                            : 0,
                    status: (item.status as "Pending" | "Received") || "Pending",
                }))
            );
            initRef.current = true;
        } else if (initRef.current) {
            setRows([]);
        }
    }, [savedItems, opportunityAmount]);

    const totalScheduled = rows.reduce((sum, r) => sum + (r.amount || 0), 0);
    const remaining = opportunityAmount - totalScheduled;
    const hasSavedSchedule = savedItems.length > 0;

    // ── Row management (edit mode) ──────────────────────────────────────────

    const addRow = () => {
        setRows((prev) => [
            ...prev,
            {
                due_date: new Date().toISOString().split("T")[0],
                amount: 0,
                percentage: 0,
                status: "Pending",
            },
        ]);
    };

    const removeRow = (index: number) => {
        const row = rows[index];
        if (row.id) {
            toast.error("Cannot delete a saved payment. You can only edit it.");
            return;
        }
        setRows((prev) => prev.filter((_, i) => i !== index));
    };

    const updateAmount = (index: number, raw: string) => {
        const amount = Math.max(0, parseFloat(raw) || 0);
        const percentage =
            opportunityAmount > 0
                ? parseFloat(((amount / opportunityAmount) * 100).toFixed(2))
                : 0;
        setRows((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], amount, percentage };
            return next;
        });
    };

    const updatePercentage = (index: number, raw: string) => {
        const pct = Math.max(0, Math.min(100, parseFloat(raw) || 0));
        const amount = parseFloat(((pct / 100) * opportunityAmount).toFixed(2));
        setRows((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], percentage: pct, amount };
            return next;
        });
    };

    const updateDate = (index: number, date: string) => {
        setRows((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], due_date: date };
            return next;
        });
    };

    // ── Status change: intercept Received ──────────────────────────────────

    const handleStatusChange = (itemId: string, newStatus: string) => {
        if (newStatus === "Received") {
            // Find the item and open Payment Received dialog
            const item = savedItems.find((i) => i.id === itemId);
            if (item) {
                setPendingReceiveItem(item);
            }
            return;
        }

        // Reverting back to Pending — do it directly
        updateMutation.mutate({
            itemId,
            data: { status: newStatus },
        });
    };

    const handlePaymentReceivedConfirm = async (data: {
        payment_method: string;
        reference_number: string;
        notes: string;
        paid_at: string;
    }) => {
        if (!pendingReceiveItem) return;
        try {
            await updateMutation.mutateAsync({
                itemId: pendingReceiveItem.id,
                data: {
                    status: "Received",
                    payment_method: data.payment_method || undefined,
                    reference_number: data.reference_number || undefined,
                    notes: data.notes || undefined,
                    paid_at: data.paid_at,
                },
            });
            setPendingReceiveItem(null);
        } catch {
            // Error handled by mutation hook
        }
    };

    // ── Save schedule (edit mode) ────────────────────────────────────────────

    const handleSave = async () => {
        if (Math.abs(remaining) > 0.01) {
            toast.error(
                remaining > 0
                    ? "Remaining amount must be 0 to save. Please allocate the full opportunity amount."
                    : "Payment schedule exceeds opportunity amount. Please adjust."
            );
            return;
        }

        if (rows.some((row) => row.amount <= 0)) {
            toast.error("Please ensure all payment schedule rows have an amount greater than 0.");
            return;
        }

        setIsSaving(true);
        try {
            const currentIds = new Set(rows.filter((r) => r.id).map((r) => r.id));

            for (const saved of savedItems) {
                if (!currentIds.has(saved.id)) {
                    await financialService.deletePaymentScheduleItem(opportunityId, saved.id);
                }
            }

            for (const row of rows) {
                const payload = {
                    due_date: row.due_date ? new Date(row.due_date).toISOString() : undefined,
                    amount: row.amount,
                    status: row.status || "Pending",
                };

                if (row.id) {
                    await financialService.updatePaymentScheduleItem(opportunityId, row.id, payload);
                } else {
                    await financialService.createPaymentScheduleItem(opportunityId, payload);
                }
            }

            await queryClient.invalidateQueries({
                queryKey: ["opportunities", opportunityId, "payment-schedule"],
            });
            await queryClient.invalidateQueries({
                queryKey: ["opportunities", opportunityId, "transactions"],
            });
            toast.success("Payment schedule saved successfully");
            setEditMode(false);
        } catch {
            toast.error("Failed to save payment schedule");
        } finally {
            setIsSaving(false);
        }
    };

    // ── Loading ─────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="ml-2 text-muted-foreground text-sm">Loading payment schedule...</span>
            </div>
        );
    }

    // ── TABLE VIEW (when schedule is saved and not editing) ─────────────────

    if (hasSavedSchedule && !editMode) {
        return (
            <>
                {/* Payment Received Dialog */}
                {pendingReceiveItem && (
                    <PaymentReceivedDialog
                        item={pendingReceiveItem}
                        onConfirm={handlePaymentReceivedConfirm}
                        onCancel={() => setPendingReceiveItem(null)}
                    />
                )}

                <div className="space-y-4">
                    {/* Header with edit link */}
                    <div className="flex justify-between items-center">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Payment Schedule
                        </p>
                        {!isLocked && (
                            <button
                                onClick={() => setEditMode(true)}
                                className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium transition-colors"
                            >
                                <Pencil className="h-3 w-3" />
                                Edit Schedule
                            </button>
                        )}
                    </div>

                    {/* Table */}
                    <div className="border border-border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto scrollbar-hide">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted border-b border-border">
                                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-12">#</th>
                                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Date</th>
                                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Amount</th>
                                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-40">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {savedItems.map((item, idx) => (
                                        <tr
                                            key={item.id}
                                            className="border-b border-border last:border-b-0 hover:bg-muted/40 transition-colors"
                                        >
                                            <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                                            <td className="px-4 py-3 text-foreground">
                                                {item.due_date
                                                    ? formatDate(item.due_date)
                                                    : "—"}
                                            </td>
                                            <td className="px-4 py-3 text-foreground font-medium">
                                                {formatCurrency(item.amount)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <select
                                                    value={item.status}
                                                    onChange={(e) =>
                                                        handleStatusChange(item.id, e.target.value)
                                                    }
                                                    disabled={updateMutation.isPending || isLocked}
                                                    className={`text-sm border rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors disabled:opacity-60 ${
                                                        item.status === "Received"
                                                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                                                            : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40"
                                                    }`}
                                                >
                                                    <option value="Pending">Pending</option>
                                                    <option value="Received">Received</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // ── EDIT / CREATE MODE ──────────────────────────────────────────────────

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Payment Schedule
                </p>
                {!editMode && !hasSavedSchedule && !isLocked && (
                    <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 h-8 text-xs"
                        onClick={() => {
                            setEditMode(true);
                            if (rows.length === 0) addRow();
                        }}
                    >
                        Add Schedule
                    </Button>
                )}
                {editMode && hasSavedSchedule && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => {
                            setRows(
                                savedItems.map((item) => ({
                                    id: item.id,
                                    due_date: item.due_date
                                        ? new Date(item.due_date).toISOString().split("T")[0]
                                        : new Date().toISOString().split("T")[0],
                                    amount: item.amount || 0,
                                    percentage:
                                        opportunityAmount > 0
                                            ? parseFloat(
                                                  ((item.amount / opportunityAmount) * 100).toFixed(2)
                                              )
                                            : 0,
                                    status: (item.status as "Pending" | "Received") || "Pending",
                                }))
                            );
                            setEditMode(false);
                        }}
                    >
                        Cancel
                    </Button>
                )}
            </div>

            {/* Form Area */}
            {(editMode || (!hasSavedSchedule && rows.length > 0)) && (
                <div className="space-y-3">
                    {/* Column headers */}
                    {/* Column headers - hidden on mobile */}
                    <div className="hidden sm:grid sm:grid-cols-[1.5fr_1fr_1fr_40px] gap-3 mb-1">
                        <p className="text-xs font-semibold text-muted-foreground">Date</p>
                        <p className="text-xs font-semibold text-muted-foreground text-right pr-2">Amount</p>
                        <p className="text-xs font-semibold text-muted-foreground text-right pr-2">Percentage</p>
                        <div />
                    </div>

                    {/* Rows */}
                    {rows.map((row, idx) => {
                        const isSavedRow = !!row.id;
                        const isReceived = row.status === "Received";

                        return (
                            <div
                                key={row.id || `new-${idx}`}
                                className="flex flex-col sm:grid sm:grid-cols-[1.5fr_1fr_1fr_40px] gap-3 p-3 sm:p-0 border sm:border-0 rounded-lg sm:rounded-none bg-muted/30 sm:bg-transparent relative"
                            >
                                <div className="space-y-1 sm:space-y-0">
                                    <label className="sm:hidden text-[10px] font-bold text-muted-foreground uppercase">Due Date</label>
                                    <Input
                                        type="date"
                                        value={row.due_date}
                                        onChange={(e) => updateDate(idx, e.target.value)}
                                        className="h-9 text-sm"
                                        disabled={isReceived}
                                    />
                                </div>
                                
                                <div className="space-y-1 sm:space-y-0">
                                    <label className="sm:hidden text-[10px] font-bold text-muted-foreground uppercase">Amount</label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={row.amount || ""}
                                        onChange={(e) => updateAmount(idx, e.target.value)}
                                        placeholder="0"
                                        className="h-9 text-sm sm:text-right"
                                        disabled={isReceived}
                                    />
                                </div>

                                <div className="space-y-1 sm:space-y-0">
                                    <label className="sm:hidden text-[10px] font-bold text-muted-foreground uppercase">Percentage</label>
                                    <div className="flex items-center gap-1">
                                        <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            step="0.01"
                                            value={row.percentage || ""}
                                            onChange={(e) => updatePercentage(idx, e.target.value)}
                                            placeholder="0"
                                            className="h-9 text-sm sm:text-right"
                                            disabled={isReceived}
                                        />
                                        <span className="text-sm text-muted-foreground flex-shrink-0">%</span>
                                    </div>
                                </div>

                                <div className="absolute top-2 right-2 sm:static flex justify-end">
                                    {idx === 0 ? (
                                        <button
                                            type="button"
                                            onClick={addRow}
                                            className="h-8 w-8 sm:h-9 sm:w-9 rounded-md bg-teal-500 hover:bg-teal-600 text-white flex items-center justify-center transition-colors shadow-sm"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    ) : isSavedRow ? (
                                        <div className="h-8 w-8 sm:h-9 sm:w-9" />
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => removeRow(idx)}
                                            className="h-8 w-8 sm:h-9 sm:w-9 rounded-md bg-red-400 hover:bg-red-500 text-white flex items-center justify-center transition-colors shadow-sm"
                                        >
                                            <Minus className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Remaining Amount */}
                    <p className="text-sm text-muted-foreground">
                        Remaining Amount:{" "}
                        <span
                            className={`font-semibold ${
                                remaining < 0
                                    ? "text-red-400"
                                    : remaining === 0
                                    ? "text-emerald-400"
                                    : "text-foreground"
                            }`}
                        >
                            {formatCurrency(remaining)}
                        </span>
                    </p>

                    {/* Over-budget warning */}
                    {remaining < 0 && (
                        <div className="bg-red-500/20 border border-red-500/40 text-red-700 dark:text-red-300 px-4 py-2 rounded-lg text-sm">
                            <span className="font-semibold">Please check amount!</span> Payment
                            schedule exceeds opportunity amount by {formatCurrency(Math.abs(remaining))}
                        </div>
                    )}

                    {/* Under-budget info */}
                    {remaining > 0.01 && (
                        <div className="bg-amber-500/20 border border-amber-500/40 text-amber-700 dark:text-amber-300 px-4 py-2 rounded-lg text-sm">
                            <span className="font-semibold">Remaining amount must be 0.</span> Please
                            allocate {formatCurrency(remaining)} more to save.
                        </div>
                    )}

                    {/* Save */}
                    <div className="flex justify-end pt-2">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || Math.abs(remaining) > 0.01 || isLocked}
                            className="bg-blue-600 hover:bg-blue-700 px-8 h-9 text-sm disabled:opacity-50"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save"
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!editMode && !hasSavedSchedule && rows.length === 0 && (
                <div className="crm-empty-state">
                    <IndianRupee className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">No payment schedule added</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Track payment milestones and their status here
                    </p>
                </div>
            )}
        </div>
    );
}
