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
import { useUpdateOpportunity } from "../api/useOpportunities";
import { usePicklist } from "@/hooks/use-picklist";
import { Opportunity } from "../types";
import { normalizeSalesStages, getProbabilityForStageId, StageWithProbability, getCloseLostReasons } from "@/features/opportunities/utils/stageConfig";
import { SalesStage } from "@/lib/api/services/opportunities.service";
import { destinationsService, Destination } from "@/lib/api/services/destinations.service";
import { accountsService } from "@/lib/api/services/accounts.service";
import { contactsService } from "@/lib/api/services/contacts.service";
import { Contact } from "@/features/contacts/types";
import { toast } from "sonner";
import { ErrorHandler, ErrorType } from "@/lib/error-handler";
import { IndustryOpportunityFields } from "@/components/industry/IndustryOpportunityFields";
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
    account_id: z.string().optional(),
    contact_id: z.string().optional(),
    inclusions: z.array(z.string()).default([]),
    close_lost_reason: z.string().optional(),
    industry_data: z.record(z.string(), z.any()).optional(),
});

type OpportunityFormValues = z.infer<typeof opportunityFormSchema>;

interface OpportunityEditFormProps {
    opportunity: Opportunity;
    stages: SalesStage[] | StageWithProbability[];
    /** Called after successful update instead of router.push */
    onSuccess?: () => void;
    /** Called when cancel is clicked instead of router.push */
    onCancel?: () => void;
    /** When true, hides back button and renders compact layout */
    isDrawer?: boolean;
}

export function OpportunityEditForm({ opportunity, stages, onSuccess, onCancel, isDrawer = false }: OpportunityEditFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const updateOpportunity = useUpdateOpportunity();
    const { items: sources } = usePicklist("source");
    const normalizedStages = normalizeSalesStages(stages);

    const [availableDestinations, setAvailableDestinations] = useState<Destination[]>([]);
    const [destinationOpen, setDestinationOpen] = useState(false);
    const [destSearch, setDestSearch] = useState("");
    const [inclusionOpen, setInclusionOpen] = useState(false);
    const [inclusionSearch, setInclusionSearch] = useState("");

    // Account & Contact state
    const [accountOptions, setAccountOptions] = useState<{ id: string; name: string; is_person_account?: boolean }[]>([]);
    const [accountContacts, setAccountContacts] = useState<Contact[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState(opportunity.account_id || "");
    const [isPersonAccount, setIsPersonAccount] = useState(opportunity.is_person_account || false);

    const industry = useIndustry();
    const isTravel = industry === "travel";

    // Ensure close_date is always current date
    const todayStr = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (!isTravel) return;
        destinationsService.getDestinations({ limit: 1000 }).then(res => {
            setAvailableDestinations(res.destinations);
        }).catch(err => console.error("Failed to fetch destinations", err));
    }, [isTravel]);

    // Original pre-filled data (to restore on toggle)
    const [originalAccount, setOriginalAccount] = useState<{ id: string; name: string; is_person_account?: boolean } | null>(null);

    // Load initial account into options
    useEffect(() => {
        if (opportunity.account_id) {
            accountsService.getAccount(opportunity.account_id).then(acc => {
                const opt = { id: acc.id, name: acc.name, is_person_account: acc.is_person_account };
                setAccountOptions([opt]);
                setOriginalAccount(opt);
                setIsPersonAccount(acc.is_person_account || false);
            }).catch(() => { });
        }
    }, [opportunity.account_id]);

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

    // Load initial contact into list if not present
    useEffect(() => {
        if (opportunity.contact_id && accountContacts.length === 0) {
            contactsService.getContact(opportunity.contact_id).then(c => {
                setAccountContacts([c]);
            }).catch(() => { });
        }
    }, [opportunity.contact_id, accountContacts.length]);

    // Search accounts handler
    const handleAccountSearch = async (query: string, signal?: AbortSignal) => {
        if (!query || query.length < 1) {
            setAccountOptions(opportunity.account_id ? [...accountOptions] : []);
            return;
        }
        try {
            setLoadingAccounts(true);
            const results = await accountsService.searchAccountAutocomplete(query, isPersonAccount, signal);
            setAccountOptions(results as any);
        } catch (error) {
            console.error("Account search error", error);
        } finally {
            setLoadingAccounts(false);
        }
    };

    const form = useForm<OpportunityFormValues>({
        resolver: zodResolver(opportunityFormSchema) as any,
        defaultValues: {
            name: opportunity.name || "",
            amount: opportunity.amount?.toString() || "0",
            sales_stage_id: opportunity.sales_stage_id || "",
            probability: opportunity.probability?.toString() || "10",
            close_date: todayStr,
            // Read travel fields from industry_data
            travel_date: opportunity.industry_data?.travel_date ? String(opportunity.industry_data.travel_date).split('T')[0] : "",
            experience_id: opportunity.industry_data?.experience_id || "",
            no_of_pax: opportunity.industry_data?.no_of_pax?.toString() || "",
            no_of_adults: opportunity.industry_data?.no_of_adults?.toString() || "",
            no_of_childs: opportunity.industry_data?.no_of_childs?.toString() || "0",
            no_of_infants: opportunity.industry_data?.no_of_infants?.toString() || "0",
            no_of_nights: opportunity.industry_data?.no_of_nights?.toString() || "",
            destinations: (opportunity.industry_data?.destination_ids as string[] | undefined)?.join(",") || "",
            source_id: opportunity.source_id || "",
            creation_type: opportunity.creation_type === "Auto" ? "Auto" : "Manual",
            description: opportunity.description || "",
            account_id: opportunity.account_id || "",
            contact_id: opportunity.contact_id || "",
            inclusions: (opportunity.industry_data?.inclusions as string[]) || [],
            close_lost_reason: opportunity.close_lost_reason || "",
        } as OpportunityFormValues,
    });

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
        // Clear close_lost_reason when switching away from Close Lost
        const stageObj = normalizedStages.find(s => s.id === selectedStageId) as any;
        if (!stageObj?.is_lost) {
            form.setValue("close_lost_reason", "");
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
            // Backend may return detail as a string (error message) or array (field errors)
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

    async function onSubmit(data: OpportunityFormValues) {
        // Validate close_lost_reason if stage is Close Lost
        const stageObj = normalizedStages.find(s => s.id === data.sales_stage_id) as any;
        if (stageObj?.is_lost && !data.close_lost_reason?.trim()) {
            form.setError("close_lost_reason", {
                type: "manual",
                message: "Close Lost Reason is required when stage is Close Lost.",
            });
            return;
        }

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
                        travelIndustryData.inclusions = data.inclusions || [];

                        if (data.destinations) {
                            // destinations field stores comma-separated IDs directly from the searchable select
                            const destIds = data.destinations.split(",").map((d: string) => d.trim()).filter(Boolean);
                            travelIndustryData.destination_ids = destIds;
                        } else {
                            travelIndustryData.destination_ids = [];
                        }

                        payload.industry_data = travelIndustryData;
                    } else if (data.industry_data) {
                        payload.industry_data = data.industry_data;
                    }

                    // Always send description so it can be saved or cleared
                    payload.description = data.description || null;
                    if (data.account_id !== undefined) payload.account_id = data.account_id || null;
                    if (data.contact_id !== undefined) payload.contact_id = data.contact_id || null;
                    payload.source_id = (data.source_id && data.source_id !== "none") ? data.source_id : null;
                    payload.creation_type = data.creation_type || "Manual";
                    // Always send close_lost_reason (empty string clears it on backend)
                    payload.close_lost_reason = data.close_lost_reason || "";

                    await updateOpportunity.mutateAsync({
                        id: opportunity.id,
                        data: payload
                    });

                    toast.success("Opportunity updated successfully");
                    if (onSuccess) {
                        onSuccess();
                    } else {
                        router.push(`/opportunities/${opportunity.id}`);
                        router.refresh();
                    }
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
        <div className="space-y-4">
            {!isDrawer && (
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                        <Link href={`/opportunities/${opportunity.id}`}>
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                </div>
            )}

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="crm-surface mb-1 flex items-center gap-2 p-3">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Type:</span>
                        <Badge variant="outline" className={cn(
                            "px-2 py-0.5 font-bold text-[10px] transition-colors",
                            isPersonAccount
                                ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                                : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                        )}>
                            {isPersonAccount ? "PERSON ACCOUNT" : "ACCOUNT"}
                        </Badge>
                    </div>
                    <div className="crm-surface mb-1 flex items-center gap-4 p-3">
                        <div className="flex items-center gap-2">
                            <input
                                type="radio"
                                id="account-type-company"
                                name="accountType"
                                checked={!isPersonAccount}
                                onChange={(e) => {
                                    const newIsPerson = false;
                                    setIsPersonAccount(newIsPerson);
                                    if (originalAccount && !originalAccount.is_person_account) {
                                        form.setValue("account_id", originalAccount.id);
                                        form.setValue("contact_id", opportunity.contact_id || "");
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
                            <label htmlFor="account-type-company" className="text-sm font-medium text-slate-200 cursor-pointer">Account</label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="radio"
                                id="account-type-person"
                                name="accountType"
                                checked={isPersonAccount}
                                onChange={(e) => {
                                    const newIsPerson = true;
                                    setIsPersonAccount(newIsPerson);
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
                            <label htmlFor="account-type-person" className="text-sm font-medium text-slate-200 cursor-pointer">Personal Account</label>
                        </div>
                    </div>
                    <div className="crm-surface grid gap-6 p-4 md:grid-cols-2">
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
                                    <FormLabel>{isPersonAccount ? "Personal Accounts *" : "Account *"}</FormLabel>
                                    <FormControl>
                                        <SearchableSelect
                                            options={accountOptions.map(a => ({ label: a.name, value: a.id }))}
                                            value={field.value}
                                            onValueChange={(val) => {
                                                field.onChange(val);
                                                setSelectedAccountId(val);
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
                                            className="bg-slate-800 text-slate-400 cursor-not-allowed"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Opportunity Source */}
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

                        {/* Creation — Manual / Auto */}
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
                    </div>

                    {/* Industry-Specific Fields */}
                    <IndustryOpportunityFields industry={useIndustry()} form={form} />


                    <div className="crm-surface p-4">
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
                    </div>

                    {/* Inclusions Multi-Select — Travel only */}
                    {isTravel && (
                    <FormField
                        control={form.control as any}
                        name="inclusions"
                        render={({ field }) => {
                            const selected: string[] = field.value || [];
                            return (
                                <FormItem>
                                    <FormLabel>Inclusion(s)</FormLabel>
                                    <Popover open={inclusionOpen} onOpenChange={setInclusionOpen}>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className={cn(
                                                        "min-h-[36px] h-auto w-full justify-between bg-slate-900 px-3 py-1",
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
                    )}

                    {/* Close Lost Reason — only visible when stage is_lost */}
                    {isCloseLostStage && (
                        <FormField
                            control={form.control}
                            name="close_lost_reason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-red-600 font-semibold">Close Lost Reason *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ""}>
                                        <FormControl>
                                            <SelectTrigger className="border-red-500/40 focus:ring-red-500">
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
                    )}

                    <div className="sticky bottom-0 z-10 flex gap-4 border-t bg-card py-3">
                        <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                            {isLoading ? "Saving..." : isDrawer ? "Update" : "Save Changes"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onCancel ? onCancel() : router.push(`/opportunities/${opportunity.id}`)}
                        >
                            {isDrawer ? "Close" : "Cancel"}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
