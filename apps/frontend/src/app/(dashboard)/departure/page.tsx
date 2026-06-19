"use client";

import { useState } from "react";
import { Plane, Filter, Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDepartures, useDepartureStats, useDeleteDeparture } from "@/features/departures/api/useDepartures";
import { DepartureFilter } from "@/features/departures/components/DepartureFilter";
import { DepartureForm } from "@/features/departures/components/DepartureForm";
import type { Departure, DepartureFilters } from "@/features/departures/types";

const STATUS_COLORS: Record<string, string> = {
    active: "text-emerald-400 bg-emerald-400/10",
    inactive: "text-muted-foreground bg-muted",
    completed: "text-blue-400 bg-blue-400/10",
    cancelled: "text-red-400 bg-red-400/10",
    scheduled: "text-amber-400 bg-amber-400/10",
    held: "text-orange-400 bg-orange-400/10",
    booked: "text-indigo-400 bg-indigo-400/10",
};

function fmt(date: string) {
    return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
    });
}

function fmtPrice(v: number | null) {
    if (v == null) return "—";
    return `₹${Number(v).toLocaleString("en-IN")}`;
}

export default function DeparturePage() {
    const [filters, setFilters] = useState<DepartureFilters>({});
    const [search, setSearch] = useState("");
    const [showFilter, setShowFilter] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [editing, setEditing] = useState<Departure | null>(null);

    const activeFilters = { ...filters, ...(search ? { search } : {}) };
    const { data, isLoading, error } = useDepartures(activeFilters);
    const { data: stats } = useDepartureStats();
    const deleteDeparture = useDeleteDeparture();

    const departures = data?.departures ?? [];
    const total = data?.total ?? 0;

    async function handleDelete(dep: Departure) {
        if (!confirm(`Delete "${dep.name}"? This cannot be undone.`)) return;
        try {
            await deleteDeparture.mutateAsync(dep.id);
            toast.success("Departure deleted.");
        } catch {
            toast.error("Failed to delete departure.");
        }
    }

    const hasActiveFilters = Object.keys(filters).some((k) => filters[k as keyof DepartureFilters] != null);

    return (
        <div className="crm-page space-y-4">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">Departure Report</h1>
                <Button
                    onClick={() => setShowCreate(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                    <Plus className="h-4 w-4" />
                    New Departure
                </Button>
            </div>

            {/* Stats card */}
            <div className="crm-surface p-4">
                <div className="flex items-center gap-3 mb-1">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/20">
                        <Plane className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-foreground">Departure - Report</p>
                        <p className="text-xs text-muted-foreground">
                            Total # of Departures ({stats?.total_departures ?? 0})
                            {" | "}Total Seats ({stats?.total_seats ?? 0})
                            {" | "}Available Seats ({stats?.available_seats ?? 0})
                        </p>
                    </div>
                </div>
            </div>

            {/* Search + Filter bar */}
            <div className="crm-surface p-4">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Filter by name, destination, city…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>
                    <Button
                        variant={hasActiveFilters ? "default" : "outline"}
                        onClick={() => setShowFilter(true)}
                        className={`gap-2 ${hasActiveFilters ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
                    >
                        <Filter className="h-4 w-4" />
                        Filter
                        {hasActiveFilters && (
                            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
                                {Object.values(filters).filter(Boolean).length}
                            </span>
                        )}
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="crm-surface overflow-hidden">
                {isLoading ? (
                    <div className="space-y-0">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="h-14 animate-pulse border-b border-border bg-muted last:border-0" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                        Failed to load departures.
                    </div>
                ) : departures.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Plane className="h-8 w-8 opacity-30" />
                        <p>No departures found.</p>
                        {hasActiveFilters && (
                            <button
                                onClick={() => setFilters({})}
                                className="text-blue-400 hover:underline text-xs"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-left">
                                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">S.No</th>
                                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Departure ID</th>
                                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Name</th>
                                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Departure / Return Date</th>
                                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">No. of Nights</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Seats</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Booked</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Held</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Available</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">B2B Price</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">B2C Price</th>
                                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {departures.map((dep, idx) => {
                                    const shortId = dep.id.slice(-4).toUpperCase();
                                    const statusCls = STATUS_COLORS[dep.status] ?? "text-muted-foreground bg-muted";
                                    return (
                                        <tr
                                            key={dep.id}
                                            className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors"
                                        >
                                            <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{shortId}</td>
                                            <td className="px-4 py-3 font-semibold text-foreground max-w-[220px]">
                                                <div className="truncate">{dep.name}</div>
                                                {dep.destination && (
                                                    <div className="text-xs text-muted-foreground font-normal">{dep.destination}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusCls}`}>
                                                    {dep.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                                {fmt(dep.departure_date)}
                                                {dep.return_date && (
                                                    <span className="text-muted-foreground/60"> / {fmt(dep.return_date)}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {dep.nights_label ?? "—"}
                                            </td>
                                            <td className="px-4 py-3 text-center font-medium text-foreground">{dep.total_seats}</td>
                                            <td className="px-4 py-3 text-center text-emerald-400 font-medium">{dep.booked_seats}</td>
                                            <td className="px-4 py-3 text-center text-amber-400 font-medium">{dep.held_seats}</td>
                                            <td className="px-4 py-3 text-center text-blue-400 font-medium">{dep.available_seats}</td>
                                            <td className="px-4 py-3 text-right font-semibold text-foreground">
                                                {fmtPrice(dep.price_b2b)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-foreground">
                                                {fmtPrice(dep.price_b2c)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1 justify-end">
                                                    <button
                                                        onClick={() => setEditing(dep)}
                                                        className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(dep)}
                                                        className="rounded p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Footer count */}
                        <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
                            Showing {departures.length} of {total} departures
                        </div>
                    </div>
                )}
            </div>

            {/* Filter panel */}
            {showFilter && (
                <DepartureFilter
                    filters={filters}
                    onApply={setFilters}
                    onClose={() => setShowFilter(false)}
                />
            )}

            {/* Create / Edit modal */}
            {(showCreate || editing) && (
                <DepartureForm
                    departure={editing ?? undefined}
                    onClose={() => { setShowCreate(false); setEditing(null); }}
                />
            )}
        </div>
    );
}
