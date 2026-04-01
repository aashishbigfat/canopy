"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Minus, Loader2, IndianRupee, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { usePaymentSchedule, useUpdatePaymentItem } from "../../api/useOpportunityFinancial";
import { financialService } from "@/lib/api/services/financial.service";
import { format } from "date-fns";

interface Props {
    opportunityId: string;
    opportunityAmount: number;
}

interface ScheduleRow {
    id?: string; // Existing server item ID (undefined = new row)
    due_date: string;
    amount: number;
    percentage: number;
    status: "Pending" | "Received";
}

export function PaymentScheduleTab({ opportunityId, opportunityAmount }: Props) {
    const queryClient = useQueryClient();
    const { data: savedItems = [], isLoading } = usePaymentSchedule(opportunityId);
    const updateMutation = useUpdatePaymentItem(opportunityId);

    const [rows, setRows] = useState<ScheduleRow[]>([]);
    const [editMode, setEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const initRef = useRef(false);

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
        // Can only remove unsaved rows (no id) in edit mode
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

    // ── Status change (table view) ──────────────────────────────────────────

    const handleStatusChange = async (itemId: string, newStatus: string) => {
        try {
            await updateMutation.mutateAsync({
                itemId,
                data: { status: newStatus },
            });
        } catch {
            // Error handled by mutation hook
        }
    };

    // ── Save ────────────────────────────────────────────────────────────────

    const handleSave = async () => {
        // Validate: remaining must be exactly 0
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
            // IDs that still exist in local rows
            const currentIds = new Set(rows.filter((r) => r.id).map((r) => r.id));

            // Delete removed items (only unsaved / pending items can be removed)
            for (const saved of savedItems) {
                if (!currentIds.has(saved.id)) {
                    await financialService.deletePaymentScheduleItem(opportunityId, saved.id);
                }
            }

            // Create new / update existing
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

            // Refresh data
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
                <span className="ml-2 text-slate-500 text-sm">Loading payment schedule...</span>
            </div>
        );
    }

    // ── TABLE VIEW (when schedule is saved and not editing) ─────────────────

    if (hasSavedSchedule && !editMode) {
        return (
            <div className="space-y-4">
                {/* Header with edit link */}
                <div className="flex justify-between items-center">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Payment Schedule
                    </p>
                    <button
                        onClick={() => setEditMode(true)}
                        className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors"
                    >
                        <Pencil className="h-3 w-3" />
                        Payment Schedule
                    </button>
                </div>

                {/* Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 w-12">#</th>
                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Date</th>
                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Amount</th>
                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 w-40">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {savedItems.map((item, idx) => (
                                <tr
                                    key={item.id}
                                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors"
                                >
                                    <td className="px-4 py-3 text-slate-600">{idx + 1}</td>
                                    <td className="px-4 py-3 text-slate-700">
                                        {item.due_date
                                            ? format(new Date(item.due_date), "d-MMM-yyyy")
                                            : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-slate-700 font-medium">
                                        {item.amount.toLocaleString("en-IN")}
                                    </td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={item.status}
                                            onChange={(e) =>
                                                handleStatusChange(item.id, e.target.value)
                                            }
                                            className={`text-sm border rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors ${
                                                item.status === "Received"
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    : "bg-amber-50 text-amber-700 border-amber-200"
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
        );
    }

    // ── EDIT / CREATE MODE ──────────────────────────────────────────────────

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Payment Schedule
                </p>
                {!editMode && !hasSavedSchedule && (
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
                            // Reset rows to saved state
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
                    <div className="grid grid-cols-[1fr_1fr_1fr_44px] gap-3">
                        <p className="text-xs font-semibold text-slate-500">Date</p>
                        <p className="text-xs font-semibold text-slate-500">Amount</p>
                        <p className="text-xs font-semibold text-slate-500">Amount Percentage</p>
                        <div />
                    </div>

                    {/* Rows */}
                    {rows.map((row, idx) => {
                        const isSavedRow = !!row.id;
                        const isReceived = row.status === "Received";

                        return (
                            <div
                                key={row.id || `new-${idx}`}
                                className="grid grid-cols-[1fr_1fr_1fr_44px] gap-3 items-center"
                            >
                                <Input
                                    type="date"
                                    value={row.due_date}
                                    onChange={(e) => updateDate(idx, e.target.value)}
                                    className="h-9 text-sm"
                                    disabled={isReceived}
                                />
                                <Input
                                    type="number"
                                    min={0}
                                    value={row.amount || ""}
                                    onChange={(e) => updateAmount(idx, e.target.value)}
                                    placeholder="0"
                                    className="h-9 text-sm"
                                    disabled={isReceived}
                                />
                                <div className="flex items-center gap-1">
                                    <Input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step="0.01"
                                        value={row.percentage || ""}
                                        onChange={(e) => updatePercentage(idx, e.target.value)}
                                        placeholder="0"
                                        className="h-9 text-sm"
                                        disabled={isReceived}
                                    />
                                    <span className="text-sm text-slate-400 flex-shrink-0">%</span>
                                </div>

                                {/* + for first row, − for unsaved additional rows, disabled for saved rows */}
                                {idx === 0 ? (
                                    <button
                                        type="button"
                                        onClick={addRow}
                                        className="h-9 w-9 rounded-md bg-teal-500 hover:bg-teal-600 text-white flex items-center justify-center transition-colors flex-shrink-0"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                ) : isSavedRow ? (
                                    <div className="h-9 w-9" /> // No delete for saved rows
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => removeRow(idx)}
                                        className="h-9 w-9 rounded-md bg-red-400 hover:bg-red-500 text-white flex items-center justify-center transition-colors flex-shrink-0"
                                    >
                                        <Minus className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        );
                    })}

                    {/* Remaining Amount */}
                    <p className="text-sm text-slate-600">
                        Remaining Amount:{" "}
                        <span
                            className={`font-semibold ${
                                remaining < 0
                                    ? "text-red-600"
                                    : remaining === 0
                                    ? "text-emerald-600"
                                    : "text-slate-800"
                            }`}
                        >
                            {remaining.toLocaleString("en-IN")}
                        </span>
                    </p>

                    {/* Over-budget warning */}
                    {remaining < 0 && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                            <span className="font-semibold">Please check amount!</span> Payment
                            schedule exceeds opportunity amount by ₹
                            {Math.abs(remaining).toLocaleString("en-IN")}
                        </div>
                    )}

                    {/* Under-budget info */}
                    {remaining > 0.01 && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-lg text-sm">
                            <span className="font-semibold">Remaining amount must be 0.</span> Please
                            allocate ₹{remaining.toLocaleString("en-IN")} more to save.
                        </div>
                    )}

                    {/* Save */}
                    <div className="flex justify-end pt-2">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || Math.abs(remaining) > 0.01}
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
                <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                    <IndianRupee className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-500 font-medium text-sm">No payment schedule added</p>
                    <p className="text-slate-400 text-xs mt-1">
                        Track payment milestones and their status here
                    </p>
                </div>
            )}
        </div>
    );
}
