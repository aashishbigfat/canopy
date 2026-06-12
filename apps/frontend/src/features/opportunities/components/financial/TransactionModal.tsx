"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

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
        supplier?: string;
        service?: string;
        destination?: string;
    }) => Promise<void>;
    transactionType: "Receive" | "Pay" | "Refund";
    opportunityTotal?: number;
    currentBalance?: number;
    /** Costing suppliers with their services — drives the Supplier & Services fields */
    suppliers?: { id: string; name: string; services: string[] }[];
    /** Destination names selected on this opportunity — drives the Location field */
    destinationOptions?: string[];
}

const PAYMENT_MODES = ["Select Payment Mode", "Cash", "Cheque", "Online", "Other"];

export function TransactionModal({
    isOpen,
    onClose,
    onSubmit,
    transactionType,
    opportunityTotal,
    currentBalance,
    suppliers = [],
    destinationOptions = [],
}: Props) {
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [paymentMode, setPaymentMode] = useState("");
    const [referenceId, setReferenceId] = useState("");
    const [note, setNote] = useState("");
    const [supplier, setSupplier] = useState("");
    const [service, setService] = useState("");
    const [location, setLocation] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Reset fields whenever modal opens
    useEffect(() => {
        if (isOpen) {
            setAmount("");
            setDate(new Date().toISOString().split("T")[0]);
            setPaymentMode("");
            setReferenceId("");
            setNote("");
            setSupplier("");
            setService("");
            setLocation("");
        }
    }, [isOpen]);

    // Safe close — prevents backdrop/Escape from closing while a save is in flight
    const safeClose = useCallback(() => {
        if (!isSaving) onClose();
    }, [isSaving, onClose]);

    // Escape key handler
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") safeClose();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [isOpen, safeClose]);

    if (!isOpen) return null;

    const title =
        transactionType === "Pay"
            ? "Pay Amount"
            : transactionType === "Refund"
            ? "Refund Amount"
            : "Receive Amount";

    const isPay = transactionType === "Pay";
    const showBalance = opportunityTotal !== undefined && currentBalance !== undefined;

    // Services available for the chosen supplier (Bug 2: services follow the supplier)
    const selectedSupplierServices =
        suppliers.find((s) => s.name === supplier)?.services ?? [];

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
        // Supplier is required for Pay transactions
        if (isPay && !supplier) {
            toast.error("Please select a supplier.");
            return;
        }

        setIsSaving(true);
        try {
            await onSubmit({
                transaction_type: transactionType,
                amount: parsedAmount,
                transaction_date: new Date(date).toISOString(),
                payment_mode:
                    paymentMode && paymentMode !== "Select Payment Mode" ? paymentMode : undefined,
                reference_id: referenceId || undefined,
                note: note || undefined,
                supplier: supplier || undefined,
                service: service && service !== "Select Service" ? service : undefined,
                destination: location || undefined,
            });
            onClose();
        } catch {
            // handled by caller (mutation toast)
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={safeClose}
            />

            {/* Modal */}
            <div className="relative bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                    <h3 className="text-base font-semibold text-slate-100">{title}</h3>
                    <button
                        onClick={safeClose}
                        disabled={isSaving}
                        className="h-7 w-7 rounded-full hover:bg-slate-800 flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                        <X className="h-4 w-4 text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    {/* Amount & Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                {isPay ? "Amount Paid" : "Amount"}
                                <span className="text-red-500 ml-0.5">*</span>
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
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                Date<span className="text-red-500 ml-0.5">*</span>
                            </label>
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="h-10"
                            />
                        </div>
                    </div>

                    {/* Payment Mode & Reference ID */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                Payment Mode
                            </label>
                            <select
                                value={paymentMode}
                                onChange={(e) => setPaymentMode(e.target.value)}
                                className="w-full h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
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
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">
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

                    {/* Pay-specific fields */}
                    {isPay && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                {/* Supplier — required, dropdown from costing */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                        Supplier
                                        <span className="text-red-500 ml-0.5">*</span>
                                    </label>
                                    <select
                                        value={supplier}
                                        onChange={(e) => {
                                            setSupplier(e.target.value);
                                            // Reset service — it depends on the chosen supplier
                                            setService("");
                                        }}
                                        className={`w-full h-10 rounded-md border bg-slate-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors ${
                                            !supplier
                                                ? "border-slate-700 text-slate-400"
                                                : "border-slate-700 text-slate-200"
                                        }`}
                                    >
                                        <option value="">Select Supplier</option>
                                        {suppliers.length > 0 ? (
                                            suppliers.map((s) => (
                                                <option key={s.id} value={s.name}>
                                                    {s.name}
                                                </option>
                                            ))
                                        ) : (
                                            <option disabled value="">
                                                No suppliers available
                                            </option>
                                        )}
                                    </select>
                                </div>

                                {/* Services — follow the selected supplier */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                        Services
                                    </label>
                                    <select
                                        value={service}
                                        onChange={(e) => setService(e.target.value)}
                                        disabled={!supplier}
                                        className={`w-full h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                                            !service ? "text-slate-400" : "text-slate-200"
                                        }`}
                                    >
                                        <option value="">
                                            {!supplier ? "Select a supplier first" : "Select Service"}
                                        </option>
                                        {supplier && selectedSupplierServices.length > 0 ? (
                                            selectedSupplierServices.map((svc) => (
                                                <option key={svc} value={svc}>
                                                    {svc}
                                                </option>
                                            ))
                                        ) : supplier ? (
                                            <option disabled value="">
                                                No services for this supplier
                                            </option>
                                        ) : null}
                                    </select>
                                </div>
                            </div>

                            {/* Locations — dropdown from costing destinations */}
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                    Locations
                                </label>
                                <select
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className={`w-full h-10 rounded-md border bg-slate-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors ${
                                        !location
                                            ? "border-slate-700 text-slate-400"
                                            : "border-slate-700 text-slate-200"
                                    }`}
                                >
                                    <option value="">Select Location</option>
                                    {destinationOptions.length > 0 ? (
                                        destinationOptions.map((d) => (
                                            <option key={d} value={d}>
                                                {d}
                                            </option>
                                        ))
                                    ) : (
                                        <option disabled value="">
                                            No destinations on this opportunity
                                        </option>
                                    )}
                                </select>
                            </div>
                        </>
                    )}

                    {/* Note */}
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                            Note
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Note"
                            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 min-h-[72px] focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors resize-y"
                        />
                    </div>

                    {/* Balance footer */}
                    {showBalance && (
                        <div className="grid grid-cols-2 gap-4 pt-1 border-t border-slate-800">
                            <p className="text-sm text-slate-200 font-semibold flex items-center gap-2">
                                Total:{" "}
                                <span className="text-slate-400 font-normal">
                                    {formatCurrency(opportunityTotal!)}
                                </span>
                            </p>
                            <p className="text-sm text-slate-200 font-semibold flex items-center gap-2">
                                Balance:{" "}
                                <span
                                    className={`font-normal ${
                                        currentBalance! > 0
                                            ? "text-amber-400"
                                            : "text-emerald-400"
                                    }`}
                                >
                                    {formatCurrency(currentBalance!)}
                                </span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-700 bg-slate-800/50 rounded-b-xl">
                    <Button
                        variant="outline"
                        onClick={safeClose}
                        disabled={isSaving}
                        className="h-9 px-5 text-sm"
                    >
                        Cancel
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
                            "Save"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
