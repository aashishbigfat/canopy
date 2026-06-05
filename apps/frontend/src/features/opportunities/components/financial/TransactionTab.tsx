"use client";

import { useState, useRef, useEffect } from "react";
import {
    useTransactions,
    useCreateTransaction,
} from "../../api/useOpportunityFinancial";
import { Loader2, Receipt, ChevronDown } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { TransactionModal } from "./TransactionModal";

interface Props {
    opportunityId: string;
    opportunityAmount: number;
    /** Costing suppliers with their services — populates the Pay modal Supplier/Services fields */
    suppliers: { id: string; name: string; services: string[] }[];
    /** Destination names selected on this opportunity — populates the Pay modal Location field */
    destinationOptions: string[];
    isLocked?: boolean;
}

export function TransactionTab({ opportunityId, opportunityAmount, suppliers, destinationOptions, isLocked = false }: Props) {
    const { data: transactions = [], isLoading } = useTransactions(opportunityId);
    const createMutation = useCreateTransaction(opportunityId);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<"Receive" | "Pay" | "Refund">("Pay");

    // Dropdown state (for Refund secondary action)
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // ── Calculations ────────────────────────────────────────────────────────

    const totalReceived = transactions
        .filter((t) => t.transaction_type === "Receive")
        .reduce((s, t) => s + t.amount, 0);

    const totalPaid = transactions
        .filter((t) => t.transaction_type === "Pay")
        .reduce((s, t) => s + t.amount, 0);

    const totalRefund = transactions
        .filter((t) => t.transaction_type === "Refund")
        .reduce((s, t) => s + t.amount, 0);

    const totalReceivables = opportunityAmount;
    const totalBalance = totalReceivables - totalReceived + totalRefund;

    // ── Handlers ────────────────────────────────────────────────────────────

    const openCreateModal = (type: "Receive" | "Pay" | "Refund") => {
        setModalType(type);
        setIsModalOpen(true);
        setShowDropdown(false);
    };

    const handleModalSubmit = async (data: {
        transaction_type: "Receive" | "Pay" | "Refund";
        amount: number;
        transaction_date?: string;
        payment_mode?: string;
        reference_id?: string;
        note?: string;
        supplier?: string;
        service?: string;
        destination?: string;
    }) => {
        await createMutation.mutateAsync(data);
    };

    // ── Loading ─────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="ml-2 text-slate-400 text-sm">Loading transactions...</span>
            </div>
        );
    }

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="space-y-4">
            {/* Header with Pay Amount primary + Refund dropdown */}
            <div className="flex justify-between items-center">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Receivables
                </p>

                <div className="relative" ref={dropdownRef}>
                    {/* Single dropdown trigger */}
                    <button
                        onClick={() => !isLocked && setShowDropdown(!showDropdown)}
                        disabled={isLocked}
                        className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 rounded-md px-3.5 py-1.5 text-sm font-medium text-white transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Add Transaction
                        <ChevronDown className="h-3.5 w-3.5" />
                    </button>

                    {showDropdown && (
                        <div className="absolute right-0 mt-1 w-44 bg-slate-900 border border-slate-700 rounded-lg shadow-lg z-20 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                            <button
                                onClick={() => openCreateModal("Pay")}
                                className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-blue-500/20 hover:text-blue-300 transition-colors"
                            >
                                Pay Amount
                            </button>
                            <button
                                onClick={() => openCreateModal("Refund")}
                                className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-blue-500/20 hover:text-blue-300 transition-colors"
                            >
                                Refund Amount
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Transaction Table */}
            {transactions.length > 0 ? (
                <div className="border border-slate-700 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-800 border-b border-slate-700">
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 whitespace-nowrap">
                                        Date
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 whitespace-nowrap">
                                        Received
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 whitespace-nowrap">
                                        Paid
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 whitespace-nowrap">
                                        Refund
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 whitespace-nowrap">
                                        Reference ID
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 whitespace-nowrap">
                                        Mode
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 whitespace-nowrap">
                                        Supplier
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 whitespace-nowrap">
                                        Service
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 whitespace-nowrap">
                                        Destination
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 whitespace-nowrap">
                                        Note
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((txn) => (
                                    <tr
                                        key={txn.id}
                                        className="border-b border-slate-800 last:border-b-0 hover:bg-slate-800/40 transition-colors"
                                    >
                                        {/* Date */}
                                        <td className="px-4 py-3 text-slate-200 whitespace-nowrap">
                                            {txn.transaction_date
                                                ? formatDate(txn.transaction_date)
                                                : "—"}
                                        </td>

                                        {/* Received */}
                                        <td className="px-4 py-3 text-slate-200 whitespace-nowrap">
                                            {txn.transaction_type === "Receive"
                                                ? formatCurrency(txn.amount)
                                                : ""}
                                        </td>

                                        {/* Paid */}
                                        <td className="px-4 py-3 text-slate-200 whitespace-nowrap">
                                            {txn.transaction_type === "Pay"
                                                ? formatCurrency(txn.amount)
                                                : ""}
                                        </td>

                                        {/* Refund */}
                                        <td className="px-4 py-3 text-slate-200 whitespace-nowrap">
                                            {txn.transaction_type === "Refund"
                                                ? formatCurrency(txn.amount)
                                                : ""}
                                        </td>

                                        {/* Reference ID */}
                                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                                            {txn.reference_id || ""}
                                        </td>

                                        {/* Mode */}
                                        <td className="px-4 py-3 text-slate-200 whitespace-nowrap">
                                            {txn.payment_mode || ""}
                                        </td>

                                        {/* Supplier */}
                                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                                            {txn.supplier || ""}
                                        </td>

                                        {/* Service */}
                                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                                            {txn.service || ""}
                                        </td>

                                        {/* Destination */}
                                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                                            {txn.destination || ""}
                                        </td>

                                        {/* Note */}
                                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap max-w-[150px] truncate">
                                            {txn.note || ""}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>

                            {/* Footer Summary — 10 columns total */}
                            <tfoot>
                                <tr className="bg-slate-800 border-t-2 border-slate-700 font-semibold text-sm">
                                    <td className="px-4 py-3 text-slate-300">
                                        Total Receivables
                                    </td>
                                    <td className="px-4 py-3 text-slate-100">
                                        {formatCurrency(totalReceivables)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-300">
                                        Total Received
                                    </td>
                                    <td className="px-4 py-3 text-slate-100">
                                        {formatCurrency(totalReceived)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-300">
                                        Total Paid
                                    </td>
                                    <td className="px-4 py-3 text-slate-100">
                                        {formatCurrency(totalPaid)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-300">
                                        Total Balance
                                    </td>
                                    <td
                                        className={`px-4 py-3 font-bold ${
                                            totalBalance > 0 ? "text-amber-400" : "text-emerald-400"
                                        }`}
                                        colSpan={3}
                                    >
                                        {formatCurrency(totalBalance)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="crm-empty-state">
                    <Receipt className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">No transactions yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Mark payment milestones as <strong>Received</strong> in the Payment Schedule
                        tab or add transactions using the button above.
                    </p>
                </div>
            )}

            {/* Transaction Modal */}
            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleModalSubmit}
                transactionType={modalType}
                opportunityTotal={totalReceivables}
                currentBalance={totalBalance}
                suppliers={suppliers}
                destinationOptions={destinationOptions}
            />
        </div>
    );
}
