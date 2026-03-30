"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Minus, Loader2, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { usePaymentSchedule } from "../../api/useOpportunityFinancial";
import { financialService } from "@/lib/api/services/financial.service";

interface Props {
    opportunityId: string;
    opportunityAmount: number;
}

interface ScheduleRow {
    id?: string; // Existing server item ID (undefined = new row)
    due_date: string;
    amount: number;
    percentage: number;
}

export function PaymentScheduleTab({ opportunityId, opportunityAmount }: Props) {
    const queryClient = useQueryClient();
    const { data: savedItems = [], isLoading } = usePaymentSchedule(opportunityId);

    const [rows, setRows] = useState<ScheduleRow[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const initRef = useRef(false);

    // Initialize rows from saved items on load / after save
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
                }))
            );
            setShowForm(true);
            initRef.current = true;
        } else if (initRef.current) {
            // After a save that deleted all items
            setRows([]);
            setShowForm(false);
        }
    }, [savedItems, opportunityAmount]);

    const totalScheduled = rows.reduce((sum, r) => sum + (r.amount || 0), 0);
    const remaining = opportunityAmount - totalScheduled;

    // ── Row management ────────────────────────────────────────────────────────

    const addRow = () => {
        setRows((prev) => [
            ...prev,
            {
                due_date: new Date().toISOString().split("T")[0],
                amount: 0,
                percentage: 0,
            },
        ]);
    };

    const removeRow = (index: number) => {
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

    // ── Save ──────────────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (totalScheduled > opportunityAmount) {
            toast.error("Please check amount! Payment schedule exceeds opportunity amount.");
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

            // Delete removed items
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
                    status: "Pending" as const,
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
            toast.success("Payment schedule saved successfully");
        } catch {
            toast.error("Failed to save payment schedule");
        } finally {
            setIsSaving(false);
        }
    };

    // ── Loading ───────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="ml-2 text-slate-500 text-sm">Loading payment schedule...</span>
            </div>
        );
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Payment Schedule
                </p>
                {!showForm && (
                    <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 h-8 text-xs"
                        onClick={() => {
                            setShowForm(true);
                            if (rows.length === 0) addRow();
                        }}
                    >
                        Add Schedule
                    </Button>
                )}
            </div>

            {/* Form Area */}
            {showForm && (
                <div className="space-y-3">
                    {/* Column headers */}
                    <div className="grid grid-cols-[1fr_1fr_1fr_44px] gap-3">
                        <p className="text-xs font-semibold text-slate-500">Date</p>
                        <p className="text-xs font-semibold text-slate-500">Amount</p>
                        <p className="text-xs font-semibold text-slate-500">Amount Percentage</p>
                        <div />
                    </div>

                    {/* Rows */}
                    {rows.map((row, idx) => (
                        <div
                            key={idx}
                            className="grid grid-cols-[1fr_1fr_1fr_44px] gap-3 items-center"
                        >
                            <Input
                                type="date"
                                value={row.due_date}
                                onChange={(e) => updateDate(idx, e.target.value)}
                                className="h-9 text-sm"
                            />
                            <Input
                                type="number"
                                min={0}
                                value={row.amount || ""}
                                onChange={(e) => updateAmount(idx, e.target.value)}
                                placeholder="0"
                                className="h-9 text-sm"
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
                                />
                                <span className="text-sm text-slate-400 flex-shrink-0">%</span>
                            </div>

                            {/* First row = green +, additional rows = red − */}
                            {idx === 0 ? (
                                <button
                                    type="button"
                                    onClick={addRow}
                                    className="h-9 w-9 rounded-md bg-teal-500 hover:bg-teal-600 text-white flex items-center justify-center transition-colors flex-shrink-0"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
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
                    ))}

                    {/* Remaining Amount */}
                    <p className="text-sm text-slate-600">
                        Remaining Amount:{" "}
                        <span className={`font-semibold ${remaining < 0 ? "text-red-600" : "text-slate-800"}`}>
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

                    {/* Save */}
                    <div className="flex justify-end pt-2">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-blue-600 hover:bg-blue-700 px-8 h-9 text-sm"
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
            {!showForm && rows.length === 0 && (
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
