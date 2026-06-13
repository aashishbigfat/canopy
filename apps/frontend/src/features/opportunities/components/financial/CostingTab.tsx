"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, X, Loader2, TrendingUp, DollarSign, ShoppingCart, Percent, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useCosting, useUpsertCosting } from "../../api/useOpportunityFinancial";
import { suppliersService } from "@/lib/api/services/suppliers.service";
import { financialService, CostingLineItem } from "@/lib/api/services/financial.service";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

// Fallback fixed supplier name (overridden by tenant config on mount)
const DEFAULT_SUPPLIER_FALLBACK = "Your Company";

interface DestinationOption {
    label: string;
    value: string;
}

interface Props {
    opportunityId: string;
    destinationOptions: DestinationOption[];
    // Bug 3: opportunity amount passed in so profit = opportunityAmount - totalCost
    opportunityAmount: number;
    isLocked?: boolean;
}

export function CostingTab({ opportunityId, destinationOptions, opportunityAmount, isLocked = false }: Props) {
    const { data: costing, isLoading } = useCosting(opportunityId);
    const { mutate: saveCosting, isPending: isSaving } = useUpsertCosting(opportunityId);

    // Dynamic item types (user-selectable, not Tax/Misc)
    const [allItemTypes, setAllItemTypes] = useState<string[]>([]);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [items, setItems] = useState<CostingLineItem[]>([]);

    // Bug 4: Tenant-specific supplier name for Tax & Miscellaneous rows
    const [fixedSupplierName, setFixedSupplierName] = useState<string>(DEFAULT_SUPPLIER_FALLBACK);

    // Fixed rows state (Tax & Miscellaneous)
    const [taxItem, setTaxItem] = useState<CostingLineItem>({
        item_type: "Tax",
        supplier_id: undefined,
        supplier_name: DEFAULT_SUPPLIER_FALLBACK,
        destination_ids: [],
        destination_names: [],
        amount: 0,
        cost_amount: 0,
    });
    const [miscItem, setMiscItem] = useState<CostingLineItem>({
        item_type: "Miscellaneous",
        supplier_id: undefined,
        supplier_name: DEFAULT_SUPPLIER_FALLBACK,
        destination_ids: [],
        destination_names: [],
        amount: 0,
        cost_amount: 0,
    });

    const [supplierOptions, setSupplierOptions] = useState<{ label: string; value: string }[]>([]);
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsTypeDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Bug 4: Load tenant financial config to get the correct fixed supplier name
    useEffect(() => {
        financialService.getFinancialConfig().then((config) => {
            const supplierName = config.default_tax_misc_supplier || DEFAULT_SUPPLIER_FALLBACK;
            setFixedSupplierName(supplierName);
            // Update fixed row display names
            setTaxItem((prev) => ({ ...prev, supplier_name: supplierName }));
            setMiscItem((prev) => ({ ...prev, supplier_name: supplierName }));
        }).catch(() => {
            // Silently keep the fallback
        });
    }, []);

    // Bug 1: Load available item types — now includes opportunity inclusions via backend merge
    useEffect(() => {
        financialService.getCostingItemTypes(opportunityId).then((res) => {
            setAllItemTypes(res.item_types || []);
        }).catch(() => {});
    }, [opportunityId]);

    // Load suppliers once
    useEffect(() => {
        suppliersService.getSuppliers({}).then((res) => {
            setSupplierOptions(res.suppliers.map((s: any) => ({ label: s.name, value: s.id })));
        }).catch(() => {});
    }, []);

    // Populate from saved costing
    useEffect(() => {
        if (costing) {
            const savedItems = (costing.items || []).map((i) => ({
                ...i,
                destination_ids: i.destination_ids || [],
                destination_names: i.destination_names || [],
            }));

            // Separate fixed rows from dynamic
            const taxSaved = savedItems.find((i) => i.item_type === "Tax");
            const miscSaved = savedItems.find((i) => i.item_type === "Miscellaneous");
            const dynamicItems = savedItems.filter((i) => i.item_type !== "Tax" && i.item_type !== "Miscellaneous");

            // For fixed rows (Tax & Misc), we ALWAYS want to show the current tenant's company name
            // even if it was saved as something else (like hardcoded "Travel Company") in the past.
            if (taxSaved) setTaxItem((prev) => ({ ...taxSaved, supplier_name: prev.supplier_name }));
            if (miscSaved) setMiscItem((prev) => ({ ...miscSaved, supplier_name: prev.supplier_name }));

            // Bug 1: Restore selectedTypes from saved costing
            const savedTypes = costing.selected_item_types || [];
            setSelectedTypes(savedTypes);

            // Bug 1: Ensure items array matches selectedTypes — fill in any missing rows
            const existingTypes = new Set(dynamicItems.map((i) => i.item_type));
            const restoredItems = [...dynamicItems];
            for (const type of savedTypes) {
                if (!existingTypes.has(type)) {
                    restoredItems.push({
                        item_type: type,
                        supplier_id: undefined,
                        supplier_name: undefined,
                        destination_ids: [],
                        destination_names: [],
                        amount: 0,
                        cost_amount: 0,
                    });
                }
            }
            setItems(restoredItems);
        }
    }, [costing]);

    // ── Item type management ──────────────────────────────────────────────────

    const addItemType = (type: string) => {
        if (selectedTypes.includes(type)) return;
        const newTypes = [...selectedTypes, type];
        setSelectedTypes(newTypes);
        setItems((prev) => [
            ...prev,
            {
                item_type: type,
                supplier_id: undefined,
                supplier_name: undefined,
                destination_ids: [],
                destination_names: [],
                amount: 0,
                cost_amount: 0,
            },
        ]);
        setIsTypeDropdownOpen(false);
    };

    const removeItemType = (type: string) => {
        setSelectedTypes((prev) => prev.filter((t) => t !== type));
        setItems((prev) => prev.filter((i) => i.item_type !== type));
        setValidationErrors((prev) => {
            const next = { ...prev };
            delete next[type];
            return next;
        });
    };

    // ── Row field updates ─────────────────────────────────────────────────────

    const updateItem = (index: number, field: keyof CostingLineItem, value: any) => {
        setItems((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const updateSupplier = (index: number, supplierId: string) => {
        const supplier = supplierOptions.find((s) => s.value === supplierId);
        setItems((prev) => {
            const next = [...prev];
            next[index] = {
                ...next[index],
                supplier_id: supplierId,
                supplier_name: supplier?.label || "",
            };
            return next;
        });
        const itemType = items[index]?.item_type;
        if (itemType && validationErrors[itemType]) {
            setValidationErrors((prev) => {
                const next = { ...prev };
                delete next[itemType];
                return next;
            });
        }
    };

    const clearSupplier = (index: number) => {
        setItems((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], supplier_id: undefined, supplier_name: undefined };
            return next;
        });
    };

    // ── Destination management ────────────────────────────────────────────────

    const toggleDestination = (index: number, destId: string, destName: string, isFixed?: "tax" | "misc") => {
        const updater = (item: CostingLineItem): CostingLineItem => {
            const has = item.destination_ids.includes(destId);
            return {
                ...item,
                destination_ids: has ? item.destination_ids.filter((d) => d !== destId) : [...item.destination_ids, destId],
                destination_names: has ? item.destination_names.filter((n) => n !== destName) : [...item.destination_names, destName],
            };
        };

        if (isFixed === "misc") {
            setMiscItem((prev) => updater(prev));
        } else {
            setItems((prev) => {
                const next = [...prev];
                next[index] = updater(next[index]);
                return next;
            });
        }
    };

    const removeDestination = (index: number, destId: string, isFixed?: "tax" | "misc") => {
        const updater = (item: CostingLineItem): CostingLineItem => {
            const destIndex = item.destination_ids.indexOf(destId);
            return {
                ...item,
                destination_ids: item.destination_ids.filter((d) => d !== destId),
                destination_names: item.destination_names.filter((_, i) => i !== destIndex),
            };
        };

        if (isFixed === "misc") {
            setMiscItem((prev) => updater(prev));
        } else {
            setItems((prev) => {
                const next = [...prev];
                next[index] = updater(next[index]);
                return next;
            });
        }
    };

    // ── Computed totals ───────────────────────────────────────────────────────

    const allItems = [...items, taxItem, miscItem];
    
    // The UI input field is bound to `item.amount`. So Total Cost should sum `i.amount`.
    const totalCost = allItems.reduce((s, i) => s + (i.amount || 0), 0);

    // Profit = Opportunity Amount - Total Cost
    const profit = opportunityAmount - totalCost;
    const profitPct = opportunityAmount > 0 ? (profit / opportunityAmount) * 100 : 0;

    // ── Validation & Save ─────────────────────────────────────────────────────

    const handleSave = () => {
        const errors: Record<string, string> = {};
        let hasZeroAmountItem = false;

        items.forEach((item) => {
            if ((item.amount || 0) <= 0) {
                errors[item.item_type] = "Amount must be greater than 0";
                hasZeroAmountItem = true;
            }
            if ((item.amount || 0) > 0 && !item.supplier_id) {
                errors[item.item_type] = "Supplier is required when amount > 0";
            }
        });

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            if (hasZeroAmountItem) {
                toast.error("Costing items (except Tax/Misc) must have amount > 0");
            } else {
                toast.error("Please select a supplier for all items with an amount");
            }
            return;
        }

        if (totalCost < (opportunityAmount * 0.5)) {
            toast.error("Total costing amount must be at least 50% of the opportunity amount");
            return;
        }

        setValidationErrors({});
        // Ensure fixed rows carry the correct tenant supplier name
        const taxToSave = { ...taxItem, supplier_name: fixedSupplierName };
        const miscToSave = { ...miscItem, supplier_name: fixedSupplierName };
        const allItemsToSave = [...items, taxToSave, miscToSave];
        saveCosting({ selected_item_types: selectedTypes, items: allItemsToSave });
    };

    // ── Loading State ─────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <span className="ml-2 text-slate-400 text-sm">Loading costing...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {isLocked && (
                <div className="flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    <Lock className="h-3.5 w-3.5 flex-shrink-0" />
                    This opportunity is locked. Financial data is read-only.
                </div>
            )}
            {/* ── Summary Bar — Bug 3 fix: Opp. Amount | Total Cost | Profit | Profit % ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
                <SummaryCard
                    icon={<DollarSign className="h-4 w-4 text-blue-600" />}
                    label="Opp. Amount"
                    value={formatCurrency(opportunityAmount)}
                    bg="bg-blue-500/10 border-blue-500/30"
                    iconBg="bg-blue-500/15"
                    labelColor="text-blue-300"
                    valueColor="text-blue-200"
                />
                <SummaryCard
                    icon={<ShoppingCart className="h-4 w-4 text-slate-300" />}
                    label="Total Cost"
                    value={formatCurrency(totalCost)}
                    bg="bg-slate-800 border-slate-700"
                    iconBg="bg-slate-700"
                    labelColor="text-slate-400"
                    valueColor="text-slate-200"
                />
                <SummaryCard
                    icon={<TrendingUp className={`h-4 w-4 ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`} />}
                    label={profit >= 0 ? "Profit" : "Loss"}
                    value={formatCurrency(profit)}
                    bg={profit >= 0 ? "bg-emerald-500/20 border-emerald-500/40" : "bg-red-500/20 border-red-500/40"}
                    iconBg={profit >= 0 ? "bg-emerald-500/30" : "bg-red-500/30"}
                    labelColor={profit >= 0 ? "text-emerald-300" : "text-red-300"}
                    valueColor={profit >= 0 ? "text-emerald-200" : "text-red-200"}
                />
                <SummaryCard
                    icon={<Percent className={`h-4 w-4 ${profitPct >= 0 ? "text-purple-400" : "text-red-400"}`} />}
                    label={profitPct >= 0 ? "Profit %" : "Loss %"}
                    value={`${profitPct.toFixed(2)}%`}
                    bg={profitPct >= 0 ? "bg-purple-500/10 border-purple-500/30" : "bg-red-500/10 border-red-500/30"}
                    iconBg={profitPct >= 0 ? "bg-purple-500/15" : "bg-red-500/15"}
                    labelColor={profitPct >= 0 ? "text-purple-300" : "text-red-300"}
                    valueColor={profitPct >= 0 ? "text-purple-200" : "text-red-200"}
                />
            </div>

            {/* ── Add Items Multi-Select ── */}
            <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Add Item&apos;s</p>
                <div className="relative" ref={dropdownRef}>
                    <div
                        className={`flex flex-wrap items-center gap-1.5 min-h-[38px] border border-slate-700 rounded-md px-2 py-1.5 bg-slate-900 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-500/20 ${isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                        onClick={() => !isLocked && setIsTypeDropdownOpen((v) => !v)}
                    >
                        {selectedTypes.map((type) => (
                            <Badge
                                key={type}
                                variant="secondary"
                                className="bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 flex items-center gap-1 text-xs h-6 px-2"
                                onClick={(e) => { e.stopPropagation(); if (!isLocked) removeItemType(type); }}
                            >
                                {type}
                                {!isLocked && <X className="h-3 w-3 cursor-pointer hover:text-red-500" />}
                            </Badge>
                        ))}
                        {selectedTypes.length === 0 && (
                            <span className="text-slate-400 text-xs pl-1">Select items to add to costing...</span>
                        )}
                        <div className="ml-auto flex items-center gap-1">
                            <X
                                className="h-4 w-4 text-slate-400 hover:text-slate-300 cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); }}
                            />
                            <div className="w-px h-4 bg-slate-700" />
                            <Plus className="h-4 w-4 text-slate-400" />
                        </div>
                    </div>

                    {/* Dropdown list */}
                    {isTypeDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-slate-900 border border-slate-700 rounded-md shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                            {allItemTypes.filter((t) => !selectedTypes.includes(t)).length === 0 ? (
                                <div className="px-3 py-2 text-sm text-slate-400 italic">All item types added</div>
                            ) : (
                                allItemTypes.map((type) => {
                                    const isSelected = selectedTypes.includes(type);
                                    return (
                                        <div
                                            key={type}
                                            className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                                                isSelected
                                                    ? "text-blue-300 font-semibold bg-blue-500/20"
                                                    : "text-slate-200 hover:bg-blue-500/20 hover:text-blue-300"
                                            }`}
                                            onClick={() => !isSelected && addItemType(type)}
                                        >
                                            {type}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Line Items Table ── */}
            <div className="border border-slate-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-800 border-b border-slate-700">
                            <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide w-32">Item&apos;s</th>
                            <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Select Supplier</th>
                            <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Select Destinations</th>
                            <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide w-32">Amount</th>
                            <th className="w-8"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {/* Dynamic rows */}
                        {items.map((item, idx) => (
                            <tr key={item.item_type} className="hover:bg-slate-800/40 transition-colors">
                                <td className="px-3 py-2.5">
                                    <span className="text-blue-400 font-medium text-xs">{item.item_type}</span>
                                </td>
                                <td className="px-3 py-2">
                                    {item.supplier_id ? (
                                        <div className="flex items-center gap-1">
                                            <Badge
                                                variant="secondary"
                                                className={`bg-slate-700 text-slate-200 flex items-center gap-1.5 text-xs h-7 px-2 max-w-[200px] transition-colors group ${isLocked ? "cursor-default" : "cursor-pointer hover:bg-slate-600"}`}
                                                onClick={() => !isLocked && clearSupplier(idx)}
                                                title={isLocked ? undefined : "Click to change supplier"}
                                            >
                                                <span className="truncate">{item.supplier_name}</span>
                                                {!isLocked && (
                                                    <div className="flex items-center justify-center h-4 w-4 rounded-full hover:bg-red-500/20 hover:text-red-400 transition-colors">
                                                        <X className="h-3 w-3 flex-shrink-0" />
                                                    </div>
                                                )}
                                            </Badge>
                                        </div>
                                    ) : isLocked ? (
                                        <span className="text-xs text-slate-500 italic">—</span>
                                    ) : (
                                        <SearchableSelect
                                            options={supplierOptions}
                                            value=""
                                            onValueChange={(val) => updateSupplier(idx, val)}
                                            placeholder="Select supplier..."
                                            className={`w-full ${validationErrors[item.item_type] ? "border-red-500/40" : ""}`}
                                        />
                                    )}
                                    {validationErrors[item.item_type] && (
                                        <p className="text-red-400 text-[10px] mt-0.5">{validationErrors[item.item_type]}</p>
                                    )}
                                </td>
                                <td className="px-3 py-2">
                                    <DestinationMultiSelect
                                        options={destinationOptions}
                                        selected={item.destination_ids}
                                        selectedNames={item.destination_names}
                                        onToggle={(id, name) => toggleDestination(idx, id, name)}
                                        onRemove={(id) => removeDestination(idx, id)}
                                        disabled={isLocked}
                                    />
                                </td>
                                <td className="px-3 py-2">
                                    <AmountInput
                                        value={item.amount ?? 0}
                                        onChange={(n) => updateItem(idx, "amount", n)}
                                        disabled={isLocked}
                                    />
                                </td>
                                <td className="px-2 py-2">
                                    {!isLocked && (
                                        <button
                                            onClick={() => removeItemType(item.item_type)}
                                            className="h-6 w-6 rounded hover:bg-red-500/20 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors"
                                            title="Remove item"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}

                        {/* ── Fixed: Tax Row ── */}
                        <tr className="bg-muted/40 transition-colors hover:bg-muted/60">
                            <td className="px-3 py-2.5">
                                <span className="text-primary font-medium text-xs">Tax</span>
                            </td>
                            <td className="px-3 py-2">
                                {/* Bug 4: tenant-specific supplier name */}
                                <div className="h-8 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground/90 flex items-center">
                                    {fixedSupplierName}
                                </div>
                            </td>
                            <td className="px-3 py-2">
                                <div className="py-1.5 text-xs italic text-muted-foreground"></div>
                            </td>
                            <td className="px-3 py-2">
                                <AmountInput
                                    value={taxItem.amount ?? 0}
                                    onChange={(n) => setTaxItem((prev) => ({ ...prev, amount: n }))}
                                    disabled={isLocked}
                                />
                            </td>
                            <td className="px-2 py-2"></td>
                        </tr>

                        {/* ── Fixed: Miscellaneous Row ── */}
                        <tr className="bg-muted/40 transition-colors hover:bg-muted/60">
                            <td className="px-3 py-2.5">
                                <span className="text-primary font-medium text-xs">Miscellaneous</span>
                            </td>
                            <td className="px-3 py-2">
                                <div className="h-8 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground/90 flex items-center">
                                    {fixedSupplierName}
                                </div>
                            </td>
                            <td className="px-3 py-2">
                                <DestinationMultiSelect
                                    options={destinationOptions}
                                    selected={miscItem.destination_ids}
                                    selectedNames={miscItem.destination_names}
                                    onToggle={(id, name) => toggleDestination(0, id, name, "misc")}
                                    onRemove={(id) => removeDestination(0, id, "misc")}
                                    disabled={isLocked}
                                />
                            </td>
                            <td className="px-3 py-2">
                                <AmountInput
                                    value={miscItem.amount ?? 0}
                                    onChange={(n) => setMiscItem((prev) => ({ ...prev, amount: n }))}
                                    disabled={isLocked}
                                />
                            </td>
                            <td className="px-2 py-2"></td>
                        </tr>
                    </tbody>
                    </table>
                </div>
            </div>

            {/* ── Empty State ── */}
            {items.length === 0 && !taxItem.amount && !miscItem.amount && (
                <div className="crm-empty-state">
                    <ShoppingCart className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">No costing items added yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">Use the &quot;Add Item&apos;s&quot; picker above to add costing items</p>
                </div>
            )}

            {/* ── Update Button ── */}
            {!isLocked && (
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
                            "Update"
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}


// ── Amount Input ─────────────────────────────────────────────────────────────
// A numeric money input backed by a local string so a lone "0" can be cleared and
// decimals like "0.5" can be typed. Binding an <input type="number"> directly to a
// numeric value forces a sticky "0" that can't be deleted and makes typing
// prepend/append to it (e.g. typing 8 yields "80").
function AmountInput({
    value,
    onChange,
    disabled,
}: {
    value: number;
    onChange: (n: number) => void;
    disabled?: boolean;
}) {
    const [text, setText] = useState<string>(value ? String(value) : "");

    // Re-sync only when the external numeric value genuinely differs from what's
    // typed (e.g. saved costing loads), so in-progress input isn't clobbered.
    useEffect(() => {
        const parsed = text.trim() === "" ? 0 : parseFloat(text);
        if ((Number.isNaN(parsed) ? 0 : parsed) !== value) {
            setText(value ? String(value) : "");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return (
        <Input
            type="number"
            min={0}
            step="0.01"
            value={text}
            placeholder=""
            onChange={(e) => {
                const raw = e.target.value;
                setText(raw);
                const n = raw.trim() === "" ? 0 : Math.max(0, parseFloat(raw) || 0);
                onChange(n);
            }}
            className="h-8 text-sm text-right"
            disabled={disabled}
        />
    );
}


// ── Summary Card Component ───────────────────────────────────────────────────

function SummaryCard({ icon, label, value, bg, iconBg, labelColor, valueColor }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    bg: string;
    iconBg: string;
    labelColor: string;
    valueColor: string;
}) {
    return (
        <div className={`border rounded-lg p-3 flex items-center gap-3 ${bg}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                {icon}
            </div>
            <div>
                <p className={`text-[10px] font-semibold uppercase tracking-wide ${labelColor}`}>{label}</p>
                <p className={`text-base font-bold ${valueColor}`}>{value}</p>
            </div>
        </div>
    );
}


// ── Inline Destination Multi-Select ──────────────────────────────────────────

function DestinationMultiSelect({
    options,
    selected,
    selectedNames,
    onToggle,
    onRemove,
    disabled = false,
}: {
    options: { label: string; value: string }[];
    selected: string[];
    selectedNames: string[];
    onToggle: (id: string, name: string) => void;
    onRemove: (id: string) => void;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const filtered = options.filter(
        (o) =>
            !selected.includes(o.value) &&
            o.label.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative" ref={ref}>
            <div
                className={`flex flex-wrap items-center gap-1 min-h-[32px] border border-slate-700 rounded-md px-2 py-1 bg-slate-900 transition-colors ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-blue-500/40"}`}
                onClick={() => !disabled && setOpen((v) => !v)}
            >
                {selected.map((id, i) => (
                    <Badge
                        key={id}
                        variant="secondary"
                        className="bg-slate-700 text-slate-200 hover:bg-slate-600 flex items-center gap-1 text-[11px] h-5 px-1.5"
                        onClick={(e) => { e.stopPropagation(); if (!disabled) onRemove(id); }}
                    >
                        {selectedNames[i] || id}
                        {!disabled && <X className="h-2.5 w-2.5 cursor-pointer hover:text-red-400" />}
                    </Badge>
                ))}
                {selected.length === 0 && (
                    <span className="text-slate-400 text-xs">Select destinations...</span>
                )}
            </div>

            {open && (
                <div className="absolute top-full left-0 z-50 mt-1 w-56 bg-slate-900 border border-slate-700 rounded-md shadow-lg">
                    <div className="p-2 border-b">
                        <input
                            autoFocus
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search..."
                            className="w-full text-xs border border-slate-700 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                        {options.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-slate-400 italic">No destinations selected on this opportunity</div>
                        ) : filtered.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-slate-400 italic">No more destinations available</div>
                        ) : (
                            filtered.map((o) => (
                                <div
                                    key={o.value}
                                    className="px-3 py-1.5 text-xs text-slate-200 hover:bg-blue-500/20 hover:text-blue-300 cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggle(o.value, o.label);
                                        setSearch("");
                                    }}
                                >
                                    {o.label}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
