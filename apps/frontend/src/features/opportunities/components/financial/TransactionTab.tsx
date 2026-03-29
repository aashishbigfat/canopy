"use client";

import { usePaymentSchedule } from "../../api/useOpportunityFinancial";
import { Loader2, ArrowUpRight, ArrowDownLeft, Receipt } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface Props {
    opportunityId: string;
}

export function TransactionTab({ opportunityId }: Props) {
    const { data: items = [], isLoading } = usePaymentSchedule(opportunityId);

    // Only show "Paid" items as transactions
    const transactions = items.filter((i) => i.status === "Paid");

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="ml-2 text-slate-500 text-sm">Loading transactions...</span>
            </div>
        );
    }

    const total = transactions.reduce((s, t) => s + t.amount, 0);

    return (
        <div className="space-y-4">
            {/* Summary */}
            {transactions.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Total Received</p>
                        <p className="text-2xl font-bold text-emerald-700 mt-0.5">
                            ₹{total.toLocaleString("en-IN")}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Transactions</p>
                        <p className="text-2xl font-bold text-emerald-700 mt-0.5">{transactions.length}</p>
                    </div>
                </div>
            )}

            {/* Transaction List */}
            {transactions.length > 0 ? (
                <div className="space-y-2">
                    {transactions.map((txn, idx) => (
                        <div
                            key={txn.id}
                            className="flex items-center gap-4 border border-slate-100 rounded-lg px-4 py-3 bg-white hover:shadow-sm transition-shadow"
                        >
                            {/* Icon */}
                            <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-800 text-sm truncate">
                                    {txn.description || `Payment #${idx + 1}`}
                                </p>
                                <div className="flex items-center gap-3 mt-0.5">
                                    {txn.payment_method && (
                                        <span className="text-[10px] text-slate-500">{txn.payment_method}</span>
                                    )}
                                    {txn.reference_number && (
                                        <span className="text-[10px] text-slate-400">Ref: {txn.reference_number}</span>
                                    )}
                                    {txn.paid_at && (
                                        <span className="text-[10px] text-slate-400">
                                            {format(new Date(txn.paid_at), "dd MMM yyyy HH:mm")}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Amount */}
                            <div className="text-right">
                                <p className="font-bold text-emerald-600 text-sm">
                                    +₹{txn.amount.toLocaleString("en-IN")}
                                </p>
                                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] h-4 px-1.5 mt-0.5">
                                    Received
                                </Badge>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                    <Receipt className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-500 font-medium text-sm">No transactions yet</p>
                    <p className="text-slate-400 text-xs mt-1">
                        Mark payment milestones as <strong>Paid</strong> in the Payment Schedule tab to see them here
                    </p>
                </div>
            )}
        </div>
    );
}
