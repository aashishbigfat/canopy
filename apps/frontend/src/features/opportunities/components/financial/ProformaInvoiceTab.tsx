"use client";

import { useCosting } from "../../api/useOpportunityFinancial";
import { Loader2, FileText, Building2, Calendar, Hash } from "lucide-react";
import { format } from "date-fns";
import { Opportunity } from "../../types";

interface Props {
    opportunityId: string;
    opportunity: Opportunity;
}

export function ProformaInvoiceTab({ opportunityId, opportunity }: Props) {
    const { data: costing, isLoading } = useCosting(opportunityId);

    const invoiceNumber = `PI-${opportunity.id.slice(-6).toUpperCase()}`;
    const today = new Date();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="ml-2 text-slate-500 text-sm">Loading invoice...</span>
            </div>
        );
    }

    const hasItems = costing && costing.items && costing.items.length > 0;

    return (
        <div className="space-y-4">
            {!hasItems ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                    <FileText className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-500 font-medium text-sm">No costing data available</p>
                    <p className="text-slate-400 text-xs mt-1">
                        Add items in the <strong>Costing</strong> tab to generate a proforma invoice
                    </p>
                </div>
            ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                    {/* Invoice Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold tracking-wide">PROFORMA INVOICE</h2>
                                <p className="text-blue-100 text-sm mt-1">Travel Cost Estimate</p>
                            </div>
                            <div className="text-right">
                                <p className="text-blue-100 text-xs uppercase tracking-wide">Invoice No.</p>
                                <p className="text-white font-bold text-lg">{invoiceNumber}</p>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-5">
                        {/* Bill To / Details */}
                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bill To</p>
                                <div className="flex items-start gap-2 mt-2">
                                    <Building2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold text-slate-800 text-sm">
                                            {opportunity.contact_name || opportunity.account_name || "—"}
                                        </p>
                                        {opportunity.contact_email && (
                                            <p className="text-xs text-slate-500">{opportunity.contact_email}</p>
                                        )}
                                        {opportunity.contact_phone && (
                                            <p className="text-xs text-slate-500">{opportunity.contact_phone}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                    <span className="text-xs text-slate-500">Issue Date:</span>
                                    <span className="font-medium text-xs">{format(today, "dd MMM yyyy")}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Hash className="h-3.5 w-3.5 text-slate-400" />
                                    <span className="text-xs text-slate-500">Reference:</span>
                                    <span className="font-medium text-xs text-blue-600">{opportunity.name}</span>
                                </div>
                                {opportunity.travel_date && (
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                        <span className="text-xs text-slate-500">Travel Date:</span>
                                        <span className="font-medium text-xs">
                                            {format(new Date(opportunity.travel_date), "dd MMM yyyy")}
                                        </span>
                                    </div>
                                )}
                                {opportunity.no_of_pax && (
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <span className="text-xs text-slate-500">Pax:</span>
                                        <span className="font-medium text-xs">{opportunity.no_of_pax}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Line Items Table */}
                        <div className="border border-slate-100 rounded-lg overflow-hidden mb-5">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50">
                                        <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Item</th>
                                        <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Supplier</th>
                                        <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Destinations</th>
                                        <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {costing.items.map((item, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3">
                                                <span className="font-medium text-slate-800 text-sm">{item.item_type}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs text-slate-600">{item.supplier_name || "—"}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs text-slate-600">
                                                    {item.destination_names?.join(", ") || "—"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="font-semibold text-slate-800">
                                                    ₹{(item.amount || 0).toLocaleString("en-IN")}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end">
                            <div className="w-64 space-y-1.5">
                                <div className="flex justify-between text-sm text-slate-600 pb-2 border-b border-slate-100">
                                    <span>Subtotal</span>
                                    <span className="font-medium">₹{(costing.total_amount || 0).toLocaleString("en-IN")}</span>
                                </div>
                                <div className="flex justify-between text-base font-bold text-slate-800 pt-1">
                                    <span>Total</span>
                                    <span className="text-blue-600">₹{(costing.total_amount || 0).toLocaleString("en-IN")}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer Note */}
                        <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="text-xs text-blue-600 font-medium">Note</p>
                            <p className="text-xs text-blue-500 mt-0.5">
                                This is a proforma invoice and is subject to change. Final invoice will be issued upon confirmation.
                            </p>
                        </div>

                        {/* Print Button */}
                        <div className="flex justify-end mt-4">
                            <button
                                onClick={() => window.print()}
                                className="text-xs text-slate-500 border border-slate-200 rounded px-4 py-1.5 hover:bg-slate-50 hover:text-slate-700 transition-colors flex items-center gap-1.5"
                            >
                                <FileText className="h-3.5 w-3.5" />
                                Print / Save as PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
