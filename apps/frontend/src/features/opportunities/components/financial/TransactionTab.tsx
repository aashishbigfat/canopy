"use client";

import { useState, useRef, useEffect } from "react";
import {
    useTransactions,
    useCreateTransaction,
    useUpdateTransaction,
} from "../../api/useOpportunityFinancial";
import { Loader2, Receipt, Pencil, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { TransactionModal } from "./TransactionModal";
import type { Transaction } from "@/lib/api/services/financial.service";

interface Props {
    opportunityId: string;
    opportunityAmount: number;
}

export function TransactionTab({ opportunityId, opportunityAmount }: Props) {
    const { data: transactions = [], isLoading } = useTransactions(opportunityId);
    const createMutation = useCreateTransaction(opportunityId);
    const updateMutation = useUpdateTransaction(opportunityId);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<"Receive" | "Pay" | "Refund">("Receive");
    const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);

    // Dropdown state
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
    const totalBalance = totalReceivables - totalReceived - totalPaid + totalRefund;

    // ── Handlers ────────────────────────────────────────────────────────────

    const openCreateModal = (type: "Receive" | "Pay" | "Refund") => {
        setEditingTxn(null);
        setModalType(type);
        setIsModalOpen(true);
        setShowDropdown(false);
    };

    const openEditModal = (txn: Transaction) => {
        setEditingTxn(txn);
        setModalType(txn.transaction_type as "Receive" | "Pay" | "Refund");
        setIsModalOpen(true);
    };

    const handleModalSubmit = async (data: {
        transaction_type: "Receive" | "Pay" | "Refund";
        amount: number;
        transaction_date?: string;
        payment_mode?: string;
        reference_id?: string;
        note?: string;
    }) => {
        if (editingTxn) {
            await updateMutation.mutateAsync({
                txnId: editingTxn.id,
                data: {
                    amount: data.amount,
                    transaction_date: data.transaction_date,
                    payment_mode: data.payment_mode,
                    reference_id: data.reference_id,
                    note: data.note,
                },
            });
        } else {
            await createMutation.mutateAsync(data);
        }
    };

    // ── Loading ─────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="ml-2 text-slate-500 text-sm">Loading transactions...</span>
            </div>
        );
    }

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="space-y-4">
            {/* Header with Add dropdown */}
            <div className="flex justify-between items-center">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Receivables
                </p>

                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors"
                    >
                        Add Amount
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    </button>

                    {showDropdown && (
                        <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                            <button
                                onClick={() => openCreateModal("Receive")}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                            >
                                Receive Amount
                            </button>
                            <button
                                onClick={() => openCreateModal("Pay")}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                            >
                                Pay Amount
                            </button>
                            <button
                                onClick={() => openCreateModal("Refund")}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                            >
                                Refund Amount
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Transaction Table */}
            {transactions.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
                                        Date
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
                                        Received
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
                                        Paid
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
                                        Refund
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
                                        Reference ID
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
                                        Mode
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
                                        Supplier
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
                                        Service
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
                                        Destinations
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
                                        Note
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap w-16">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((txn) => (
                                    <tr
                                        key={txn.id}
                                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors"
                                    >
                                        {/* Date */}
                                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                                            {txn.transaction_date
                                                ? format(
                                                      new Date(txn.transaction_date),
                                                      "d-MMM-yyyy"
                                                  )
                                                : "—"}
                                        </td>

                                        {/* Received */}
                                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                                            {txn.transaction_type === "Receive"
                                                ? txn.amount.toLocaleString("en-IN")
                                                : ""}
                                        </td>

                                        {/* Paid */}
                                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                                            {txn.transaction_type === "Pay"
                                                ? txn.amount.toLocaleString("en-IN")
                                                : ""}
                                        </td>

                                        {/* Refund */}
                                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                                            {txn.transaction_type === "Refund"
                                                ? txn.amount.toLocaleString("en-IN")
                                                : ""}
                                        </td>

                                        {/* Reference ID */}
                                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                            {txn.reference_id || ""}
                                        </td>

                                        {/* Mode */}
                                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                                            {txn.payment_mode || ""}
                                        </td>

                                        {/* Supplier */}
                                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                            {txn.supplier || ""}
                                        </td>

                                        {/* Service */}
                                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                            {txn.service || ""}
                                        </td>

                                        {/* Destinations */}
                                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                            {txn.destination || ""}
                                        </td>

                                        {/* Note */}
                                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap max-w-[150px] truncate">
                                            {txn.note || ""}
                                        </td>

                                        {/* Action */}
                                        <td className="px-4 py-3">
                                            {/* Only allow editing non-schedule (standalone) transactions */}
                                            {!txn.payment_schedule_item_id ? (
                                                <button
                                                    onClick={() => openEditModal(txn)}
                                                    className="h-7 w-7 rounded-md hover:bg-blue-50 flex items-center justify-center transition-colors"
                                                    title="Edit transaction"
                                                >
                                                    <Pencil className="h-3.5 w-3.5 text-blue-600" />
                                                </button>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 italic">
                                                    auto
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>

                            {/* Footer Summary */}
                            <tfoot>
                                <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold text-sm">
                                    <td className="px-4 py-3 text-slate-600">
                                        Total Receivables
                                    </td>
                                    <td className="px-4 py-3 text-slate-800">
                                        {totalReceivables.toLocaleString("en-IN")}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600" colSpan={2}>
                                        Total Received
                                    </td>
                                    <td className="px-4 py-3 text-slate-800">
                                        {totalReceived.toLocaleString("en-IN")}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        Total Balance
                                    </td>
                                    <td
                                        className={`px-4 py-3 font-bold ${
                                            totalBalance > 0 ? "text-amber-600" : "text-emerald-600"
                                        }`}
                                        colSpan={5}
                                    >
                                        {totalBalance.toLocaleString("en-IN")}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                    <Receipt className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-500 font-medium text-sm">No transactions yet</p>
                    <p className="text-slate-400 text-xs mt-1">
                        Mark payment milestones as <strong>Received</strong> in the Payment Schedule
                        tab or add transactions using the dropdown above.
                    </p>
                </div>
            )}

            {/* Transaction Modal */}
            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingTxn(null);
                }}
                onSubmit={handleModalSubmit}
                editingTransaction={editingTxn}
                transactionType={modalType}
                opportunityTotal={totalReceivables}
                currentBalance={totalBalance}
            />
        </div>
    );
}
