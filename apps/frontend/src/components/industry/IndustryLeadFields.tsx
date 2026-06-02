"use client";

/**
 * Industry-specific form field sections for Lead forms.
 *
 * Each industry gets its own field component that renders the appropriate
 * form fields for the `industry_data` block.
 *
 * Usage in LeadForm.tsx:
 *   <IndustryLeadFields industry={industry} form={form} />
 */

import { useState, useRef, useEffect } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Globe,
    Stethoscope,
    GraduationCap,
    Factory,
} from "lucide-react";
import type { IndustryType } from "@/lib/industry-labels";
import { INDUSTRY_LABELS } from "@/lib/industry-labels";
import { destinationsService, Destination } from "@/lib/api/services/destinations.service";

interface IndustryFieldsProps {
    industry: IndustryType;
    form: any;
    // Optional: extra props for destination search etc.
    availableDestinations?: Destination[];
    handleDestinationSearch?: (q: string, signal?: AbortSignal) => void;
    loadingDestinations?: boolean;
}

// ---------------------------------------------------------------------------
// Destination Multi-Select — shared by TravelLeadFields
// Stores comma-separated IDs in the form field, displays names as badges.
// ---------------------------------------------------------------------------
function DestinationMultiSelect({
    form,
    fieldName,
    availableDestinations = [],
    compact = false,
}: {
    form: any;
    fieldName: string;
    availableDestinations: Destination[];
    compact?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [localDestinations, setLocalDestinations] = useState<Destination[]>(availableDestinations);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const searchRef = useRef<AbortController | null>(null);

    // Merge prop destinations with locally fetched ones (avoid duplicates)
    useEffect(() => {
        setLocalDestinations(prev => {
            const map = new Map(prev.map(d => [d.id, d]));
            availableDestinations.forEach(d => map.set(d.id, d));
            return Array.from(map.values());
        });
    }, [availableDestinations]);

    // On mount: pre-fetch destinations so that existing IDs immediately resolve to names
    useEffect(() => {
        destinationsService.getDestinations({ limit: 100 })
            .then(res => {
                setLocalDestinations(prev => {
                    const map = new Map(prev.map(d => [d.id, d]));
                    res.destinations.forEach(d => map.set(d.id, d));
                    return Array.from(map.values());
                });
            })
            .catch(() => {});
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Search destinations via API as user types
    useEffect(() => {
        if (!open) return;
        if (searchRef.current) searchRef.current.abort();
        const ctrl = new AbortController();
        searchRef.current = ctrl;

        if (!search) {
            // Load initial list if empty
            setLoadingSearch(true);
            destinationsService.getDestinations({ limit: 100 }, ctrl.signal)
                .then(res => {
                    setLocalDestinations(prev => {
                        const map = new Map(prev.map(d => [d.id, d]));
                        res.destinations.forEach(d => map.set(d.id, d));
                        return Array.from(map.values());
                    });
                })
                .catch(() => {})
                .finally(() => setLoadingSearch(false));
            return;
        }

        const timer = setTimeout(() => {
            setLoadingSearch(true);
            destinationsService.getDestinations({ search, limit: 50 }, ctrl.signal)
                .then(res => {
                    setLocalDestinations(prev => {
                        const map = new Map(prev.map(d => [d.id, d]));
                        res.destinations.forEach(d => map.set(d.id, d));
                        return Array.from(map.values());
                    });
                })
                .catch(() => {})
                .finally(() => setLoadingSearch(false));
        }, 300);
        return () => clearTimeout(timer);
    }, [search, open]);

    // Parse current value: "id1,id2,id3" -> string[]
    const getValue = () => {
        const raw = form.getValues(fieldName) || "";
        return raw ? raw.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
    };

    const selectedIds: string[] = getValue();

    const toggleId = (id: string) => {
        const current = getValue();
        const next = current.includes(id)
            ? current.filter((i: string) => i !== id)
            : [...current, id];
        form.setValue(fieldName, next.join(","), { shouldValidate: true });
    };

    const removeId = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const current = getValue();
        form.setValue(fieldName, current.filter((i: string) => i !== id).join(","), { shouldValidate: true });
    };

    const getNameById = (id: string) =>
        localDestinations.find(d => d.id === id)?.name ?? id;

    const filtered = search
        ? localDestinations.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
        : localDestinations;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    type="button"
                    className={cn(
                        "w-full justify-between font-normal",
                        compact ? "min-h-[32px] h-auto bg-background px-2 py-1 text-xs" : "min-h-[36px] h-auto bg-background px-3 py-1",
                        selectedIds.length === 0 && "text-muted-foreground"
                    )}
                >
                    <div className="flex flex-wrap gap-1 flex-1 text-left">
                        {selectedIds.length > 0 ? (
                            selectedIds.map(id => (
                                <Badge
                                    key={id}
                                    variant="secondary"
                                    className={cn("rounded-sm font-normal", compact ? "text-[10px] px-1" : "text-xs px-1.5")}
                                >
                                    {getNameById(id)}
                                    <span
                                        className="ml-1 cursor-pointer"
                                        onClick={(e) => removeId(id, e)}
                                    >
                                        <X className={compact ? "h-2 w-2" : "h-3 w-3"} />
                                    </span>
                                </Badge>
                            ))
                        ) : (
                            <span className={compact ? "text-[10px]" : "text-sm"}>Search destinations...</span>
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[320px] p-0"
                align="start"
                onPointerDownOutside={(e) => e.stopPropagation()}
            >
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Search destinations..."
                        value={search}
                        onValueChange={setSearch}
                        className="h-9"
                    />
                    <CommandList>
                        {loadingSearch ? (
                            <div className="px-3 py-2 text-xs text-muted-foreground">Searching...</div>
                        ) : filtered.length === 0 ? (
                            <CommandEmpty>No destinations found.</CommandEmpty>
                        ) : (
                            <CommandGroup>
                                {filtered.map(dest => {
                                    const isSelected = selectedIds.includes(dest.id);
                                    return (
                                        <CommandItem
                                            key={dest.id}
                                            value={dest.id}
                                            onSelect={() => {
                                                toggleId(dest.id);
                                                setSearch("");
                                            }}
                                            className="cursor-pointer"
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    isSelected ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <span className="text-sm">{dest.name}</span>
                                            {dest.country_name && (
                                                <span className="ml-auto text-xs text-muted-foreground">{dest.country_name}</span>
                                            )}
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

// ---------------------------------------------------------------------------
// Travel Lead Fields
// Uses TOP-LEVEL form field names that match the LeadForm's leadFormSchema.
// The submit handler wraps these into `industry_data` before sending to the API.
// ---------------------------------------------------------------------------
function TravelLeadFields({ form, availableDestinations = [], handleDestinationSearch, loadingDestinations }: IndustryFieldsProps) {
    return (
        <div>
            <div className="mb-3 flex items-center gap-2 border-b border-border pb-2">
                <Globe className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Travel Requirements</h3>
            </div>
            <div className="grid gap-3 grid-cols-2">
                <FormField control={form.control as any} name="travel_date" render={({ field }) => (
                    <FormItem className="col-span-2">
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Travel Date <span className="text-red-500">*</span></FormLabel>
                        <FormControl><Input type="date" min={new Date().toISOString().split("T")[0]} className="h-8 bg-slate-900 text-xs" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                {/* Destinations — searchable multi-select */}
                <FormField
                    control={form.control as any}
                    name="destinations"
                    render={() => (
                        <FormItem className="col-span-2">
                            <FormLabel className="text-[10px] font-bold uppercase text-slate-400">
                                Destinations <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                                <DestinationMultiSelect
                                    form={form}
                                    fieldName="destinations"
                                    availableDestinations={availableDestinations}
                                    compact
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField control={form.control as any} name="no_of_nights" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Nights</FormLabel>
                        <FormControl><Input type="number" placeholder="4" min={1} className="h-8 bg-slate-900 text-xs" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control as any} name="no_of_adults" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Adults</FormLabel>
                        <FormControl><Input type="number" placeholder="2" min={1} className="h-8 bg-slate-900 text-xs" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control as any} name="no_of_childs" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Children</FormLabel>
                        <FormControl><Input type="number" placeholder="0" min={0} className="h-8 bg-slate-900 text-xs" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control as any} name="no_of_infants" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Infants</FormLabel>
                        <FormControl><Input type="number" placeholder="0" min={0} className="h-8 bg-slate-900 text-xs" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control as any} name="no_of_pax" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs font-bold uppercase text-foreground">Total Pax</FormLabel>
                        <FormControl><Input type="number" min="0" className="h-8 text-sm font-semibold text-foreground" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control as any} name="is_fixed" render={({ field }) => (
                    <FormItem className="col-span-2 flex h-9 flex-row items-center space-x-2 space-y-0 rounded-md border border-border bg-muted/40 px-2.5">
                        <FormControl><Input type="checkbox" className="h-3.5 w-3.5 accent-primary" checked={field.value} onChange={field.onChange} /></FormControl>
                        <FormLabel className="mb-0 cursor-pointer pb-0 text-xs font-medium text-foreground">Fixed Departure?</FormLabel>
                    </FormItem>
                )} />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Healthcare Lead Fields
// ---------------------------------------------------------------------------
function HealthcareLeadFields({ form }: IndustryFieldsProps) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-emerald-500/40">
                <Stethoscope className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-200">Clinical Details</h3>
            </div>
            <div className="grid gap-3 grid-cols-2">
                <FormField control={form.control as any} name="industry_data.chief_complaint" render={({ field }) => (
                    <FormItem className="col-span-2">
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Chief Complaint</FormLabel>
                        <FormControl><Textarea placeholder="Primary reason for visit..." className="bg-slate-900 text-xs min-h-[60px]" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control as any} name="industry_data.urgency" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Urgency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                            <FormControl>
                                <SelectTrigger className="h-8 bg-slate-900 text-xs">
                                    <SelectValue placeholder="Select urgency" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="routine">Routine</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                                <SelectItem value="emergent">Emergent</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control as any} name="industry_data.patient_type" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Patient Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "new"}>
                            <FormControl>
                                <SelectTrigger className="h-8 bg-slate-900 text-xs">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="new">New Patient</SelectItem>
                                <SelectItem value="returning">Returning Patient</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control as any} name="industry_data.referral_source" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Referral Source</FormLabel>
                        <FormControl><Input placeholder="e.g. Doctor, Insurance Portal" className="h-8 bg-slate-900 text-xs" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control as any} name="industry_data.insurance_provider" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Insurance Provider</FormLabel>
                        <FormControl><Input placeholder="e.g. Aetna, UHC" className="h-8 bg-slate-900 text-xs" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control as any} name="industry_data.insurance_policy_number" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Policy Number</FormLabel>
                        <FormControl><Input placeholder="Policy #" className="h-8 bg-slate-900 text-xs" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control as any} name="industry_data.preferred_appointment_date" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Preferred Appointment Date</FormLabel>
                        <FormControl><Input type="date" className="h-8 bg-slate-900 text-xs" {...field} value={field.value ?? ""} min={new Date().toISOString().split('T')[0]} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Education Lead Fields
// ---------------------------------------------------------------------------
function EducationLeadFields({ form }: IndustryFieldsProps) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-violet-500/40">
                <GraduationCap className="h-4 w-4 text-violet-600" />
                <h3 className="text-sm font-semibold text-slate-200">Academic Details</h3>
            </div>
            <div className="grid gap-3 grid-cols-2">
                <FormField control={form.control as any} name="industry_data.highest_qualification" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Highest Qualification</FormLabel>
                        <FormControl><Input placeholder="e.g. Bachelors" className="h-8 bg-slate-900 text-xs" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control as any} name="industry_data.gpa" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">GPA (0–10)</FormLabel>
                        <FormControl><Input type="number" step="0.1" min={0} max={10} placeholder="8.5" className="h-8 bg-slate-900 text-xs" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control as any} name="industry_data.preferred_start_date" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Preferred Start Date</FormLabel>
                        <FormControl><Input type="date" className="h-8 bg-slate-900 text-xs" {...field} value={field.value ?? ""} min={new Date().toISOString().split('T')[0]} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control as any} name="industry_data.nationality" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Nationality</FormLabel>
                        <FormControl><Input placeholder="e.g. Indian" className="h-8 bg-slate-900 text-xs" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control as any} name="industry_data.sponsorship_type" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Sponsorship Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                            <FormControl>
                                <SelectTrigger className="h-8 bg-slate-900 text-xs">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="self">Self-Funded</SelectItem>
                                <SelectItem value="employer">Employer</SelectItem>
                                <SelectItem value="government">Government</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control as any} name="industry_data.scholarship_interest" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-2 bg-slate-800 h-8">
                        <FormControl><Input type="checkbox" className="h-3 w-3" checked={!!field.value} onChange={field.onChange} /></FormControl>
                        <FormLabel className="text-xs font-medium cursor-pointer mb-0 pb-0">Interested in Scholarship?</FormLabel>
                    </FormItem>
                )} />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Manufacturing Lead Fields
// ---------------------------------------------------------------------------
function ManufacturingLeadFields({ form }: IndustryFieldsProps) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-orange-500/40">
                <Factory className="h-4 w-4 text-orange-600" />
                <h3 className="text-sm font-semibold text-slate-200">Production Requirements</h3>
            </div>
            <div className="grid gap-3 grid-cols-2">
                <FormField control={form.control as any} name="industry_data.rfq_number" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">RFQ Number</FormLabel>
                        <FormControl><Input placeholder="RFQ-2026-001" className="h-8 bg-slate-900 text-xs" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control as any} name="industry_data.product_category" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Product Category</FormLabel>
                        <FormControl><Input placeholder="e.g. Electronics, Textiles" className="h-8 bg-slate-900 text-xs" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control as any} name="industry_data.estimated_quantity" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Estimated Quantity</FormLabel>
                        <FormControl><Input type="number" min={1} placeholder="1000" className="h-8 bg-slate-900 text-xs" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control as any} name="industry_data.unit_of_measure" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Unit of Measure</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                            <FormControl>
                                <SelectTrigger className="h-8 bg-slate-900 text-xs">
                                    <SelectValue placeholder="Select UOM" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="piece">Piece</SelectItem>
                                <SelectItem value="kg">Kg</SelectItem>
                                <SelectItem value="liter">Liter</SelectItem>
                                <SelectItem value="meter">Meter</SelectItem>
                                <SelectItem value="box">Box</SelectItem>
                                <SelectItem value="ton">Ton</SelectItem>
                                <SelectItem value="set">Set</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control as any} name="industry_data.target_delivery_date" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Target Delivery Date</FormLabel>
                        <FormControl><Input type="date" className="h-8 bg-slate-900 text-xs" {...field} value={field.value ?? ""} min={new Date().toISOString().split('T')[0]} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control as any} name="industry_data.budget_range" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Budget Range</FormLabel>
                        <FormControl><Input placeholder="e.g. 10K–50K USD" className="h-8 bg-slate-900 text-xs" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control as any} name="industry_data.technical_specs" render={({ field }) => (
                    <FormItem className="col-span-2">
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Technical Specifications</FormLabel>
                        <FormControl><Textarea placeholder="Detailed specs..." className="bg-slate-900 text-xs min-h-[60px]" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control as any} name="industry_data.sample_required" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-2 bg-slate-800 h-8 col-span-2">
                        <FormControl><Input type="checkbox" className="h-3 w-3" checked={!!field.value} onChange={field.onChange} /></FormControl>
                        <FormLabel className="text-xs font-medium cursor-pointer mb-0 pb-0">Sample Required Before PO?</FormLabel>
                    </FormItem>
                )} />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Dispatcher Component
// ---------------------------------------------------------------------------

/**
 * Renders the correct industry-specific form fields section based on the
 * tenant's industry type.
 *
 * Drop this into any Lead form to get the right fields:
 *   <IndustryLeadFields industry="healthcare" form={form} />
 */
export function IndustryLeadFields(props: IndustryFieldsProps) {
    let content: JSX.Element | null = null;

    switch (props.industry) {
        case "travel":
            content = <TravelLeadFields {...props} />;
            break;
        case "healthcare":
            content = <HealthcareLeadFields {...props} />;
            break;
        case "education":
            content = <EducationLeadFields {...props} />;
            break;
        case "manufacturing":
            content = <ManufacturingLeadFields {...props} />;
            break;
        default:
            content = null;
    }

    return (
        <div className="[&_[data-slot=form-label]]:!text-foreground/85 [&_input]:text-foreground [&_textarea]:text-foreground [&_[data-slot=select-trigger]]:text-foreground [&_.text-slate-200]:!text-foreground [&_.text-slate-400]:!text-foreground/80 [&_.bg-white]:!bg-background">
            {content}
        </div>
    );
}
