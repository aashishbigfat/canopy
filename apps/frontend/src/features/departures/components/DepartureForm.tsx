"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useCreateDeparture, useUpdateDeparture } from "../api/useDepartures";
import type { Departure, DepartureCreatePayload } from "../types";

interface Props {
    departure?: Departure;
    onClose: () => void;
}

const STATUS_OPTIONS = ["active", "inactive", "completed", "cancelled"];

export function DepartureForm({ departure, onClose }: Props) {
    const isEdit = !!departure;
    const create = useCreateDeparture();
    const update = useUpdateDeparture();

    const [form, setForm] = useState<DepartureCreatePayload>({
        name: departure?.name ?? "",
        destination: departure?.destination ?? "",
        departure_date: departure?.departure_date
            ? departure.departure_date.slice(0, 10)
            : "",
        return_date: departure?.return_date
            ? departure.return_date.slice(0, 10)
            : "",
        departure_city: departure?.departure_city ?? "",
        return_city: departure?.return_city ?? "",
        total_seats: departure?.total_seats ?? 0,
        price_b2b: departure?.price_b2b ?? undefined,
        price_b2c: departure?.price_b2c ?? undefined,
        has_flight: departure?.has_flight ?? true,
        status: departure?.status ?? "active",
        notes: departure?.notes ?? "",
    });

    const set = (k: keyof DepartureCreatePayload, v: any) =>
        setForm((p) => ({ ...p, [k]: v }));

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.name || !form.departure_date) {
            toast.error("Name and Departure Date are required.");
            return;
        }
        try {
            const payload = { ...form };
            if (!payload.return_date) delete payload.return_date;
            if (!payload.destination) delete payload.destination;
            if (!payload.departure_city) delete payload.departure_city;
            if (!payload.return_city) delete payload.return_city;
            if (!payload.notes) delete payload.notes;

            if (isEdit) {
                await update.mutateAsync({ id: departure.id, payload });
                toast.success("Departure updated.");
            } else {
                await create.mutateAsync(payload);
                toast.success("Departure created.");
            }
            onClose();
        } catch {
            toast.error("Something went wrong. Please try again.");
        }
    }

    const pending = create.isPending || update.isPending;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between bg-blue-600 px-5 py-4">
                    <h2 className="text-base font-semibold text-white">
                        {isEdit ? "Edit Departure" : "New Departure"}
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Name *
                            </label>
                            <Input
                                value={form.name}
                                onChange={(e) => set("name", e.target.value)}
                                placeholder="Ex. Delhi Almaty 4 Nights - 29 May"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Destination
                            </label>
                            <Input
                                value={form.destination ?? ""}
                                onChange={(e) => set("destination", e.target.value)}
                                placeholder="e.g. Almaty"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Status
                            </label>
                            <Select value={form.status} onValueChange={(v) => set("status", v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map((s) => (
                                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Departure Date *
                            </label>
                            <Input
                                type="date"
                                value={form.departure_date}
                                onChange={(e) => set("departure_date", e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Return Date
                            </label>
                            <Input
                                type="date"
                                value={form.return_date ?? ""}
                                onChange={(e) => set("return_date", e.target.value)}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Departure City
                            </label>
                            <Input
                                value={form.departure_city ?? ""}
                                onChange={(e) => set("departure_city", e.target.value)}
                                placeholder="e.g. Delhi"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Return City
                            </label>
                            <Input
                                value={form.return_city ?? ""}
                                onChange={(e) => set("return_city", e.target.value)}
                                placeholder="e.g. Delhi"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Total Seats
                            </label>
                            <Input
                                type="number"
                                min={0}
                                value={form.total_seats ?? 0}
                                onChange={(e) => set("total_seats", Number(e.target.value))}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Flight
                            </label>
                            <Select
                                value={form.has_flight ? "yes" : "no"}
                                onValueChange={(v) => set("has_flight", v === "yes")}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="yes">With Flight</SelectItem>
                                    <SelectItem value="no">Without Flight</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                B2B Price (₹)
                            </label>
                            <Input
                                type="number"
                                min={0}
                                placeholder="0.00"
                                value={form.price_b2b ?? ""}
                                onChange={(e) => set("price_b2b", e.target.value ? Number(e.target.value) : undefined)}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                B2C Price (₹)
                            </label>
                            <Input
                                type="number"
                                min={0}
                                placeholder="0.00"
                                value={form.price_b2c ?? ""}
                                onChange={(e) => set("price_b2c", e.target.value ? Number(e.target.value) : undefined)}
                            />
                        </div>

                        <div className="col-span-2 space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Notes
                            </label>
                            <textarea
                                rows={2}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                                value={form.notes ?? ""}
                                onChange={(e) => set("notes", e.target.value)}
                                placeholder="Optional notes..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button
                            type="submit"
                            disabled={pending}
                            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]"
                        >
                            {pending ? "Saving…" : isEdit ? "Save Changes" : "Create"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
