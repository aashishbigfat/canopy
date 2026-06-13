"use client";

import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { usePicklist } from "@/hooks/use-picklist";
import { useGetUsers } from "@/features/admin/api/use-users";
import { normalizeSalesStages, getProbabilityForStageId, getCloseLostReasons } from "@/features/opportunities/utils/stageConfig";
import { destinationsService, Destination } from "@/lib/api/services/destinations.service";
import { accountsService } from "@/lib/api/services/accounts.service";
import { contactsService } from "@/lib/api/services/contacts.service";
import { Contact } from "@/features/contacts/types";
import { toast } from "sonner";
import { ErrorHandler, ErrorType } from "@/lib/error-handler";
import { IndustryOpportunityFields, DestinationMultiSelect } from "@/components/industry/IndustryOpportunityFields";
import { useIndustry } from "@/lib/industry-labels";

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
    owner_id: z.string().optional(),
    close_date: z.string().optional(),
    travel_date: z.string().optional(),
    experience_id: z.string().optional(),
    no_of_pax: z.string().optional(),
    no_of_adults: z.string().optional(),
    no_of_childs: z.string().optional(),
    no_of_infants: z.string().optional(),
    no_of_nights: z.string().optional(),
    destinations: z.string().optional(),
    source_id: z.string().optional(),
    creation_type: z.enum(["Manual", "Auto"]).optional(),
    description: z.string().optional(),
    account_id: z.string().min(1, "Account is required."),
    contact_id: z.string().optional(),
    inclusions: z.array(z.string()).default([]),
    close_lost_reason: z.string().optional(),
    key_deal: z.boolean().optional(),
    industry_data: z.record(z.string(), z.any()).optional(),
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
    const { data: session } = useSession();
    const [isLoading, setIsLoading] = useState(false);
    const createOpportunity = useCreateOpportunity();
    const { data: stages } = useSalesStages();
    const { data: experiences } = useExperiences();
    const { data: usersData, isLoading: isLoadingUsers } = useGetUsers();
    const { items: sources } = usePicklist("source");
    const industry = useIndustry();
    const isTravel = industry === "travel";

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
        if (!isTravel) return;
        destinationsService.getDestinations({ limit: 1000 }).then(res => {
            setAvailableDestinations(res.destinations);
        }).catch(err => console.error("Failed to fetch destinations", err));
    }, [isTravel]);

    // Original pre-filled data (to restore on toggle)
    const [originalAccount, setOriginalAccount] = useState<{ id: string; name: string; is_person_account?: boolean } | null>(null);

    // Search accounts handler
    const handleAccountSearch = useCallback(async (query: string, signal?: AbortSignal) => {
        if (!query || query.length < 1) {
            setAccountOptions([]);
            return;
        }
        try {
            setLoadingAccounts(true);
            const results = await accountsService.searchAccountAutocomplete(query, isPersonAccount, signal);
            setAccountOptions(results as any);
        } catch (error) {
            if (!axios.isCancel(error)) {
                console.error("Account search error", error);
            }
        } finally {
            setLoadingAccounts(false);
        }
    }, [isPersonAccount]);

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
            owner_id: "",
            close_date: new Date().toISOString().split('T')[0],
            travel_date: "",
            experience_id: "",
            no_of_pax: "",
            no_of_adults: "",
            no_of_childs: "",
            no_of_infants: "",
            no_of_nights: "",
            destinations: "",
            source_id: "",
            creation_type: "Manual",
            description: "",
            account_id: initialAccountId || "",
            contact_id: initialContactId || "",
            inclusions: [],
            close_lost_reason: "",
            key_deal: false,
        } as OpportunityFormValues,
    });

    // Pre-select account (and optionally contact) when initial IDs are provided.
    // Single source of truth — fetches the account once and seeds every piece of
    // state the form needs (options, form value, selection, person-account flag,
    // and the originalAccount used to restore on account-type toggle).
    useEffect(() => {
        if (!initialAccountId) return;
        accountsService.getAccount(initialAccountId).then(acc => {
            const opt = { id: acc.id, name: acc.name, is_person_account: acc.is_person_account };
            setAccountOptions([opt as any]);
            setOriginalAccount(opt);
            form.setValue("account_id", acc.id);
            setSelectedAccountId(acc.id);
            setIsPersonAccount(acc.is_person_account || false);
            if (initialContactId) {
                form.setValue("contact_id", initialContactId);
            }
        }).catch(() => { });
    }, [initialAccountId, initialContactId, form]);

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
            if (Array.isArray(details)) {
                details.forEach((err: any) => {
                    const field = err.loc?.[err.loc.length - 1];
                    if (field) {
                        form.setError(field as any, {
                            type: "manual",
                            message: err.msg,
                        });
                    }
                });
            } else if (typeof details === "string") {
                toast.error(details);
            }
            return true;
        }
        return false;
    };

    // industry & isTravel already declared at component top

    async function onSubmit(data: OpportunityFormValues) {
        // Contact is mandatory for company accounts (it's hidden for person accounts).
        if (!isPersonAccount && !data.contact_id) {
            form.setError("contact_id", { type: "manual", message: "Contact is required." });
            return;
        }

        setIsLoading(true);
        const startTime = Date.now();
        let isSuccess = false;
        try {
            await ErrorHandler.withErrorHandling(async () => {
                try {
                    const payload: any = {
                        name: data.name,
                        sales_stage_id: data.sales_stage_id,
                        account_id: data.account_id || undefined,
                        contact_id: data.contact_id || undefined,
                    };

                    if (data.owner_id) payload.owner_id = data.owner_id;
                    if (data.source_id && data.source_id !== "none") payload.source_id = data.source_id;
                    payload.creation_type = data.creation_type || "Manual";
                    if (data.key_deal) payload.key_deal = data.key_deal;
                    if (data.description?.trim()) payload.description = data.description.trim();
                    if (data.close_lost_reason) payload.close_lost_reason = data.close_lost_reason;

                    if (data.amount !== undefined && data.amount !== "") payload.amount = Number(data.amount);
                    if (data.probability) payload.probability = Number(data.probability);
                    if (data.close_date) payload.close_date = data.close_date;
                    // ALL industries: wrap industry-specific fields inside industry_data
                    if (isTravel) {
                        const travelIndustryData: Record<string, any> = {};
                        if (data.travel_date) travelIndustryData.travel_date = data.travel_date;
                        if (data.experience_id && data.experience_id !== "none") travelIndustryData.experience_id = data.experience_id;
                        if (data.no_of_pax) travelIndustryData.no_of_pax = Number(data.no_of_pax);
                        if (data.no_of_adults) travelIndustryData.no_of_adults = Number(data.no_of_adults);
                        if (data.no_of_childs) travelIndustryData.no_of_childs = Number(data.no_of_childs);
                        if (data.no_of_infants) travelIndustryData.no_of_infants = Number(data.no_of_infants);
                        if (data.no_of_nights) travelIndustryData.no_of_nights = Number(data.no_of_nights);
                        if (data.inclusions && data.inclusions.length > 0) travelIndustryData.inclusions = data.inclusions;

                        if (data.destinations) {
                            // destinations field stores comma-separated IDs directly from the searchable select
                            const destIds = data.destinations.split(",").map((d: string) => d.trim()).filter(Boolean);
                            if (destIds.length > 0) travelIndustryData.destination_ids = destIds;
                        }

                        payload.industry_data = travelIndustryData;
                    } else if (data.industry_data) {
                        payload.industry_data = data.industry_data;
                    }

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
    }    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* ── Section: Opportunity Information ─────────────────── */}
                <div className="border border-border rounded-lg overflow-hidden bg-card">
                    <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-2.5">
                        <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                            Opportunity Information
                        </p>
                    </div>

                    <div className="p-5 space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Row 1: Account Type Toggles — first, the rest of the form
                                (account/contact pickers) depends on this choice */}
                            <div className="md:col-span-2 flex items-center gap-4 py-2 border-b border-border/50">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        id="account-type-company"
                                        name="accountType"
                                        checked={!isPersonAccount}
                                        onChange={(e) => {
                                            setIsPersonAccount(false);
                                            if (originalAccount && !originalAccount.is_person_account) {
                                                form.setValue("account_id", originalAccount.id);
                                                form.setValue("contact_id", initialContactId || "");
                                                setSelectedAccountId(originalAccount.id);
                                                setAccountOptions([originalAccount]);
                                            } else {
                                                form.setValue("account_id", "");
                                                form.setValue("contact_id", "");
                                                setSelectedAccountId("");
                                                setAccountOptions([]);
                                                setAccountContacts([]);
                                            }
                                        }}
                                        className="cursor-pointer"
                                    />
                                    <label htmlFor="account-type-company" className="cursor-pointer text-sm font-medium text-foreground">Account</label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        id="account-type-person"
                                        name="accountType"
                                        checked={isPersonAccount}
                                        onChange={(e) => {
                                            setIsPersonAccount(true);
                                            if (originalAccount && originalAccount.is_person_account) {
                                                form.setValue("account_id", originalAccount.id);
                                                form.setValue("contact_id", "");
                                                setSelectedAccountId(originalAccount.id);
                                                setAccountOptions([originalAccount]);
                                            } else {
                                                form.setValue("account_id", "");
                                                form.setValue("contact_id", "");
                                                setSelectedAccountId("");
                                                setAccountOptions([]);
                                                setAccountContacts([]);
                                            }
                                        }}
                                        className="cursor-pointer"
                                    />
                                    <label htmlFor="account-type-person" className="cursor-pointer text-sm font-medium text-foreground">Personal Account</label>
                                </div>
                            </div>

                            {/* Row 2: Name & Owner */}
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

                            <div>
                                <FormLabel className="text-[10px] font-bold uppercase text-foreground/80 mb-1.5 block">Opportunity Owner</FormLabel>
                                <div className="h-9 flex items-center text-xs text-foreground px-3 bg-muted/40 rounded-md border border-border truncate">
                                    {session?.user?.name || "Assigned to you"}
                                </div>
                            </div>

                            {/* Row 2: Creation & Source */}
                            <FormField
                                control={form.control}
                                name="creation_type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Creation</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || "Manual"}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select creation type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Manual">Manual</SelectItem>
                                                <SelectItem value="Auto">Auto</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="source_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Opportunity Source</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ""}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select source" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem>
                                                {sources.map((s) => (
                                                    <SelectItem key={s.id} value={s.id}>
                                                        {s.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Row 4: Account & Contact */}
                            <FormField
                                control={form.control}
                                name="account_id"
                                render={({ field }) => (
                                    <FormItem className={isPersonAccount ? "md:col-span-2" : ""}>
                                        <FormLabel>{isPersonAccount ? "Personal Accounts *" : "Account *"}</FormLabel>
                                        <FormControl>
                                            <SearchableSelect
                                                options={accountOptions.map(a => ({ label: a.name, value: a.id }))}
                                                value={field.value}
                                                onValueChange={(val) => {
                                                    field.onChange(val);
                                                    setSelectedAccountId(val);
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

                            {!isPersonAccount && (
                                <FormField
                                    control={form.control}
                                    name="contact_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Contact Name *</FormLabel>
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

                            {/* Row 5: Sales Stage & Probability */}
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
                                                className="cursor-not-allowed bg-muted text-muted-foreground"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Travel Industry Specific Fields (Inline) */}
                            {isTravel && (
                                <>
                                    <FormField control={form.control} name="experience_id" render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel>Experience</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                                <FormControl>
                                                    <SelectTrigger><SelectValue placeholder="Select experience" /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="none">None</SelectItem>
                                                    {experiences?.map((e: any) => (
                                                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

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

                                    <FormField
                                        control={form.control as any}
                                        name="inclusions"
                                        render={({ field }) => {
                                            const selected: string[] = field.value || [];
                                            return (
                                                <FormItem className="md:col-span-2">
                                                    <FormLabel>Inclusion(s)</FormLabel>
                                                    <Popover open={inclusionOpen} onOpenChange={setInclusionOpen}>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant="outline"
                                                                    role="combobox"
                                                                    className={cn(
                                                                        "min-h-[36px] h-auto w-full justify-between px-3 py-1",
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

                                    <FormField control={form.control} name="travel_date" render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Travel Date *</FormLabel>
                                            <FormControl><Input type="date" min={new Date().toISOString().split("T")[0]} {...field} /></FormControl>
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
                                            <FormLabel className="text-sm font-medium">Total Pax</FormLabel>
                                            <FormControl><Input type="number" min="0" className="text-foreground" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </>
                            )}

                            {/* Non-Travel Industry specific fields */}
                            {!isTravel && (
                                <div className="md:col-span-2">
                                    <IndustryOpportunityFields industry={industry} form={form} />
                                </div>
                            )}

                            {/* Row: Amount & Close Date */}
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
                                name="close_date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Close Date</FormLabel>
                                        <FormControl><Input type="date" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Description (Full Width) */}
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2">
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

                            {/* Key Deal flag */}
                            <FormField
                                control={form.control}
                                name="key_deal"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center gap-2 space-y-0 md:col-span-2">
                                        <FormControl>
                                            <Checkbox
                                                checked={!!field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormLabel className="cursor-pointer font-medium">
                                            Mark as Key Deal
                                        </FormLabel>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Section: Additional Information ─────────────────── */}
                {isCloseLostStage && (
                    <div className="border border-border rounded-lg overflow-hidden bg-card">
                        <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-2.5">
                            <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                                Additional Information
                            </p>
                        </div>
                        <div className="p-5">
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
                                                {getCloseLostReasons(industry).map((reason) => (
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
                        </div>
                    </div>
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
