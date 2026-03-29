"use client";

import { useState, useEffect } from "react";
import { CostingTab } from "./CostingTab";
import { PaymentScheduleTab } from "./PaymentScheduleTab";
import { ProformaInvoiceTab } from "./ProformaInvoiceTab";
import { TransactionTab } from "./TransactionTab";
import { Opportunity } from "../../types";
import { cn } from "@/lib/utils";
import { destinationsService } from "@/lib/api/services/destinations.service";

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

    // Pre-fetch destinations once for the costing tab
    useEffect(() => {
        destinationsService
            .getDestinations({ limit: 500 })
            .then((res) => {
                setDestOptions(
                    (res.destinations ?? []).map((d) => ({ label: d.name, value: d.id }))
                );
            })
            .catch(() => {});
    }, []);

    return (
        <div className="space-y-0">
            {/* Sub-tab Navigation */}
            <div className="flex border-b border-slate-200 bg-slate-50/50">
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
                    />
                )}
                {activeTab === "payment-schedule" && (
                    <PaymentScheduleTab opportunityId={opportunity.id} />
                )}
                {activeTab === "proforma-invoice" && (
                    <ProformaInvoiceTab
                        opportunityId={opportunity.id}
                        opportunity={opportunity}
                    />
                )}
                {activeTab === "transaction" && (
                    <TransactionTab opportunityId={opportunity.id} />
                )}
            </div>
        </div>
    );
}
