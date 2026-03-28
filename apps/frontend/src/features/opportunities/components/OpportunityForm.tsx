"use client";

import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { CalendarIcon, Check, ChevronsUpDown, X } from "lucide-react";
import { format } from "date-fns";

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
import { useCreateOpportunity, useSalesStages, useExperiences } from "../api/useOpportunities";
import { normalizeSalesStages, getProbabilityForStageId, CLOSE_LOST_REASONS } from "@/features/opportunities/utils/stageConfig";
import { destinationsService, Destination } from "@/lib/api/services/destinations.service";
import { accountsService } from "@/lib/api/services/accounts.service";
import { contactsService } from "@/lib/api/services/contacts.service";
import { Contact } from "@/features/contacts/types";
import { toast } from "sonner";
import { ErrorHandler, ErrorType } from "@/lib/error-handler";

// Travel inclusion options
const INCLUSION_OPTIONS = [
    "Air Ticket", "Visa", "Accommodation", "Site Seeing",
    "Airport Transfer", "Transport", "Package", "Land Package",
    "Meal", "Courier Charges", "Taxes", "Insurance", "Departure",
];

const opportunityFormSchema = z.object({
    name: z.string().min(2, {
        message: "Deal name must be at least 2 characters.",
    }),
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a positive number.").optional().or(z.literal("")),
    sales_stage_id: z.string().min(1, "Sales stage is required."),
    probability: z.string().regex(/^(100|[0-9]{1,2})$/, "Probability must be between 0 and 100.").optional().or(z.literal("")),
    close_date: z.string().optional(),
    travel_date: z.string().min(1, "Travel date is required."),
    experience_id: z.string().optional(),
    no_of_pax: z.string().refine((val) => !val || Number(val) > 0, "Number of pax must be at least 1").optional(),
    no_of_adults: z.string().refine((val) => !val || Number(val) > 0, "Number of adults must be at least 1").optional(),
    no_of_childs: z.string().refine((val) => !val || Number(val) >= 0, "Cannot be negative").optional(),
    no_of_infants: z.string().refine((val) => !val || Number(val) >= 0, "Cannot be negative").optional(),
    no_of_nights: z.string().refine((val) => !val || Number(val) > 0, "Number of nights must be at least 1").optional(),
    destinations: z.string().optional(),
    description: z.string().optional(),
    account_id: z.string().optional(),
    contact_id: z.string().optional(),
    inclusions: z.array(z.string()).default([]),
    close_lost_reason: z.string().optional(),
});

type OpportunityFormValues = z.infer<typeof opportunityFormSchema>;

interface OpportunityFormProps {
    initialAccountId?: string;
    initialContactId?: string;
    /** Called after successful create instead of router.push */
    onSuccess?: () => void;
    /** Called when cancel is clicked instead of router.push */
    onCancel?: () => void;
    /** When true, renders compact layout for drawer panels */
    isDrawer?: boolean;
}

export function OpportunityForm({ initialAccountId, initialContactId, onSuccess, onCancel, isDrawer = false }: OpportunityFormProps = {}) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const createOpportunity = useCreateOpportunity();
    const { data: stages } = useSalesStages();
    const { data: experiences } = useExperiences();

    const normalizedStages = normalizeSalesStages(stages);

    const [availableDestinations, setAvailableDestinations] = useState<Destination[]>([]);
    const [destinationOpen, setDestinationOpen] = useState(false);
    const [destSearch, setDestSearch] = useState("");
    const [inclusionOpen, setInclusionOpen] = useState(false);
    const [inclusionSearch, setInclusionSearch] = useState("");

    // Account & Contact state
    const [accountOptions, setAccountOptions] = useState<{ id: string; name: string }[]>([]);
    const [accountContacts, setAccountContacts] = useState<Contact[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState(initialAccountId || "");
    const [isPersonAccount, setIsPersonAccount] = useState(false);

    useEffect(() => {
        destinationsService.getDestinations({ limit: 1000 }).then(res => {
            setAvailableDestinations(res.destinations);
        }).catch(err => console.error("Failed to fetch destinations", err));
    }, []);

    // Search accounts handler
    const handleAccountSearch = useCallback(async (query: string, signal?: AbortSignal) => {
        if (!query || query.length < 1) {
            setAccountOptions([]);
            return;
        }
        try {
            setLoadingAccounts(true);
            const results = await accountsService.searchAccountAutocomplete(query, signal);
            setAccountOptions(results as any);
        } catch (error) {
            if (!axios.isCancel(error)) {
                console.error("Account search error", error);
            }
        } finally {
            setLoadingAccounts(false);
        }
    }, []);

    // Load contacts when account changes
    useEffect(() => {
        if (!selectedAccountId) {
            setAccountContacts([]);
            return;
        }
        setLoadingContacts(true);
        contactsService.getContactsByAccount(selectedAccountId)
            .then(contacts => {
                setAccountContacts(contacts);
            })
            .catch(err => console.error("Failed to fetch contacts", err))
            .finally(() => setLoadingContacts(false));
    }, [selectedAccountId]);

    const form = useForm<OpportunityFormValues>({
        resolver: zodResolver(opportunityFormSchema) as any,
        defaultValues: {
            name: "",
            amount: "0",
            sales_stage_id: "",
            probability: "10",
            close_date: new Date().toISOString().split('T')[0],
            travel_date: "",
            experience_id: "",
            no_of_pax: "",
            no_of_adults: "",
            no_of_childs: "",
            no_of_infants: "",
            no_of_nights: "",
            destinations: "",
            description: "",
            account_id: initialAccountId || "",
            contact_id: initialContactId || "",
            inclusions: [],
            close_lost_reason: "",
        } as OpportunityFormValues,
    });

    // Pre-select account (and optionally contact) when initial IDs are provided
    useEffect(() => {
        if (initialAccountId) {
            accountsService.getAccount(initialAccountId).then(acc => {
                // Put account into options so SearchableSelect can display it
                setAccountOptions([{ id: acc.id, name: acc.name, is_person_account: acc.is_person_account } as any]);
                // Set form value
                form.setValue("account_id", acc.id);
                setSelectedAccountId(acc.id);
                setIsPersonAccount(acc.is_person_account);
            }).catch(() => {});
        }
    }, [initialAccountId, form]);

    // Pre-select contact: directly fetch if initialContactId is provided
    useEffect(() => {
        if (!initialContactId) return;
        // First check if it's already in the loaded contacts list
        const existing = accountContacts.find(c => c.id === initialContactId);
        if (existing) {
            form.setValue("contact_id", initialContactId);
            return;
        }
        // Otherwise fetch it directly and inject it
        contactsService.getContact(initialContactId).then(contact => {
            setAccountContacts(prev => {
                // avoid duplicates
                if (prev.some(c => c.id === contact.id)) return prev;
                return [...prev, contact];
            });
            form.setValue("contact_id", initialContactId);
        }).catch(() => {
            // silently ignore — contact_id just won't be pre-selected
        });
    }, [initialContactId, accountContacts.length, form]);

    const selectedStageId = form.watch("sales_stage_id");
    // Check if the selected stage is a 'Close Lost' stage
    const selectedStageObj = normalizedStages.find(s => s.id === selectedStageId) as any;
    const isCloseLostStage = !!(selectedStageObj?.is_lost);

    // Auto-set probability when sales stage changes
    useEffect(() => {
        if (!selectedStageId) return;
        const stageProbability = getProbabilityForStageId(selectedStageId, normalizedStages);
        if (typeof stageProbability === "number") {
            form.setValue("probability", stageProbability.toString());
        }
    }, [selectedStageId, normalizedStages, form]);

    // Set default sales stage when stages are loaded
    useEffect(() => {
        if (normalizedStages.length > 0 && !form.getValues("sales_stage_id")) {
            const defaultStage = normalizedStages.find(s => s.is_default) || normalizedStages[0];
            if (defaultStage) {
                form.setValue("sales_stage_id", defaultStage.id);
                form.setValue("probability", (defaultStage.probability ?? 10).toString());
            }
        }
    }, [normalizedStages, form]);

    // Set default experience to Luxury when experiences are loaded
    useEffect(() => {
        if (experiences && experiences.length > 0 && !form.getValues("experience_id")) {
            const luxuryExp = experiences.find((exp: any) => exp.name.toLowerCase() === "luxury");
            if (luxuryExp) {
                form.setValue("experience_id", luxuryExp.id);
            }
        }
    }, [experiences, form]);

    // Sync Pax with Adults, Children, and Infants
    const watchedAdults = form.watch("no_of_adults");
    const watchedChildren = form.watch("no_of_childs");
    const watchedInfants = form.watch("no_of_infants");

    useEffect(() => {
        if (watchedAdults !== undefined || watchedChildren !== undefined || watchedInfants !== undefined) {
            const adults = parseInt(watchedAdults || "0") || 0;
            const children = parseInt(watchedChildren || "0") || 0;
            const infants = parseInt(watchedInfants || "0") || 0;
            
            const total = adults + children + infants;
            if (total > 0) {
                 form.setValue("no_of_pax", total.toString());
            } else if (watchedAdults === "" && watchedChildren === "" && watchedInfants === "") {
                 form.setValue("no_of_pax", "");
            }
        }
    }, [watchedAdults, watchedChildren, watchedInfants, form]);

    const destinationsWatch = form.watch("destinations");
    const paxWatch = form.watch("no_of_pax");
    const travelDateWatch = form.watch("travel_date");
    const watchedAccountId = form.watch("account_id");


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
        const startTime = Date.now();
        let isSuccess = false;
        try {
            await ErrorHandler.withErrorHandling(async () => {
                try {
                    const payload: any = {
                        name: data.name,
                        sales_stage_id: data.sales_stage_id,
                    };

                    if (data.amount !== undefined && data.amount !== "") payload.amount = Number(data.amount);
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
                        if (destIds.length > 0) payload.destination_ids = destIds;
                    }

                    if (data.description) payload.description = data.description;
                    if (data.account_id) payload.account_id = data.account_id;
                    if (data.contact_id) payload.contact_id = data.contact_id;
                    if (data.inclusions && data.inclusions.length > 0) payload.inclusions = data.inclusions;
                    if (data.close_lost_reason) payload.close_lost_reason = data.close_lost_reason;

                    const result = await createOpportunity.mutateAsync(payload);
                    toast.success("Opportunity created successfully");
                    
                    isSuccess = true;
                    const elapsedTime = Date.now() - startTime;
                    if (elapsedTime < 2500) {
                        await new Promise(r => setTimeout(r, 2500 - elapsedTime));
                    }

                    if (onSuccess) {
                        onSuccess();
                    } else {
                        router.push(`/opportunities/${result.id}`);
                        router.refresh();
                    }
                } catch (error: any) {
                    const mapped = handleBackendErrors(ErrorHandler.parseError(error, "Failed to create opportunity"));
                    if (!mapped) throw error;
                }
            }, "Failed to create opportunity");
        } catch (error) {
            // Error is already handled by ErrorHandler and mapped to UI
        } finally {
            if (!isSuccess) {
                const elapsedTime = Date.now() - startTime;
                if (elapsedTime < 2500) {
                    await new Promise(r => setTimeout(r, 2500 - elapsedTime));
                }
                setIsLoading(false);
            }
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {selectedAccountId && (
                    <div className="flex items-center gap-2 mb-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Type:</span>
                        <Badge variant="outline" className={cn(
                            "px-2 py-0.5 font-bold text-[10px] transition-colors",
                            isPersonAccount 
                                ? "bg-orange-100 text-orange-700 border-orange-200" 
                                : "bg-blue-100 text-blue-700 border-blue-200"
                        )}>
                            {isPersonAccount ? "PERSON ACCOUNT" : "ACCOUNT"}
                        </Badge>
                    </div>
                )}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Opportunity Name — first field */}
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Opportunity Name *</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter opportunity name" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Account Field */}
                    <FormField
                        control={form.control}
                        name="account_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Account</FormLabel>
                                <FormControl>
                                    <SearchableSelect
                                        options={accountOptions.map(a => ({ label: a.name, value: a.id }))}
                                        value={field.value}
                                        onValueChange={(val) => {
                                            field.onChange(val);
                                            setSelectedAccountId(val);
                                            const selectedOpt = accountOptions.find((a: any) => a.id === val);
                                            const isPerson = selectedOpt ? (selectedOpt as any).is_person_account : false;
                                            setIsPersonAccount(isPerson);
                                            // Reset contact when account changes
                                            form.setValue("contact_id", "");
                                        }}
                                        onSearch={handleAccountSearch}
                                        isLoading={loadingAccounts}
                                        placeholder="Search accounts..."
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Contact Field - Hidden if Person Account */}
                    {!isPersonAccount && (
                        <FormField
                            control={form.control}
                            name="contact_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contact</FormLabel>
                                    <FormControl>
                                        <SearchableSelect
                                            options={accountContacts.map(c => ({ label: c.full_name || `${c.first_name} ${c.last_name}`, value: c.id }))}
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            placeholder={loadingContacts ? "Loading contacts..." : (selectedAccountId ? "Select contact" : "Select an account first")}
                                            disabled={!selectedAccountId || loadingContacts}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
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
                                                    "w-full pl-3 text-left font-normal cursor-not-allowed opacity-70",
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
                        name="travel_date"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Travel Date *</FormLabel>
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
                                <FormLabel>Number of Pax</FormLabel>
                                <FormControl>
                                    <Input type="number" min="1" placeholder="4" {...field} />
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
                                    <Input type="number" min="1" placeholder="2" {...field} />
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
                                <FormLabel>Number of Children</FormLabel>
                                <FormControl>
                                    <Input type="number" min="0" placeholder="0" {...field} />
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
                                    <Input type="number" min="0" placeholder="0" {...field} />
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
                                    <Input type="number" min="1" placeholder="7" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Inclusions Multi-Select */}
                <FormField
                    control={form.control as any}
                    name="inclusions"
                    render={({ field }) => {
                        const selected: string[] = field.value || [];
                        return (
                            <FormItem className="col-span-full">
                                <FormLabel>Inclusion(s)</FormLabel>
                                <Popover open={inclusionOpen} onOpenChange={setInclusionOpen}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn(
                                                    "min-h-[36px] h-auto w-full justify-between bg-white px-3 py-1",
                                                    selected.length === 0 && "text-muted-foreground"
                                                )}
                                            >
                                                <div className="flex flex-wrap gap-1">
                                                    {selected.length > 0 ? (
                                                        selected.map((item) => (
                                                            <Badge
                                                                key={item}
                                                                variant="secondary"
                                                                className="rounded-sm px-1 font-normal text-[10px]"
                                                            >
                                                                {item}
                                                                <span
                                                                    className="ml-1 cursor-pointer"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        field.onChange(selected.filter((i) => i !== item));
                                                                    }}
                                                                >
                                                                    <X className="h-2 w-2 text-muted-foreground hover:text-foreground" />
                                                                </span>
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        "Select Inclusions"
                                                    )}
                                                </div>
                                                <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0 md:w-[500px]" align="start" onPointerDownOutside={(e) => e.stopPropagation()}>
                                        <Command>
                                            <CommandInput
                                                placeholder="Search inclusions..."
                                                className="h-8"
                                                value={inclusionSearch}
                                                onValueChange={setInclusionSearch}
                                            />
                                            <CommandList>
                                                <CommandEmpty>No inclusions found.</CommandEmpty>
                                                <CommandGroup>
                                                    {INCLUSION_OPTIONS
                                                        .filter((opt) => opt.toLowerCase().includes(inclusionSearch.toLowerCase()))
                                                        .map((opt) => {
                                                            const isSelected = selected.includes(opt);
                                                            return (
                                                                <CommandItem
                                                                    key={opt}
                                                                    value={opt}
                                                                    onSelect={() => {
                                                                        if (isSelected) {
                                                                            field.onChange(selected.filter((i) => i !== opt));
                                                                        } else {
                                                                            field.onChange([...selected, opt]);
                                                                        }
                                                                        setInclusionSearch("");
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            isSelected ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {opt}
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
                        );
                    }}
                />

                <FormField
                    control={form.control as any}
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
                                                    field.value.split(", ").map((dest: string) => (
                                                        <Badge
                                                            key={dest}
                                                            variant="secondary"
                                                            className="rounded-sm px-1 font-normal text-[10px]"
                                                        >
                                                            {dest}
                                                            <span
                                                                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const current = field.value.split(", ").filter((d: string) => d !== dest);
                                                                    field.onChange(current.join(", "));
                                                                }}
                                                            >
                                                                <X className="h-2 w-2 text-muted-foreground hover:text-foreground" />
                                                            </span>
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    "Select destinations..."
                                                )}
                                            </div>
                                            <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0 md:w-[500px]" align="start" onPointerDownOutside={(e) => e.stopPropagation()}>
                                    <Command>
                                        <CommandInput
                                            placeholder="Search destinations..."
                                            className="h-8"
                                            value={destSearch}
                                            onValueChange={setDestSearch}
                                        />
                                        <CommandList>
                                            <CommandEmpty>No destinations found.</CommandEmpty>
                                            <CommandGroup>
                                                {availableDestinations
                                                    .filter(d => d.name.toLowerCase().includes(destSearch.toLowerCase()))
                                                    .map((dest) => {
                                                        const isSelected = field.value?.split(", ").includes(dest.name);
                                                        return (
                                                            <CommandItem
                                                                key={dest.id}
                                                                value={dest.name}
                                                                onSelect={() => {
                                                                    const current = field.value ? field.value.split(", ") : [];
                                                                    if (isSelected) {
                                                                        field.onChange(current.filter((d: string) => d !== dest.name).join(", "));
                                                                    } else {
                                                                        field.onChange([...current, dest.name].join(", "));
                                                                    }
                                                                    setDestSearch("");
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

                {/* Close Lost Reason — only visible when stage is_lost */}
                {isCloseLostStage && (
                    <FormField
                        control={form.control}
                        name="close_lost_reason"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-red-600 font-semibold">Close Lost Reason *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="border-red-200 focus:ring-red-500">
                                            <SelectValue placeholder="Select reason" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {CLOSE_LOST_REASONS.map((reason) => (
                                            <SelectItem key={reason} value={reason}>
                                                {reason}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                <div className="flex gap-4">
                    <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                        {isLoading ? "Creating..." : "Save"}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onCancel ? onCancel() : router.push("/opportunities")}
                    >
                        {isDrawer ? "Close" : "Cancel"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
