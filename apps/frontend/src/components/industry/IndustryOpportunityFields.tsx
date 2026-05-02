"use client";

/**
 * Industry-specific form field sections for Opportunity forms.
 *
 * Each industry gets its own field component that renders the appropriate
 * form fields for the `industry_data` block in the Opportunity context.
 *
 * Usage in OpportunityForm.tsx:
 *   <IndustryOpportunityFields industry={industry} form={form} />
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
import { destinationsService, Destination } from "@/lib/api/services/destinations.service";

interface IndustryOppFieldsProps {
    industry: IndustryType;
    form: any;
}

// ---------------------------------------------------------------------------
// Destination Multi-Select
// Stores comma-separated IDs in the form field, displays names as badges.
// ---------------------------------------------------------------------------
function DestinationMultiSelect({ form, fieldName }: { form: any; fieldName: string }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [loading, setLoading] = useState(false);
    const ctrlRef = useRef<AbortController | null>(null);

    // On mount: pre-fetch so existing IDs immediately show as names (edit mode)
    useEffect(() => {
        // Fetch a larger initial set to increase chance of resolving pre-selected IDs
        destinationsService.getDestinations({ limit: 500 })
            .then(res => {
                setDestinations(prev => {
                    const map = new Map(prev.map(d => [d.id, d]));
                    res.destinations.forEach(d => map.set(d.id, d));
                    return Array.from(map.values());
                });
            })
            .catch(() => {});
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!open) return;
        if (ctrlRef.current) ctrlRef.current.abort();
        const ctrl = new AbortController();
        ctrlRef.current = ctrl;

        const timer = setTimeout(() => {
            setLoading(true);
            destinationsService
                .getDestinations({ search: search || undefined, limit: search ? 50 : 100 }, ctrl.signal)
                .then(res => {
                    setDestinations(prev => {
                        // Merge so already-selected ones are always resolvable by ID
                        const map = new Map(prev.map(d => [d.id, d]));
                        res.destinations.forEach(d => map.set(d.id, d));
                        return Array.from(map.values());
                    });
                })
                .catch(() => {})
                .finally(() => setLoading(false));
        }, search ? 300 : 0);

        return () => clearTimeout(timer);
    }, [search, open]);

    const getValue = (): string[] => {
        const raw = form.getValues(fieldName) || "";
        return raw ? raw.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
    };

    const selectedIds = getValue();

    const toggleId = (id: string) => {
        const current = getValue();
        const next = current.includes(id)
            ? current.filter((i: string) => i !== id)
            : [...current, id];
        form.setValue(fieldName, next.join(","), { shouldValidate: true });
    };

    const removeId = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        form.setValue(fieldName, getValue().filter((i: string) => i !== id).join(","), { shouldValidate: true });
    };

    const getNameById = (id: string) =>
        destinations.find(d => d.id === id)?.name ?? id;

    const filtered = search
        ? destinations.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
        : destinations;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    type="button"
                    className={cn(
                        "w-full justify-between font-normal min-h-[36px] h-auto px-3 py-1 bg-white",
                        selectedIds.length === 0 && "text-muted-foreground"
                    )}
                >
                    <div className="flex flex-wrap gap-1 flex-1 text-left">
                        {selectedIds.length > 0 ? (
                            selectedIds.map(id => (
                                <Badge key={id} variant="secondary" className="rounded-sm font-normal text-xs px-1.5">
                                    {getNameById(id)}
                                    <span className="ml-1 cursor-pointer" onClick={(e) => removeId(id, e)}>
                                        <X className="h-3 w-3" />
                                    </span>
                                </Badge>
                            ))
                        ) : (
                            <span className="text-sm">Search destinations...</span>
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
                        {loading ? (
                            <div className="py-2 px-3 text-xs text-slate-400">Searching...</div>
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
                                            <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                                            <span className="text-sm">{dest.name}</span>
                                            {dest.country_name && (
                                                <span className="ml-auto text-xs text-slate-400">{dest.country_name}</span>
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
// Travel Opportunity Fields
// Uses TOP-LEVEL form field names that match the OpportunityForm schema.
// The submit handler wraps these into `industry_data` before sending to the API.
// ---------------------------------------------------------------------------
function TravelOpportunityFields({ form }: IndustryOppFieldsProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                <Globe className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-700">Travel Requirements</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <FormField control={form.control} name="travel_date" render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Travel Date *</FormLabel>
                        <FormControl><Input type="date" min={new Date().toISOString().split("T")[0]} {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="close_date" render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Close Date</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="no_of_nights" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Number of Nights</FormLabel>
                        <FormControl><Input type="number" min={1} placeholder="7" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="no_of_adults" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Adults</FormLabel>
                        <FormControl><Input type="number" min={1} placeholder="2" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="no_of_childs" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Children</FormLabel>
                        <FormControl><Input type="number" min={0} placeholder="0" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="no_of_infants" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Infants</FormLabel>
                        <FormControl><Input type="number" min={0} placeholder="0" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="no_of_pax" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Total Pax</FormLabel>
                        <FormControl><Input type="number" readOnly disabled className="bg-slate-50 text-slate-500 cursor-not-allowed" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                {/* Destinations — searchable multi-select */}
                <FormField
                    control={form.control}
                    name="destinations"
                    render={() => (
                        <FormItem className="md:col-span-2">
                            <FormLabel>Destinations</FormLabel>
                            <FormControl>
                                <DestinationMultiSelect form={form} fieldName="destinations" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Healthcare Opportunity Fields
// ---------------------------------------------------------------------------
function HealthcareOpportunityFields({ form }: IndustryOppFieldsProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-emerald-100">
                <Stethoscope className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-700">Clinical Details</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <FormField control={form.control} name="industry_data.appointment_date" render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Appointment Date</FormLabel>
                        <FormControl><Input type="datetime-local" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="industry_data.treatment_type" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Treatment Type</FormLabel>
                        <FormControl><Input placeholder="e.g. Surgery, Physiotherapy" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="industry_data.estimated_treatment_cost" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Estimated Treatment Cost</FormLabel>
                        <FormControl><Input type="number" min={0} step="0.01" placeholder="5000" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="industry_data.insurance_authorization" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Insurance Pre-Auth #</FormLabel>
                        <FormControl><Input placeholder="Authorization number" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="industry_data.diagnosis_codes" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                        <FormLabel>Diagnosis Codes (ICD-10)</FormLabel>
                        <FormControl><Input placeholder="Comma separated, e.g. J45.0, E11.9" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value)} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Education Opportunity Fields
// ---------------------------------------------------------------------------
function EducationOpportunityFields({ form }: IndustryOppFieldsProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-violet-100">
                <GraduationCap className="h-4 w-4 text-violet-600" />
                <h3 className="text-sm font-semibold text-slate-700">Academic Details</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <FormField control={form.control} name="industry_data.application_number" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Application Number</FormLabel>
                        <FormControl><Input placeholder="Auto-generated" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="industry_data.admission_status" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Admission Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                            <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="inquiry">Inquiry</SelectItem>
                                <SelectItem value="applied">Applied</SelectItem>
                                <SelectItem value="docs_pending">Documents Pending</SelectItem>
                                <SelectItem value="under_review">Under Review</SelectItem>
                                <SelectItem value="interview">Interview</SelectItem>
                                <SelectItem value="accepted">Accepted</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                                <SelectItem value="enrolled">Enrolled</SelectItem>
                                <SelectItem value="withdrawn">Withdrawn</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="industry_data.interview_date" render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Interview Date</FormLabel>
                        <FormControl><Input type="datetime-local" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="industry_data.tuition_fee" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tuition Fee</FormLabel>
                        <FormControl><Input type="number" min={0} step="0.01" placeholder="15000" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="industry_data.scholarship_amount" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Scholarship Amount</FormLabel>
                        <FormControl><Input type="number" min={0} step="0.01" placeholder="0" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="industry_data.documents_submitted" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Documents Submitted</FormLabel>
                        <FormControl><Input placeholder="Comma separated" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value)} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Manufacturing Opportunity Fields
// ---------------------------------------------------------------------------
function ManufacturingOpportunityFields({ form }: IndustryOppFieldsProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-orange-100">
                <Factory className="h-4 w-4 text-orange-600" />
                <h3 className="text-sm font-semibold text-slate-700">Production Requirements</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <FormField control={form.control} name="industry_data.quantity_ordered" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Quantity Ordered</FormLabel>
                        <FormControl><Input type="number" min={1} placeholder="1000" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="industry_data.unit_of_measure" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Unit of Measure</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                            <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select UOM" /></SelectTrigger>
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
                <FormField control={form.control} name="industry_data.planned_delivery_date" render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Planned Delivery Date</FormLabel>
                        <FormControl><Input type="datetime-local" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="industry_data.quality_standard" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Quality Standard</FormLabel>
                        <FormControl><Input placeholder="e.g. ISO 9001, CE" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="industry_data.plant_location" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Plant Location</FormLabel>
                        <FormControl><Input placeholder="Factory / Plant" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="industry_data.special_requirements" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                        <FormLabel>Special Requirements</FormLabel>
                        <FormControl><Textarea placeholder="Any special manufacturing requirements..." className="min-h-[60px]" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
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
 * tenant's industry type for Opportunity forms.
 */
export function IndustryOpportunityFields(props: IndustryOppFieldsProps) {
    switch (props.industry) {
        case "travel":
            return <TravelOpportunityFields {...props} />;
        case "healthcare":
            return <HealthcareOpportunityFields {...props} />;
        case "education":
            return <EducationOpportunityFields {...props} />;
        case "manufacturing":
            return <ManufacturingOpportunityFields {...props} />;
        default:
            return null;
    }
}
