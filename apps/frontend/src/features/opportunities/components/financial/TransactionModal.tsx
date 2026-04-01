"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Transaction } from "@/lib/api/services/financial.service";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        transaction_type: "Receive" | "Pay" | "Refund";
        amount: number;
        transaction_date?: string;
        payment_mode?: string;
        reference_id?: string;
        note?: string;
    }) => Promise<void>;
    /** If provided we are editing, otherwise creating */
    editingTransaction?: Transaction | null;
    /** "Receive", "Pay", or "Refund" – used for new transactions */
    transactionType: "Receive" | "Pay" | "Refund";
    opportunityTotal?: number;
    currentBalance?: number;
}

const PAYMENT_MODES = ["Select Payment Mode", "Cash", "Cheque", "Online", "Other"];

export function TransactionModal({
    isOpen,
    onClose,
    onSubmit,
    editingTransaction,
    transactionType,
    opportunityTotal,
    currentBalance,
}: Props) {
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [paymentMode, setPaymentMode] = useState("");
    const [referenceId, setReferenceId] = useState("");
    const [note, setNote] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Pre-fill when editing
    useEffect(() => {
        if (editingTransaction) {
            setAmount(String(editingTransaction.amount || ""));
            setDate(
                editingTransaction.transaction_date
                    ? new Date(editingTransaction.transaction_date).toISOString().split("T")[0]
                    : new Date().toISOString().split("T")[0]
            );
            setPaymentMode(editingTransaction.payment_mode || "");
            setReferenceId(editingTransaction.reference_id || "");
            setNote(editingTransaction.note || "");
        } else {
            setAmount("");
            setDate(new Date().toISOString().split("T")[0]);
            setPaymentMode("");
            setReferenceId("");
            setNote("");
        }
    }, [editingTransaction, isOpen]);

    if (!isOpen) return null;

    const isEditing = !!editingTransaction;
    const title = isEditing
        ? `Edit ${editingTransaction.transaction_type === "Refund" ? "Refund" : editingTransaction.transaction_type === "Receive" ? "Receive" : "Pay"} Transaction`
        : transactionType === "Pay"
        ? "Pay Amount"
        : transactionType === "Receive"
        ? "Receive Amount"
        : "Refund Amount";

    const handleSubmit = async () => {
        const parsedAmount = parseFloat(amount);
        if (!parsedAmount || parsedAmount <= 0) {
            toast.error("Please enter a valid amount greater than 0.");
            return;
        }
        if (!date) {
            toast.error("Please select a date.");
            return;
        }

        setIsSaving(true);
        try {
            await onSubmit({
                transaction_type: isEditing
                    ? (editingTransaction.transaction_type as "Receive" | "Pay" | "Refund")
                    : transactionType,
                amount: parsedAmount,
                transaction_date: new Date(date).toISOString(),
                payment_mode: paymentMode && paymentMode !== "Select Payment Mode" ? paymentMode : undefined,
                reference_id: referenceId || undefined,
                note: note || undefined,
            });
            onClose();
        } catch {
            // handled by caller
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h3 className="text-base font-semibold text-slate-800">{title}</h3>
                    <button
                        onClick={onClose}
                        className="h-7 w-7 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
                    >
                        <X className="h-4 w-4 text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    {/* Amount & Date row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                {transactionType === "Receive" ? "Amount Received" : "Amount"}<span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="number"
                                min={0}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                className="h-10"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                Date<span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="h-10"
                            />
                        </div>
                    </div>

                    {/* Payment Mode & Reference ID row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                Payment Mode
                            </label>
                            <select
                                value={paymentMode}
                                onChange={(e) => setPaymentMode(e.target.value)}
                                className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
                            >
                                {PAYMENT_MODES.map((mode) => (
                                    <option key={mode} value={mode === "Select Payment Mode" ? "" : mode}>
                                        {mode}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                Reference ID
                            </label>
                            <Input
                                type="text"
                                value={referenceId}
                                onChange={(e) => setReferenceId(e.target.value)}
                                placeholder="Reference ID"
                                className="h-10"
                            />
                        </div>
                    </div>

                    {/* Note row */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">
                            Note
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Note"
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors resize-y"
                        />
                    </div>

                    {/* Total and Balance (Screenshots logic) */}
                    {transactionType === "Receive" && opportunityTotal !== undefined && currentBalance !== undefined && (
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <p className="text-sm text-slate-700 font-semibold gap-2 flex items-center">
                                Total: <span className="text-slate-500 font-normal">{opportunityTotal.toLocaleString("en-IN")}</span>
                            </p>
                            <p className="text-sm text-slate-700 font-semibold gap-2 flex items-center">
                                Balance: <span className="text-slate-500 font-normal">{currentBalance.toLocaleString("en-IN")}</span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/50 rounded-b-xl">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="h-9 px-5 text-sm"
                    >
                        Close
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700 h-9 px-5 text-sm"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save changes"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
