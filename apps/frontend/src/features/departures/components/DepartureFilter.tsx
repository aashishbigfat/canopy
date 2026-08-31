"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useDepartureDestinations } from "../api/useDepartures";
import type { DepartureFilters } from "../types";

interface Props {
    filters: DepartureFilters;
    onApply: (f: DepartureFilters) => void;
    onClose: () => void;
}

const FLIGHT_OPTIONS = [
    { value: "all", label: "All" },
    { value: "true", label: "With Flight" },
    { value: "false", label: "Without Flight" },
];

export function DepartureFilter({ filters, onApply, onClose }: Props) {
    const { data: destinations = [] } = useDepartureDestinations();

    const [local, setLocal] = useState<DepartureFilters>({ ...filters });

    function handleSubmit() {
        onApply(local);
        onClose();
    }

    function handleReset() {
        const cleared: DepartureFilters = {};
        setLocal(cleared);
        onApply(cleared);
        onClose();
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
            <div
                className="relative h-full w-full max-w-sm overflow-y-auto bg-card border-l border-border shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between bg-blue-600 px-5 py-4">
                    <h2 className="text-base font-semibold text-white">Departure Filter</h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Section label */}
                <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                        Departure Information
                    </p>
                </div>

                {/* Filters */}
                <div className="flex-1 space-y-6 p-5">
                    {/* Destinations */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Destinations</label>
                        <SearchableSelect
                            options={[
                                { label: "All destinations", value: "_all" },
                                ...destinations.map((d) => ({ label: d, value: d })),
                            ]}
                            value={local.destination ?? "_all"}
                            onValueChange={(v) =>
                                setLocal((p) => ({ ...p, destination: !v || v === "_all" ? undefined : v }))
                            }
                            placeholder="Select destination..."
                            searchPlaceholder="Search destinations..."
                        />
                    </div>

                    {/* Date range */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Choose a date range</label>
                        <div className="flex gap-2">
                            <input
                                type="date"
                                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                value={local.date_from ?? ""}
                                onChange={(e) => setLocal((p) => ({ ...p, date_from: e.target.value || undefined }))}
                            />
                            <span className="self-center text-muted-foreground text-sm">—</span>
                            <input
                                type="date"
                                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                value={local.date_to ?? ""}
                                onChange={(e) => setLocal((p) => ({ ...p, date_to: e.target.value || undefined }))}
                            />
                        </div>
                    </div>

                    {/* Flight */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Flight</label>
                        <Select
                            value={
                                local.has_flight == null ? "all"
                                : local.has_flight ? "true" : "false"
                            }
                            onValueChange={(v) =>
                                setLocal((p) => ({
                                    ...p,
                                    has_flight: v === "all" ? undefined : v === "true",
                                }))
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {FLIGHT_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 border-t border-border px-5 py-4">
                    <Button variant="outline" onClick={handleReset}>Reset</Button>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                    <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white">
                        Submit
                    </Button>
                </div>
            </div>
        </div>
    );
}
