"use client";

import { useState, useEffect, useMemo } from "react";
import { CostingTab } from "./CostingTab";
import { PaymentScheduleTab } from "./PaymentScheduleTab";
import { ProformaInvoiceTab } from "./ProformaInvoiceTab";
import { TransactionTab } from "./TransactionTab";
import { Opportunity } from "../../types";
import { cn } from "@/lib/utils";
import { financialService } from "@/lib/api/services/financial.service";
import { suppliersService } from "@/lib/api/services/suppliers.service";
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
    const isLocked = opportunity.is_locked ?? false;
    const [activeTab, setActiveTab] = useState<SubTabId>("costing");
    const [destOptions, setDestOptions] = useState<{ label: string; value: string }[]>([]);
    // Lookup of every tenant supplier (id → services), used to enrich the costing suppliers
    const [supplierServiceMap, setSupplierServiceMap] = useState<Record<string, string[]>>({});

    // Saved costing — the Pay modal supplier list is scoped to the suppliers
    // actually chosen on this opportunity's costing sheet (not all tenant suppliers).
    const { data: costing } = useCosting(opportunity.id);

    // Destination names selected on this opportunity — used by the Pay modal's Location field
    const opportunityDestinations = useMemo<string[]>(
        () => destOptions.map((d) => d.label),
        [destOptions]
    );

    // Suppliers for the Pay modal: only those selected on the costing sheet,
    // de-duplicated by supplier id, enriched with each supplier's services.
    const suppliers = useMemo<{ id: string; name: string; services: string[] }[]>(() => {
        if (!costing?.items) return [];
        const result: { id: string; name: string; services: string[] }[] = [];
        const seen = new Set<string>();
        for (const item of costing.items) {
            if (item.item_type === "Tax" || item.item_type === "Miscellaneous") continue;
            if (!item.supplier_id || seen.has(item.supplier_id)) continue;
            seen.add(item.supplier_id);
            result.push({
                id: item.supplier_id,
                name: item.supplier_name || "",
                services: supplierServiceMap[item.supplier_id] || [],
            });
        }
        return result;
    }, [costing, supplierServiceMap]);

    // Load all tenant suppliers once to build the id → services lookup.
    useEffect(() => {
        suppliersService
            .getSuppliers({})
            .then((res) => {
                const map: Record<string, string[]> = {};
                res.suppliers.forEach((s) => {
                    map[s.id] = s.services || [];
                });
                setSupplierServiceMap(map);
            })
            .catch(() => {});
    }, []);

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
            <div className="flex overflow-x-auto border-b border-border bg-muted/40 scrollbar-hide">
                {SUB_TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "px-5 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap",
                            activeTab === tab.id
                                ? "border-blue-500 bg-card text-blue-600"
                                : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
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
                        isLocked={isLocked}
                    />
                )}
                {activeTab === "payment-schedule" && (
                    <PaymentScheduleTab
                        opportunityId={opportunity.id}
                        opportunityAmount={opportunity.amount ?? 0}
                        isLocked={isLocked}
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
                        suppliers={suppliers}
                        destinationOptions={opportunityDestinations}
                        isLocked={isLocked}
                    />
                )}
            </div>
        </div>
    );
}
