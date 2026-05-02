"use client";

import { useState, useEffect, useMemo } from "react";
import { CostingTab } from "./CostingTab";
import { PaymentScheduleTab } from "./PaymentScheduleTab";
import { ProformaInvoiceTab } from "./ProformaInvoiceTab";
import { TransactionTab } from "./TransactionTab";
import { Opportunity } from "../../types";
import { cn } from "@/lib/utils";
import { financialService } from "@/lib/api/services/financial.service";
import { useCosting } from "../../api/useOpportunityFinancial";

const SUB_TABS = [
    { id: "costing", label: "Costing" },
    { id: "payment-schedule", label: "Payment Schedule" },
    { id: "proforma-invoice", label: "Proforma Invoice" },
    { id: "transaction", label: "Transaction" },
] as const;

type SubTabId = (typeof SUB_TABS)[number]["id"];

interface Props {
    opportunity: Opportunity;
}

export function FinancialTab({ opportunity }: Props) {
    const [activeTab, setActiveTab] = useState<SubTabId>("costing");
    const [destOptions, setDestOptions] = useState<{ label: string; value: string }[]>([]);

    // Fetch saved costing to derive suppliers & destinations for the Transaction modal
    const { data: costing } = useCosting(opportunity.id);

    // Unique suppliers from costing line items (excluding Tax/Misc fixed rows with no supplier_id)
    const costingSuppliers = useMemo<string[]>(() => {
        if (!costing?.items) return [];
        const names = costing.items
            .filter((item) => item.supplier_name && item.item_type !== "Tax" && item.item_type !== "Miscellaneous")
            .map((item) => item.supplier_name as string);
        return Array.from(new Set(names));
    }, [costing]);

    // Unique destinations from costing line items
    const costingDestinations = useMemo<string[]>(() => {
        if (!costing?.items) return [];
        const names = costing.items.flatMap((item) => item.destination_names || []);
        return Array.from(new Set(names));
    }, [costing]);

    // Fetch SCOPED destinations from the opportunity (not global!)
    useEffect(() => {
        financialService
            .getCostingDestinations(opportunity.id)
            .then((destinations) => {
                setDestOptions(
                    destinations.map((d) => ({ label: d.name, value: d.id }))
                );
            })
            .catch(() => {
                // Fallback: use opportunity.industry_data.destination_names if API fails
                const destNames = opportunity.industry_data?.destination_names;
                if (destNames && destNames.length > 0) {
                    setDestOptions(
                        destNames.map((name: string) => ({
                            label: name,
                            value: name,
                        }))
                    );
                }
            });
    }, [opportunity.id, opportunity.industry_data?.destination_names]);

    return (
        <div className="space-y-0">
            {/* Sub-tab Navigation */}
            <div className="flex border-b border-slate-200 bg-slate-50/50 overflow-x-auto scrollbar-hide">
                {SUB_TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "px-5 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap",
                            activeTab === tab.id
                                ? "border-blue-500 text-blue-600 bg-white"
                                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/60"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Sub-tab Content */}
            <div className="pt-5">
                {activeTab === "costing" && (
                    <CostingTab
                        opportunityId={opportunity.id}
                        destinationOptions={destOptions}
                        opportunityAmount={opportunity.amount ?? 0}
                    />
                )}
                {activeTab === "payment-schedule" && (
                    <PaymentScheduleTab
                        opportunityId={opportunity.id}
                        opportunityAmount={opportunity.amount ?? 0}
                    />
                )}
                {activeTab === "proforma-invoice" && (
                    <ProformaInvoiceTab
                        opportunityId={opportunity.id}
                        opportunity={opportunity}
                    />
                )}
                {activeTab === "transaction" && (
                    <TransactionTab
                        opportunityId={opportunity.id}
                        opportunityAmount={opportunity.amount ?? 0}
                        costingSuppliers={costingSuppliers}
                        costingDestinations={costingDestinations}
                    />
                )}
            </div>
        </div>
    );
}
