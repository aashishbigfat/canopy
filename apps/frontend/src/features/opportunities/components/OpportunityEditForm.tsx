"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { CalendarIcon, ChevronLeft, Check, ChevronsUpDown, X } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Calendar } from "@/components/ui/calendar";

import { cn } from "@/lib/utils";
import { useUpdateOpportunity, useExperiences } from "../api/useOpportunities";
import { Opportunity } from "../types";
import { normalizeSalesStages, getProbabilityForStageId, StageWithProbability } from "@/features/opportunities/utils/stageConfig";
import { SalesStage } from "@/lib/api/services/opportunities.service";
import { destinationsService, Destination } from "@/lib/api/services/destinations.service";
import { toast } from "sonner";
import { ErrorHandler, ErrorType } from "@/lib/error-handler";

const opportunityFormSchema = z.object({
    name: z.string().min(2, {
        message: "Deal name must be at least 2 characters.",
    }),
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a positive number.").optional().or(z.literal("")),
    sales_stage_id: z.string().min(1, "Sales stage is required."),
    probability: z.string().regex(/^(100|[0-9]{1,2})$/, "Probability must be between 0 and 100.").optional().or(z.literal("")),
    close_date: z.string().optional(),
    travel_date: z.string().optional(),
    experience_id: z.string().optional(),
    no_of_pax: z.string().refine((val) => !val || Number(val) > 0, "Number of pax must be at least 1").optional(),
    no_of_adults: z.string().refine((val) => !val || Number(val) > 0, "Number of adults must be at least 1").optional(),
    no_of_childs: z.string().refine((val) => !val || Number(val) >= 0, "Cannot be negative").optional(),
    no_of_infants: z.string().refine((val) => !val || Number(val) >= 0, "Cannot be negative").optional(),
    no_of_nights: z.string().refine((val) => !val || Number(val) > 0, "Number of nights must be at least 1").optional(),
    destinations: z.string().optional(),
    description: z.string().optional(),
});

type OpportunityFormValues = z.infer<typeof opportunityFormSchema>;

interface OpportunityEditFormProps {
    opportunity: Opportunity;
    stages: SalesStage[] | StageWithProbability[];
}

export function OpportunityEditForm({ opportunity, stages }: OpportunityEditFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const updateOpportunity = useUpdateOpportunity();
    const { data: experiences } = useExperiences();
    const normalizedStages = normalizeSalesStages(stages);

    const [availableDestinations, setAvailableDestinations] = useState<Destination[]>([]);
    const [destinationOpen, setDestinationOpen] = useState(false);
    const [destSearch, setDestSearch] = useState("");

    useEffect(() => {
        destinationsService.getDestinations({ limit: 1000 }).then(res => {
            setAvailableDestinations(res.destinations);
        }).catch(err => console.error("Failed to fetch destinations", err));
    }, []);

    const form = useForm<OpportunityFormValues>({
        resolver: zodResolver(opportunityFormSchema),
        defaultValues: {
            name: opportunity.name || "",
            amount: opportunity.amount?.toString() || "0",
            sales_stage_id: opportunity.sales_stage_id || "",
            probability: opportunity.probability?.toString() || "10",
            close_date: new Date().toISOString().split('T')[0],
            travel_date: opportunity.travel_date || "",
            experience_id: opportunity.experience_id || "",
            no_of_pax: opportunity.no_of_pax?.toString() || "",
            no_of_adults: opportunity.no_of_adults?.toString() || "",
            no_of_childs: opportunity.no_of_childs?.toString() || "0",
            no_of_infants: opportunity.no_of_infants?.toString() || "0",
            no_of_nights: opportunity.no_of_nights?.toString() || "",
            destinations: opportunity.destination_names?.join(", ") || "",
            description: opportunity.description || "",
        },
    });

    const selectedStageId = form.watch("sales_stage_id");

    // Auto-set probability when sales stage changes
    useEffect(() => {
        if (!selectedStageId) return;
        const stageProbability = getProbabilityForStageId(selectedStageId, normalizedStages);
        if (typeof stageProbability === "number") {
            form.setValue("probability", stageProbability.toString());
        }
    }, [selectedStageId, normalizedStages, form]);

    const adults = form.watch("no_of_adults") || "0";
    const childs = form.watch("no_of_childs") || "0";
    const infants = form.watch("no_of_infants") || "0";

    useEffect(() => {
        const total = (Number(adults) || 0) + (Number(childs) || 0) + (Number(infants) || 0);
        if (total > 0) {
             form.setValue("no_of_pax", total.toString());
        }
    }, [adults, childs, infants, form]);

    const destinationsWatch = form.watch("destinations");
    const paxWatch = form.watch("no_of_pax");
    const travelDateWatch = form.watch("travel_date");



    const handleBackendErrors = (error: any) => {
        if (error.type === ErrorType.VALIDATION && error.details?.detail) {
            const details = error.details.detail;
            details.forEach((err: any) => {
                const field = err.loc[err.loc.length - 1];
                form.setError(field as any, {
                    type: "manual",
                    message: err.msg,
                });
            });
            return true;
        }
        return false;
    };

    async function onSubmit(data: OpportunityFormValues) {
        setIsLoading(true);
        try {
            await ErrorHandler.withErrorHandling(async () => {
                try {
                    // Convert string values to numbers for API
                    const payload: any = {
                        name: data.name,
                        sales_stage_id: data.sales_stage_id,
                    };

                    payload.amount = data.amount !== undefined && data.amount !== "" ? Number(data.amount) : 0;
                    if (data.probability) payload.probability = Number(data.probability);
                    if (data.close_date) payload.close_date = data.close_date;
                    if (data.travel_date) payload.travel_date = data.travel_date;
                    if (data.experience_id && data.experience_id !== "none") payload.experience_id = data.experience_id;
                    if (data.no_of_pax) payload.no_of_pax = Number(data.no_of_pax);
                    if (data.no_of_adults) payload.no_of_adults = Number(data.no_of_adults);
                    if (data.no_of_childs) payload.no_of_childs = Number(data.no_of_childs);
                    if (data.no_of_infants) payload.no_of_infants = Number(data.no_of_infants);
                    if (data.no_of_nights) payload.no_of_nights = Number(data.no_of_nights);

                    if (data.destinations) {
                        const names = data.destinations.split(",").map(d => d.trim()).filter(Boolean);
                        const destIds = names.map(name => {
                            const d = availableDestinations.find(x => x.name === name);
                            return d ? d.id : null;
                        }).filter(Boolean);
                        payload.destination_ids = destIds;
                    } else {
                        payload.destination_ids = [];
                    }

                    if (data.description) payload.description = data.description;

                    await updateOpportunity.mutateAsync({
                        id: opportunity.id,
                        data: payload
                    });

                    toast.success("Opportunity updated successfully");
                    router.push(`/opportunities/${opportunity.id}`);
                    router.refresh();
                } catch (error: any) {
                    const mapped = handleBackendErrors(ErrorHandler.parseError(error, "Failed to update opportunity"));
                    if (!mapped) throw error;
                }
            }, "Failed to update opportunity");
        } catch (error) {
            // Error mapped to UI via ErrorHandler
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                    <Link href={`/opportunities/${opportunity.id}`}>
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                </Button>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid gap-6 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Opportunity Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter opportunity name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount (₹)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="5000"
                                            {...field}
                                            onChange={(e) => {
                                                // Only allow digits and decimal point
                                                const val = e.target.value.replace(/[^0-9.]/g, "");
                                                field.onChange(val);
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="sales_stage_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sales Stage *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a stage" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {normalizedStages.map((stage) => (
                                                <SelectItem key={stage.id} value={stage.id}>
                                                    {stage.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="probability"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Probability (%)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="50"
                                            {...field}
                                            readOnly
                                            disabled
                                            className="bg-slate-50 text-slate-500 cursor-not-allowed"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="experience_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Experience</FormLabel>
                                    <FormControl>
                                        <SearchableSelect
                                            options={[
                                                { label: "None", value: "none" },
                                                ...(experiences?.map((exp: any) => ({ label: exp.name, value: exp.id })) || [])
                                            ]}
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            placeholder="Select an experience"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="close_date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Expected Close Date</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    disabled
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(new Date(field.value), "PPP")
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                captionLayout="dropdown"
                                                startMonth={new Date(1900, 0)}
                                                endMonth={new Date(2100, 11)}
                                                selected={field.value ? new Date(field.value) : undefined}
                                                onSelect={(date) => {
                                                    if (!date) return field.onChange(undefined);
                                                    const year = date.getFullYear();
                                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                                    const day = String(date.getDate()).padStart(2, '0');
                                                    field.onChange(`${year}-${month}-${day}`);
                                                }}
                                                disabled={(date) => {
                                                    const today = new Date();
                                                    today.setHours(0, 0, 0, 0);
                                                    const compareDate = new Date(date);
                                                    compareDate.setHours(0, 0, 0, 0);
                                                    return compareDate.getTime() !== today.getTime();
                                                }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="travel_date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Travel Date</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(new Date(field.value), "PPP")
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                captionLayout="dropdown"
                                                startMonth={new Date(1900, 0)}
                                                endMonth={new Date(2100, 11)}
                                                selected={field.value ? new Date(field.value) : undefined}
                                                onSelect={(date) => {
                                                    if (!date) return field.onChange(undefined);
                                                    const year = date.getFullYear();
                                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                                    const day = String(date.getDate()).padStart(2, '0');
                                                    field.onChange(`${year}-${month}-${day}`);
                                                }}
                                                disabled={(date) => {
                                                    const today = new Date();
                                                    today.setHours(0, 0, 0, 0);
                                                    return date < today;
                                                }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="no_of_pax"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Total Pax</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="4" readOnly className="bg-slate-50 cursor-not-allowed" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="no_of_adults"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Number of Adults</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="2" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="no_of_childs"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Number of Childs</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="0" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="no_of_infants"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Number of Infants</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="0" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="no_of_nights"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Number of Nights</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="7" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="destinations"
                            render={({ field }) => (
                                <FormItem className="col-span-full">
                                    <FormLabel>
                                        Destinations
                                    </FormLabel>
                                    <Popover open={destinationOpen} onOpenChange={setDestinationOpen}>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className={cn(
                                                        "min-h-[36px] h-auto w-full justify-between bg-white px-3 py-1",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    <div className="flex flex-wrap gap-1">
                                                        {field.value ? (
                                                            field.value.split(", ").filter(Boolean).map((dest: string) => (
                                                                <Badge
                                                                    key={dest}
                                                                    variant="secondary"
                                                                    className="rounded-sm px-1 font-normal text-xs"
                                                                >
                                                                    {dest}
                                                                    <span
                                                                        className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer inline-flex items-center justify-center p-[2px]"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const current = field.value!.split(", ").filter((d: string) => d !== dest);
                                                                            field.onChange(current.join(", "));
                                                                        }}
                                                                    >
                                                                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                                                    </span>
                                                                </Badge>
                                                            ))
                                                        ) : (
                                                            "Select destinations..."
                                                        )}
                                                    </div>
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-full p-0 md:w-[500px]" align="start">
                                            <Command>
                                                <CommandInput
                                                    placeholder="Search..."
                                                    className="h-9"
                                                    value={destSearch}
                                                    onValueChange={setDestSearch}
                                                />
                                                <CommandList>
                                                    <CommandEmpty>No results.</CommandEmpty>
                                                    <CommandGroup className="max-h-48 overflow-auto">
                                                        {availableDestinations.map((dest) => {
                                                            const current = field.value ? field.value.split(", ") : [];
                                                            const isSelected = current.includes(dest.name);
                                                            return (
                                                                <CommandItem
                                                                    key={dest.id}
                                                                    className="text-sm py-2"
                                                                    onSelect={() => {
                                                                        if (isSelected) {
                                                                            field.onChange(current.filter((d: string) => d !== dest.name).join(", "));
                                                                        } else {
                                                                            field.onChange([...current, dest.name].join(", "));
                                                                        }
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            isSelected ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {dest.name}
                                                                </CommandItem>
                                                            );
                                                        })}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Enter opportunity description..."
                                        className="min-h-[100px]"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="flex gap-4">
                        <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                            {isLoading ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push(`/opportunities/${opportunity.id}`)}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
