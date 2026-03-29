"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, Loader2, TrendingUp, DollarSign, ShoppingCart, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useCosting, useUpsertCosting } from "../../api/useOpportunityFinancial";
import { suppliersService } from "@/lib/api/services/suppliers.service";
import { CostingLineItem } from "@/lib/api/services/financial.service";

// All item types available to add
const ALL_ITEM_TYPES = [
    "Package",
    "Land Package",
    "Meal",
    "Courier Charges",
    "Taxes",
    "Insurance",
    "Departure",
    "Visa",
    "Miscellaneous",
];

interface DestinationOption {
    label: string;
    value: string;
}

interface Props {
    opportunityId: string;
    destinationOptions: DestinationOption[];
}

export function CostingTab({ opportunityId, destinationOptions }: Props) {
    const { data: costing, isLoading } = useCosting(opportunityId);
    const { mutate: saveCosting, isPending: isSaving } = useUpsertCosting(opportunityId);

    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [items, setItems] = useState<CostingLineItem[]>([]);
    const [supplierOptions, setSupplierOptions] = useState<{ label: string; value: string }[]>([]);
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

    // Load suppliers once
    useEffect(() => {
        suppliersService.getSuppliers({}).then((res) => {
            setSupplierOptions(res.suppliers.map((s: any) => ({ label: s.name, value: s.id })));
        }).catch(() => {});
    }, []);

    // Populate from saved costing
    useEffect(() => {
        if (costing) {
            setSelectedTypes(costing.selected_item_types || []);
            setItems(
                (costing.items || []).map((i) => ({
                    ...i,
                    destination_ids: i.destination_ids || [],
                    destination_names: i.destination_names || [],
                }))
            );
        }
    }, [costing]);

    // Add item type pill
    const addItemType = (type: string) => {
        if (selectedTypes.includes(type)) return;
        const newTypes = [...selectedTypes, type];
        setSelectedTypes(newTypes);
        // Add a new line item for the type
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

    // Remove item type pill + its line
    const removeItemType = (type: string) => {
        setSelectedTypes((prev) => prev.filter((t) => t !== type));
        setItems((prev) => prev.filter((i) => i.item_type !== type));
    };

    // Update a field in a line item
    const updateItem = (index: number, field: keyof CostingLineItem, value: any) => {
        setItems((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    // Update supplier for a line item
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
    };

    // Toggle destination for a line item
    const toggleDestination = (index: number, destId: string, destName: string) => {
        setItems((prev) => {
            const next = [...prev];
            const item = next[index];
            const has = item.destination_ids.includes(destId);
            next[index] = {
                ...item,
                destination_ids: has
                    ? item.destination_ids.filter((d) => d !== destId)
                    : [...item.destination_ids, destId],
                destination_names: has
                    ? item.destination_names.filter((n) => n !== destName)
                    : [...item.destination_names, destName],
            };
            return next;
        });
    };

    // Remove a destination tag from a line item
    const removeDestination = (index: number, destId: string) => {
        setItems((prev) => {
            const next = [...prev];
            const item = next[index];
            const destIndex = item.destination_ids.indexOf(destId);
            next[index] = {
                ...item,
                destination_ids: item.destination_ids.filter((d) => d !== destId),
                destination_names: item.destination_names.filter((_, i) => i !== destIndex),
            };
            return next;
        });
    };

    // Computed totals
    const totalAmount = items.reduce((s, i) => s + (i.amount || 0), 0);
    const totalCost = items.reduce((s, i) => s + (i.cost_amount || 0), 0);
    const profit = totalAmount - totalCost;
    const profitPct = totalAmount > 0 ? (profit / totalAmount) * 100 : 0;

    const handleSave = () => {
        saveCosting({ selected_item_types: selectedTypes, items });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <span className="ml-2 text-slate-500 text-sm">Loading costing...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* ── Summary Bar ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-wide">Total Amount</p>
                        <p className="text-base font-bold text-blue-700">₹{totalAmount.toLocaleString("en-IN")}</p>
                    </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <ShoppingCart className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Total Cost</p>
                        <p className="text-base font-bold text-slate-700">₹{totalCost.toLocaleString("en-IN")}</p>
                    </div>
                </div>
                <div className={`border rounded-lg p-3 flex items-center gap-3 ${profit >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${profit >= 0 ? "bg-emerald-100" : "bg-red-100"}`}>
                        <TrendingUp className={`h-4 w-4 ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`} />
                    </div>
                    <div>
                        <p className={`text-[10px] font-semibold uppercase tracking-wide ${profit >= 0 ? "text-emerald-500" : "text-red-500"}`}>Profit</p>
                        <p className={`text-base font-bold ${profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>₹{profit.toLocaleString("en-IN")}</p>
                    </div>
                </div>
                <div className={`border rounded-lg p-3 flex items-center gap-3 ${profitPct >= 0 ? "bg-purple-50 border-purple-100" : "bg-red-50 border-red-100"}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${profitPct >= 0 ? "bg-purple-100" : "bg-red-100"}`}>
                        <Percent className={`h-4 w-4 ${profitPct >= 0 ? "text-purple-600" : "text-red-600"}`} />
                    </div>
                    <div>
                        <p className={`text-[10px] font-semibold uppercase tracking-wide ${profitPct >= 0 ? "text-purple-500" : "text-red-500"}`}>Profit %</p>
                        <p className={`text-base font-bold ${profitPct >= 0 ? "text-purple-700" : "text-red-700"}`}>{profitPct.toFixed(1)}%</p>
                    </div>
                </div>
            </div>

            {/* ── Add Items Multi-Select ── */}
            <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Add Item&apos;s</p>
                <div className="relative">
                    <div
                        className="flex flex-wrap items-center gap-1.5 min-h-[38px] border border-slate-200 rounded-md px-2 py-1.5 bg-white cursor-pointer focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100"
                        onClick={() => setIsTypeDropdownOpen((v) => !v)}
                    >
                        {selectedTypes.map((type) => (
                            <Badge
                                key={type}
                                variant="secondary"
                                className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 flex items-center gap-1 text-xs h-6 px-2"
                                onClick={(e) => { e.stopPropagation(); removeItemType(type); }}
                            >
                                {type}
                                <X className="h-3 w-3 cursor-pointer hover:text-red-500" />
                            </Badge>
                        ))}
                        {selectedTypes.length === 0 && (
                            <span className="text-slate-400 text-xs pl-1">Select items to add to costing...</span>
                        )}
                        <div className="ml-auto">
                            <Plus className="h-4 w-4 text-slate-400" />
                        </div>
                    </div>

                    {/* Dropdown list */}
                    {isTypeDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden">
                            {ALL_ITEM_TYPES.filter((t) => !selectedTypes.includes(t)).map((type) => (
                                <div
                                    key={type}
                                    className="px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors"
                                    onClick={() => addItemType(type)}
                                >
                                    {type}
                                </div>
                            ))}
                            {ALL_ITEM_TYPES.every((t) => selectedTypes.includes(t)) && (
                                <div className="px-3 py-2 text-sm text-slate-400 italic">All item types added</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Line Items Table ── */}
            {items.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">Item&apos;s</th>
                                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Select Supplier</th>
                                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Select Destinations</th>
                                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-36">Amount (₹)</th>
                                <th className="w-8"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item, idx) => (
                                <tr key={item.item_type} className="hover:bg-slate-50/60 transition-colors">
                                    {/* Item Name */}
                                    <td className="px-3 py-2.5">
                                        <span className="text-blue-600 font-medium text-xs">{item.item_type}</span>
                                    </td>

                                    {/* Supplier Dropdown */}
                                    <td className="px-3 py-2">
                                        <SearchableSelect
                                            options={supplierOptions}
                                            value={item.supplier_id || ""}
                                            onChange={(val) => updateSupplier(idx, val)}
                                            placeholder="Select supplier..."
                                            className="w-full"
                                        />
                                    </td>

                                    {/* Destinations Multi-Select */}
                                    <td className="px-3 py-2">
                                        <DestinationMultiSelect
                                            options={destinationOptions}
                                            selected={item.destination_ids}
                                            selectedNames={item.destination_names}
                                            onToggle={(id, name) => toggleDestination(idx, id, name)}
                                            onRemove={(id) => removeDestination(idx, id)}
                                        />
                                    </td>

                                    {/* Amount */}
                                    <td className="px-3 py-2">
                                        <Input
                                            type="number"
                                            min={0}
                                            value={item.amount || ""}
                                            onChange={(e) => updateItem(idx, "amount", parseFloat(e.target.value) || 0)}
                                            className="h-8 text-sm text-right"
                                            placeholder="0.00"
                                        />
                                    </td>

                                    {/* Remove */}
                                    <td className="px-2 py-2">
                                        <button
                                            onClick={() => removeItemType(item.item_type)}
                                            className="h-6 w-6 rounded hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Empty State ── */}
            {items.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                    <ShoppingCart className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-500 font-medium text-sm">No items added yet</p>
                    <p className="text-slate-400 text-xs mt-1">Use the "Add Item's" picker above to add costing items</p>
                </div>
            )}

            {/* ── Update Button ── */}
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
}: {
    options: { label: string; value: string }[];
    selected: string[];
    selectedNames: string[];
    onToggle: (id: string, name: string) => void;
    onRemove: (id: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const filtered = options.filter(
        (o) =>
            !selected.includes(o.value) &&
            o.label.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative">
            <div
                className="flex flex-wrap items-center gap-1 min-h-[32px] border border-slate-200 rounded-md px-2 py-1 bg-white cursor-pointer hover:border-blue-300 transition-colors"
                onClick={() => setOpen((v) => !v)}
            >
                {selected.map((id, i) => (
                    <Badge
                        key={id}
                        variant="secondary"
                        className="bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1 text-[11px] h-5 px-1.5"
                        onClick={(e) => { e.stopPropagation(); onRemove(id); }}
                    >
                        {selectedNames[i] || id}
                        <X className="h-2.5 w-2.5 cursor-pointer hover:text-red-500" />
                    </Badge>
                ))}
                {selected.length === 0 && (
                    <span className="text-slate-400 text-xs">Select destinations...</span>
                )}
            </div>

            {open && (
                <div className="absolute top-full left-0 z-50 mt-1 w-56 bg-white border border-slate-200 rounded-md shadow-lg">
                    <div className="p-2 border-b">
                        <input
                            autoFocus
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search..."
                            className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-slate-400 italic">No destinations found</div>
                        ) : (
                            filtered.map((o) => (
                                <div
                                    key={o.value}
                                    className="px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
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
                    <div
                        className="border-t px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-50 cursor-pointer"
                        onClick={() => setOpen(false)}
                    >
                        Close
                    </div>
                </div>
            )}
        </div>
    );
}
