"use client";

import axios from "axios";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { usePicklist } from "@/hooks/use-picklist";
import { ErrorType } from "@/lib/error-handler";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown, User, Building2, Globe, MapPin, Activity, Info, Tag, Layers, Share2 } from "lucide-react";
import { Calendar as DayPicker } from "@/components/ui/calendar";

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
import { PhoneInput } from "@/components/ui/phone-input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { locationService, Country, State, City } from "@/lib/api/services/locations.service";
import { leadsService } from "@/lib/api/services/leads.service";
import { destinationsService, Destination } from "@/lib/api/services/destinations.service";
import { Lead, LeadCreateData, LeadStatus, Source, Industry } from "../types";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { ErrorHandler, showSuccessToast } from "@/lib/error-handler";
import { logger } from "@/lib/logger";
import { LoadingButton } from "@/components/ui/loading";
import { IndustryLeadFields } from "@/components/industry/IndustryLeadFields";
import { useIndustry } from "@/lib/industry-labels";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";


const searchCache = {
    countries: new Map<string, any>(),
    states: new Map<string, any>(),
    cities: new Map<string, any>(),
    destinations: new Map<string, any>(),
};

function LocationFields({ form }: { form: any }) {
    const [countries, setCountries] = useState<Country[]>([]);
    const [states, setStates] = useState<State[]>([]);
    const [cities, setCities] = useState<City[]>([]);

    const [loadingCountries, setLoadingCountries] = useState(false);
    const [loadingStates, setLoadingStates] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);

    // Initial load for popular countries or current value
    useEffect(() => {
        const init = async () => {
            const currentCountryName = form.getValues("country");
            const currentStateName = form.getValues("state");
            const currentCityName = form.getValues("city");

            if (currentCountryName) {
                setLoadingCountries(true);
                try {
                    const res = await locationService.searchCountries(currentCountryName);
                    setCountries(res.countries);
                    const country = res.countries.find(c => c.name === currentCountryName);
                    
                    if (country && currentStateName) {
                        setLoadingStates(true);
                        const sRes = await locationService.searchStates(currentStateName, country.id);
                        setStates(sRes.states);
                        const state = sRes.states.find(s => s.name === currentStateName);
                        
                        if (state && currentCityName) {
                            setLoadingCities(true);
                            const cRes = await locationService.searchCities(currentCityName, country.id, state.id);
                            setCities(cRes.cities);
                            setLoadingCities(false);
                        }
                        setLoadingStates(false);
                    }
                } catch (err) {
                    console.error("Location init error", err);
                } finally {
                    setLoadingCountries(false);
                }
            } else {
                // Load popular countries as default options
                const cacheKey = "popular";
                if (searchCache.countries.has(cacheKey)) {
                    setCountries(searchCache.countries.get(cacheKey));
                } else {
                    setLoadingCountries(true);
                    locationService.getCountries(true).then(r => {
                        searchCache.countries.set(cacheKey, r.countries);
                        setCountries(r.countries);
                        setLoadingCountries(false);
                    });
                }
            }
        };
        init();
    }, []);

    const handleCountrySearch = useCallback(async (query: string, signal?: AbortSignal) => {
        try {
            if (!query) {
                const cacheKey = "popular";
                if (searchCache.countries.has(cacheKey)) {
                    setCountries(searchCache.countries.get(cacheKey));
                    return;
                }
                const res = await locationService.getCountries(true, signal);
                searchCache.countries.set(cacheKey, res.countries);
                setCountries(res.countries);
                return;
            }

            if (searchCache.countries.has(query)) {
                setCountries(searchCache.countries.get(query));
                return;
            }

            setLoadingCountries(true);
            const res = await locationService.searchCountries(query, signal);
            searchCache.countries.set(query, res.countries);
            setCountries(res.countries);
        } catch (error) {
            if (!axios.isCancel(error)) {
                console.error("Country search error", error);
            }
        } finally {
            setLoadingCountries(false);
        }
    }, []);

    const handleStateSearch = useCallback(async (query: string, signal?: AbortSignal) => {
        const countryName = form.getValues("country");
        const country = countries.find(c => c.name === countryName);
        if (!country) return;

        try {
            const cacheKey = `${country.id}:${query || "all"}`;
            if (searchCache.states.has(cacheKey)) {
                setStates(searchCache.states.get(cacheKey));
                return;
            }

            if (!query) {
                const res = await locationService.getStates(country.id, signal);
                searchCache.states.set(cacheKey, res.states);
                setStates(res.states);
                return;
            }

            setLoadingStates(true);
            const res = await locationService.searchStates(query, country.id, signal);
            searchCache.states.set(cacheKey, res.states);
            setStates(res.states);
        } catch (error) {
            if (!axios.isCancel(error)) {
                console.error("State search error", error);
            }
        } finally {
            setLoadingStates(false);
        }
    }, [countries, form]);

    const handleCitySearch = useCallback(async (query: string, signal?: AbortSignal) => {
        const countryName = form.getValues("country");
        const stateName = form.getValues("state");
        const country = countries.find(c => c.name === countryName);
        const state = states.find(s => s.name === stateName);
        
        if (!state) return;

        try {
            const cacheKey = `${state.id}:${query || "all"}`;
            if (searchCache.cities.has(cacheKey)) {
                setCities(searchCache.cities.get(cacheKey));
                return;
            }

            if (!query) {
                const res = await locationService.getCitiesByState(state.id, signal);
                searchCache.cities.set(cacheKey, res.cities);
                setCities(res.cities);
                return;
            }

            setLoadingCities(true);
            const res = await locationService.searchCities(query, country?.id, state.id, signal);
            searchCache.cities.set(cacheKey, res.cities);
            setCities(res.cities);
        } catch (error) {
            if (!axios.isCancel(error)) {
                console.error("City search error", error);
            }
        } finally {
            setLoadingCities(false);
        }
    }, [countries, states, form]);

    return (
        <>
            <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel className="text-[10px] font-bold uppercase text-foreground/80">Country *</FormLabel>
                        <FormControl>
                            <SearchableSelect
                                options={countries.map(c => ({ label: c.name, value: c.name }))}
                                value={field.value}
                                onSearch={handleCountrySearch}
                                isLoading={loadingCountries}
                                onValueChange={(val) => {
                                    const prev = field.value;
                                    field.onChange(val);
                                    if (prev !== val) {
                                        const country = countries.find(c => c.name === val);
                                        form.setValue("state", "");
                                        form.setValue("city", "");
                                        setStates([]);
                                        setCities([]);
                                        if (country) {
                                            setLoadingStates(true);
                                            locationService.getStates(country.id).then(r => {
                                                setStates(r?.states || []);
                                                setLoadingStates(false);
                                            });
                                        }
                                    }
                                }}
                                placeholder="Select country"
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel className="text-[10px] font-bold uppercase text-foreground/80">State *</FormLabel>
                        <FormControl>
                            <SearchableSelect
                                options={states.map(s => ({ label: s.name, value: s.name }))}
                                value={field.value}
                                onValueChange={(val) => {
                                    const prev = field.value;
                                    field.onChange(val);
                                    if (prev !== val) {
                                        const state = states.find(s => s.name === val);
                                        form.setValue("city", "");
                                        setCities([]);
                                        if (state) {
                                            setLoadingCities(true);
                                            locationService.getCitiesByState(state.id).then(r => {
                                                setCities(r?.cities || []);
                                                setLoadingCities(false);
                                            });
                                        }
                                    }
                                }}
                                onSearch={handleStateSearch}
                                disabled={!form.watch("country")}
                                isLoading={loadingStates}
                                placeholder="Select state"
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel className="text-[10px] font-bold uppercase text-foreground/80">City *</FormLabel>
                        <FormControl>
                            <SearchableSelect
                                options={cities.map(c => ({ label: c.name, value: c.name }))}
                                value={field.value}
                                onValueChange={field.onChange}
                                onSearch={handleCitySearch}
                                disabled={!form.watch("state")}
                                isLoading={loadingCities}
                                placeholder="Select city"
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </>
    );
}


const leadFormSchema = z.object({
    salutation: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().min(1, { message: "Last name is required." }),
    company: z.string().optional(),
    email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal("")),
    phone: z.string()
        .optional()
        .or(z.literal(""))
        .refine(val => !val || /^\+?\d{1,4}\s\d{10}$/.test(val), {
            message: "Please select a country code and enter exactly a 10-digit number.",
        }),
    mobile: z.string()
        .optional()
        .or(z.literal(""))
        .refine(val => !val || /^\+?\d{1,4}\s\d{10}$/.test(val), {
            message: "Please select a country code and enter exactly a 10-digit number.",
        }),
    no_employees: z.string().optional(),
    website: z.string().url({ message: "Please enter a valid URL (e.g. https://example.com)" }).optional().or(z.literal("")),
    title: z.string().optional(),
    lead_status_id: z.string().optional(),
    source_id: z.string().optional(),
    source_medium: z.string().optional(),
    combined_source: z.string().min(1, { message: "Source Medium is required." }),
    industry_id: z.string().optional(),
    street: z.string().optional(),
    city: z.string().min(1, { message: "City is required." }),
    state: z.string().min(1, { message: "State is required." }),
    zip: z.string().optional().or(z.literal("")).refine(val => !val || /^[A-Za-z0-9\s-]{3,10}$/.test(val), {
        message: "Invalid Zip/Postal code format.",
    }),
    country: z.string().min(1, { message: "Country is required." }),
    campaign_name: z.string().optional(),
    travel_date: z.string().min(1, { message: "Travel date is required." }),
    no_of_nights: z.string().refine((val) => !val || Number(val) > 0, "Number of nights must be at least 1"),
    no_of_adults: z.string().refine((val) => !val || Number(val) > 0, "Number of adults must be at least 1"),
    no_of_pax: z.string().refine((val) => !val || Number(val) > 0, "Number of pax must be at least 1"),
    no_of_childs: z.string().refine((val) => !val || Number(val) >= 0, "Cannot be negative").optional(),
    no_of_infants: z.string().refine((val) => !val || Number(val) >= 0, "Cannot be negative").optional(),
    is_fixed: z.boolean().default(false).optional(),
    destinations: z.string().min(1, { message: "Destinations are required." }),
    segment: z.string().optional(),
    creation_type: z.enum(["manual", "auto"]).optional(),
    experience_id: z.string().optional(),
});

// Shared base fields for generic (non-travel) schemas
const genericBaseFields = {
    salutation: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().min(1, { message: "Last name is required." }),
    company: z.string().optional(),
    email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal("")),
    phone: z.string()
        .optional()
        .or(z.literal(""))
        .refine(val => !val || /^\+?\d{1,4}\s\d{10}$/.test(val), {
            message: "Please select a country code and enter exactly a 10-digit number.",
        }),
    mobile: z.string()
        .optional()
        .or(z.literal(""))
        .refine(val => !val || /^\+?\d{1,4}\s\d{10}$/.test(val), {
            message: "Please select a country code and enter exactly a 10-digit number.",
        }),
    no_employees: z.string().optional(),
    website: z.string().url({ message: "Please enter a valid URL (e.g. https://example.com)" }).optional().or(z.literal("")),
    title: z.string().optional(),
    lead_status_id: z.string().optional(),
    source_id: z.string().optional(),
    source_medium: z.string().optional(),
    combined_source: z.string().min(1, { message: "Source Medium is required." }),
    industry_id: z.string().optional(),
    street: z.string().optional(),
    city: z.string().min(1, { message: "City is required." }),
    state: z.string().min(1, { message: "State is required." }),
    zip: z.string().optional().or(z.literal("")).refine(val => !val || /^[A-Za-z0-9\s-]{3,10}$/.test(val), {
        message: "Invalid Zip/Postal code format.",
    }),
    country: z.string().min(1, { message: "Country is required." }),
    campaign_name: z.string().optional(),
    segment: z.string().optional(),
    creation_type: z.enum(["manual", "auto"]).optional(),
};

// Healthcare Lead Form Schema — explicit industry_data shape
const healthcareLeadFormSchema = z.object({
    ...genericBaseFields,
    industry_data: z.object({
        chief_complaint: z.string().optional(),
        urgency: z.string().optional(),
        patient_type: z.string().optional(),
        referral_source: z.string().optional(),
        insurance_provider: z.string().optional(),
        insurance_policy_number: z.string().optional(),
        preferred_appointment_date: z.string().optional(),
    }).optional(),
});

// Education Lead Form Schema — explicit industry_data shape
const educationLeadFormSchema = z.object({
    ...genericBaseFields,
    industry_data: z.object({
        highest_qualification: z.string().optional(),
        gpa: z.string().optional(),
        preferred_start_date: z.string().optional(),
        nationality: z.string().optional(),
        sponsorship_type: z.string().optional(),
        scholarship_interest: z.boolean().optional(),
    }).optional(),
});

// Manufacturing Lead Form Schema — explicit industry_data shape
const manufacturingLeadFormSchema = z.object({
    ...genericBaseFields,
    industry_data: z.object({
        rfq_number: z.string().optional(),
        product_category: z.string().optional(),
        estimated_quantity: z.string().optional(),
        unit_of_measure: z.string().optional(),
        target_delivery_date: z.string().optional(),
        budget_range: z.string().optional(),
        technical_specs: z.string().optional(),
        sample_required: z.boolean().optional(),
    }).optional(),
});

/** Select the right Zod schema for the current industry */
function getLeadSchemaForIndustry(industry: string) {
    switch (industry) {
        case "travel":
            return leadFormSchema;
        case "healthcare":
            return healthcareLeadFormSchema;
        case "education":
            return educationLeadFormSchema;
        case "manufacturing":
            return manufacturingLeadFormSchema;
        default:
            return healthcareLeadFormSchema; // safe fallback
    }
}

type LeadFormValues = z.infer<typeof leadFormSchema>;

interface LeadFormProps {
    initialData?: any;
    leadId?: string;
    statuses?: LeadStatus[];
    sources?: Source[];
    source_mediums?: any[];
    industries?: Industry[];
    experiences?: { id: string; name: string }[];
    /** Called after successful create/update instead of router.push.
     *  Receives the saved Lead object so callers can update local state immediately. */
    onSuccess?: (savedLead?: Lead) => void;
    /** Called when cancel is clicked instead of router.back */
    onCancel?: () => void;
    /** When true, renders a compact single-column layout for drawer panels */
    isDrawer?: boolean;
}

const PUBLIC_EMAIL_DOMAINS = [
    "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com",
    "me.com", "live.com", "msn.com", "aol.com", "rediffmail.com", "yahoo.co.in",
    "yahoo.co.uk", "googlemail.com"
];

export function LeadForm({
    initialData,
    leadId,
    statuses = [],
    sources = [],
    source_mediums = [],
    industries = [],
    experiences = [],
    onSuccess,
    onCancel,
    isDrawer = false,
}: LeadFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [availableDestinations, setAvailableDestinations] = useState<Destination[]>([]);
    const { items: salutations } = usePicklist("salutation");

    const [loadingDestinations, setLoadingDestinations] = useState(false);

    const industry = useIndustry();
    const isTravel = industry === "travel";

    useEffect(() => {
        if (!isTravel) return;
        setLoadingDestinations(true);
        destinationsService.getDestinations({ limit: 20 }).then(res => {
            setAvailableDestinations(res.destinations);
        }).catch(err => console.error("Failed to fetch destinations", err))
          .finally(() => setLoadingDestinations(false));
    }, [isTravel]);

    const handleDestinationSearch = useCallback(async (query: string, signal?: AbortSignal) => {
        if (!isTravel) return;
        try {
            const cacheKey = query || "all";
            if (searchCache.destinations.has(cacheKey)) {
                setAvailableDestinations(searchCache.destinations.get(cacheKey));
                return;
            }

            setLoadingDestinations(true);
            const res = await destinationsService.getDestinations({ search: query, limit: 50 }, signal);
            searchCache.destinations.set(cacheKey, res.destinations);
            setAvailableDestinations(res.destinations);
        } catch (error) {
            if (!axios.isCancel(error)) {
                console.error("Destination search error", error);
            }
        } finally {
            setLoadingDestinations(false);
        }
    }, [isTravel]);

    const activeSchema = getLeadSchemaForIndustry(industry);

    const form = useForm<any>({
        resolver: zodResolver(activeSchema) as any,
        defaultValues: {
            salutation: initialData?.salutation || "",
            first_name: initialData?.first_name || "",
            last_name: initialData?.last_name || "",
            company: initialData?.company || "",
            email: initialData?.email || "",
            phone: initialData?.phone || "",
            mobile: initialData?.mobile || "",
            no_employees: initialData?.no_employees?.toString() || "",
            website: initialData?.website || "",
            title: initialData?.title || "",
            lead_status_id: initialData?.lead_status_id || "",
            source_id: initialData?.source_id || "",
            source_medium: initialData?.source_medium || "",
            combined_source: isTravel
                ? (initialData?.source_id || "")
                : (initialData?.source_id || initialData?.creation_type || "manual"),
            industry_id: initialData?.industry_id || "",
            street: initialData?.street || "",
            city: initialData?.city || "",
            state: initialData?.state || "",
            zip: initialData?.zip || "",
            country: initialData?.country || "",
            campaign_name: initialData?.campaign_name || "",
            segment: initialData?.segment || "B2C",
            creation_type: (initialData?.creation_type as "manual" | "auto") || "manual",
            // Industry-specific defaults — prevents uncontrolled-to-controlled input errors
            ...(isTravel ? {
                travel_date: initialData?.industry_data?.travel_date || "",
                no_of_nights: initialData?.industry_data?.no_of_nights?.toString() ?? ("" as any),
                no_of_adults: initialData?.industry_data?.no_of_adults?.toString() ?? ("1" as any),
                no_of_pax: initialData?.industry_data?.no_of_pax?.toString() ?? ("1" as any),
                no_of_childs: initialData?.industry_data?.no_of_childs?.toString() ?? ("0" as any),
                no_of_infants: initialData?.industry_data?.no_of_infants?.toString() ?? ("0" as any),
                is_fixed: initialData?.industry_data?.is_fixed || false,
                destinations: (initialData?.industry_data?.destination_ids as string[] | undefined)?.join(",") || "",
                experience_id: initialData?.industry_data?.experience_id || "",
            } : industry === "healthcare" ? {
                industry_data: {
                    chief_complaint: initialData?.industry_data?.chief_complaint ?? "",
                    urgency: initialData?.industry_data?.urgency ?? "",
                    patient_type: initialData?.industry_data?.patient_type ?? "",
                    referral_source: initialData?.industry_data?.referral_source ?? "",
                    insurance_provider: initialData?.industry_data?.insurance_provider ?? "",
                    insurance_policy_number: initialData?.industry_data?.insurance_policy_number ?? "",
                    preferred_appointment_date: initialData?.industry_data?.preferred_appointment_date ?? "",
                },
            } : industry === "education" ? {
                industry_data: {
                    highest_qualification: initialData?.industry_data?.highest_qualification ?? "",
                    gpa: initialData?.industry_data?.gpa?.toString() ?? "",
                    preferred_start_date: initialData?.industry_data?.preferred_start_date ?? "",
                    nationality: initialData?.industry_data?.nationality ?? "",
                    sponsorship_type: initialData?.industry_data?.sponsorship_type ?? "",
                    scholarship_interest: initialData?.industry_data?.scholarship_interest ?? false,
                },
            } : industry === "manufacturing" ? {
                industry_data: {
                    rfq_number: initialData?.industry_data?.rfq_number ?? "",
                    product_category: initialData?.industry_data?.product_category ?? "",
                    estimated_quantity: initialData?.industry_data?.estimated_quantity?.toString() ?? "",
                    unit_of_measure: initialData?.industry_data?.unit_of_measure ?? "",
                    target_delivery_date: initialData?.industry_data?.target_delivery_date ?? "",
                    budget_range: initialData?.industry_data?.budget_range ?? "",
                    technical_specs: initialData?.industry_data?.technical_specs ?? "",
                    sample_required: initialData?.industry_data?.sample_required ?? false,
                },
            } : {
                industry_data: initialData?.industry_data || {},
            }),
        },
    });

    const email = form.watch("email");

    // Auto-calculate pax — only for travel industry
    const adults = isTravel ? (form.watch("no_of_adults") || 0) : 0;
    const childs = isTravel ? (form.watch("no_of_childs") || 0) : 0;
    const infants = isTravel ? (form.watch("no_of_infants") || 0) : 0;

    useEffect(() => {
        if (!isTravel) return;
        const total = (Number(adults) || 0) + (Number(childs) || 0) + (Number(infants) || 0);
        if (total > 0) {
            form.setValue("no_of_pax", total.toString() as any);
        }
    }, [adults, childs, infants, form]);

    useEffect(() => {
        if (!email || !email.includes("@")) return;

        const emailParts = email.split("@");
        const domain = emailParts[emailParts.length - 1]?.toLowerCase();
        if (!domain) return;

        const isPublic = PUBLIC_EMAIL_DOMAINS.some(d => domain === d || domain.endsWith("." + d));
        const detectedSegment = isPublic ? "B2C" : "B2B"; // B2B = Corporate (default for work domains)

        form.setValue("segment", detectedSegment);
    }, [email, form]);

    // Set default experience to first available in create mode
    useEffect(() => {
        if (!initialData && experiences.length > 0 && !form.getValues("experience_id")) {
            form.setValue("experience_id", experiences[0].id);
        }
    }, [experiences, initialData, form]);

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



    const onSubmit = async (data: any) => {
        setIsLoading(true);
        const startTime = Date.now();
        let isSuccess = false;
        try {
            const payload: any = {
                salutation: data.salutation,
                first_name: data.first_name,
                last_name: data.last_name,
                company: data.company,
                email: data.email || undefined,
                phone: data.phone,
                mobile: data.mobile,
                no_employees: data.no_employees ? parseInt(data.no_employees) : undefined,
                website: data.website,
                title: data.title,
                lead_status_id: data.lead_status_id || undefined,
                source_id: isTravel
                    ? (data.combined_source || undefined)
                    : (["manual", "auto"].includes(data.combined_source) ? undefined : data.combined_source),
                source_medium: data.source_medium,
                industry_id: data.industry_id || undefined,
                street: data.street || undefined,
                city: data.city,
                state: data.state,
                zip: data.zip,
                country: data.country,
                campaign_name: data.campaign_name,
                segment: data.segment,
                creation_type: isTravel
                    ? (data.creation_type || "manual")
                    : (["manual", "auto"].includes(data.combined_source) ? data.combined_source : "manual"),
            };

            // ALL industries: wrap industry-specific fields inside industry_data
            if (isTravel) {
                payload.industry_data = {
                    travel_date: data.travel_date,
                    no_of_nights: Number(data.no_of_nights),
                    no_of_adults: Number(data.no_of_adults),
                    no_of_pax: Number(data.no_of_pax),
                    no_of_childs: data.no_of_childs ? Number(data.no_of_childs) : 0,
                    no_of_infants: data.no_of_infants ? Number(data.no_of_infants) : 0,
                    is_fixed: data.is_fixed,
                    destination_ids: data.destinations?.split(",").map((d: string) => d.trim()).filter(Boolean) || [],
                    experience_id: data.experience_id || undefined,
                };
            } else {
                // Non-travel: send industry_data from form
                payload.industry_data = data.industry_data || {};
            }

            await ErrorHandler.withErrorHandling(async () => {
                try {
                    let savedLead: Lead | undefined;
                    if (leadId) {
                        savedLead = await leadsService.updateLead(leadId, payload);
                        showSuccessToast("Lead updated successfully");
                    } else {
                        savedLead = await leadsService.createLead(payload);
                        showSuccessToast("Lead created successfully");
                    }
                    isSuccess = true;

                    const elapsedTime = Date.now() - startTime;
                    if (elapsedTime < 2500) {
                        await new Promise(r => setTimeout(r, 2500 - elapsedTime));
                    }

                    if (onSuccess) {
                        onSuccess(savedLead);
                    } else {
                        router.push("/leads");
                        router.refresh();
                    }
                } catch (error: any) {
                    const mapped = handleBackendErrors(ErrorHandler.parseError(error, "Failed to save lead"));
                    if (!mapped) throw error;
                }
            }, "Failed to save lead");
        } catch (error) {
            // Error is already handled by ErrorHandler.withErrorHandling
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

    if (isDrawer) {
        return (
            <Form {...(form as any)} className="w-full">
                <form
                    onSubmit={form.handleSubmit(onSubmit as any)}
                    className="w-full [&_[data-slot=form-label]]:!text-foreground/85 [&_input]:text-foreground [&_textarea]:text-foreground [&_[data-slot=select-trigger]]:text-foreground"
                >
                    <div className="px-5 py-4 space-y-5">
                        {/* Section: Client Information */}
                        <div>
                            <div className="mb-3 flex items-center gap-2 border-b border-border pb-2">
                                <User className="h-4 w-4 text-primary" />
                                <h3 className="text-sm font-semibold text-foreground">Client Information</h3>
                            </div>
                            <div className="grid gap-3 grid-cols-2">
                                <FormField control={form.control as any} name="salutation" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-foreground/80">Salutation</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger className="h-8 bg-background text-xs"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {salutations.map((s) => (
                                                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="segment" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-foreground/80">Segment</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger className="h-8 bg-background text-xs"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="B2C">B2C (Individual)</SelectItem>
                                                <SelectItem value="B2B">B2B (Corporate)</SelectItem>
                                                <SelectItem value="B2B_DIRECT">B2B</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="first_name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-foreground/80">First Name</FormLabel>
                                        <FormControl><Input placeholder="John" className="h-8 bg-background text-xs" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="last_name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-foreground/80">Last Name <span className="text-red-500">*</span></FormLabel>
                                        <FormControl><Input placeholder="Doe" className="h-8 bg-background text-xs" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="email" render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel className="text-[10px] font-bold uppercase text-foreground/80">Email <span className="text-red-500">*</span></FormLabel>
                                        <FormControl><Input type="email" placeholder="john@example.com" className="h-8 bg-background text-xs" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="phone" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-foreground/80">Phone <span className="text-red-500">*</span></FormLabel>
                                        <FormControl><PhoneInput {...field} placeholder="Phone" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="mobile" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-foreground/80">Mobile <span className="text-red-500">*</span></FormLabel>
                                        <FormControl><PhoneInput {...field} placeholder="Mobile" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>

                        {/* Section: Company & Source */}
                        <div>
                            <div className="mb-3 flex items-center gap-2 border-b border-border pb-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                <h3 className="text-sm font-semibold text-foreground">Company & Source</h3>
                            </div>
                            <div className="grid gap-3 grid-cols-2">
                                <FormField control={form.control as any} name="lead_status_id" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-foreground/80">Lead Status</FormLabel>
                                        <FormControl><SearchableSelect options={statuses.map(s => ({ label: s.name, value: s.id }))} value={field.value} onValueChange={field.onChange} placeholder="Select Status" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                {isTravel ? (
                                    <>
                                        <FormField control={form.control as any} name="creation_type" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase text-foreground/80">Creation <span className="text-red-500">*</span></FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger className="h-8 bg-background text-xs"><SelectValue placeholder="Select source" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="manual">Manual</SelectItem>
                                                        <SelectItem value="auto">Auto</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control as any} name="combined_source" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase text-foreground/80">Source Medium <span className="text-red-500">*</span></FormLabel>
                                                <FormControl><SearchableSelect options={sources.map(s => ({ label: s.name, value: s.id }))} value={field.value} onValueChange={field.onChange} placeholder="Select source Medium" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </>
                                ) : (
                                    <FormField control={form.control as any} name="combined_source" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-bold uppercase text-foreground/80">Source Medium <span className="text-red-500">*</span></FormLabel>
                                            <FormControl><SearchableSelect options={[{ label: "Manual", value: "manual" }, { label: "Auto", value: "auto" }, ...sources.map(s => ({ label: s.name, value: s.id }))]} value={field.value} onValueChange={field.onChange} placeholder="Select Source" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                )}
                                <FormField control={form.control as any} name="industry_id" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-foreground/80">Industry</FormLabel>
                                        <FormControl><SearchableSelect options={industries.map(i => ({ label: i.name, value: i.id }))} value={field.value} onValueChange={field.onChange} placeholder="Select" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                {isTravel && (
                                <FormField control={form.control as any} name="experience_id" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-foreground/80">Experience</FormLabel>
                                        <FormControl><SearchableSelect options={experiences.map(e => ({ label: e.name, value: e.id }))} value={field.value} onValueChange={field.onChange} placeholder="Select" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                )}
                                <FormField control={form.control as any} name="company" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-foreground/80">Company</FormLabel>
                                        <FormControl><Input placeholder="Acme Inc." className="h-8 bg-background text-xs" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="title" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-foreground/80">Job Title</FormLabel>
                                        <FormControl><Input placeholder="Manager" className="h-8 bg-background text-xs" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="website" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-foreground/80">Website</FormLabel>
                                        <FormControl><Input placeholder="https://..." className="h-8 bg-background text-xs" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="campaign_name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-foreground/80">Campaign</FormLabel>
                                        <FormControl><Input placeholder="Summer Sale" className="h-8 bg-background text-xs" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>

                        {/* Section: Location */}
                        <div>
                            <div className="mb-3 flex items-center gap-2 border-b border-border pb-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                <h3 className="text-sm font-semibold text-foreground">Location</h3>
                            </div>
                            <div className="grid gap-3 grid-cols-1">
                                <LocationFields form={form} />
                                <FormField control={form.control as any} name="street" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-foreground/80">Street Address</FormLabel>
                                        <FormControl><Input placeholder="123 Main St" className="h-8 bg-background text-xs" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>

                        {/* Section: Industry-Specific Fields */}
                        <IndustryLeadFields industry={industry} form={form} />
                    </div>

                    {/* Sticky footer */}
                    <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t bg-card/95 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/85">
                        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isLoading}>
                            Close
                        </Button>
                        <LoadingButton type="submit" isLoading={isLoading} className="bg-blue-600 hover:bg-blue-700 h-8 px-3 text-sm">
                            {leadId ? "Update" : "Save"}
                        </LoadingButton>
                    </div>
                </form>
            </Form>
        );
    }

    return (
        <Form {...(form as any)} className="w-full">
            <form
                onSubmit={form.handleSubmit(onSubmit as any)}
                className="w-full space-y-6 [&_[data-slot=form-label]]:!text-foreground/85 [&_input]:text-foreground [&_textarea]:text-foreground [&_[data-slot=select-trigger]]:text-foreground"
            >
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    <div className="space-y-6 xl:col-span-8">
                        {/* Client Information Section */}
                        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b py-4">
                                <div className="flex items-center gap-2">
                                    <User className="h-5 w-5 text-blue-600" />
                                    <div>
                                        <CardTitle className="text-lg font-semibold" title="Primary contact details for this lead">Client Information</CardTitle>
                                        <CardDescription>Primary contact details for this lead</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    <FormField
                                        control={form.control as any}
                                        name="salutation"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Salutation</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {salutations.map((s) => (
                                                            <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control as any}
                                        name="first_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">First Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="John" className="h-9" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control as any}
                                        name="last_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">
                                                    Last Name <span className="text-red-500">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Doe" className="h-9" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control as any}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">
                                                    Email <span className="text-red-500">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input type="email" placeholder="john@example.com" className="h-9" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control as any}
                                        name="phone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">
                                                    Phone <span className="text-red-500">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <PhoneInput {...field} placeholder="Phone number" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control as any}
                                        name="mobile"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">
                                                    Mobile <span className="text-red-500">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <PhoneInput {...field} placeholder="Mobile number" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control as any}
                                        name="segment"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Segment</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="B2C">B2C (Individual)</SelectItem>
                                                        <SelectItem value="B2B">B2B (Corporate)</SelectItem>
                                                        <SelectItem value="B2B_DIRECT">B2B</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Company & Source Section */}
                        <Card className="border-slate-200 dark:border-slate-800 shadow-sm h-full">
                            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b py-4">
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-blue-600" />
                                    <div>
                                        <CardTitle className="text-lg font-semibold">Company & Source</CardTitle>
                                        <CardDescription>Where this lead came from</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    <FormField
                                        control={form.control as any}
                                        name="lead_status_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Lead Status</FormLabel>
                                                <FormControl>
                                                    <SearchableSelect
                                                        options={statuses.map(s => ({ label: s.name, value: s.id }))}
                                                        value={field.value}
                                                        onValueChange={field.onChange}
                                                        placeholder="Select Status"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control as any}
                                        name="industry_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Industry</FormLabel>
                                                <FormControl>
                                                    <SearchableSelect
                                                        options={industries.map(i => ({ label: i.name, value: i.id }))}
                                                        value={field.value}
                                                        onValueChange={field.onChange}
                                                        placeholder="Select Industry"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {isTravel && (
                                    <FormField
                                        control={form.control as any}
                                        name="experience_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Experience</FormLabel>
                                                <FormControl>
                                                    <SearchableSelect
                                                        options={experiences.map(e => ({ label: e.name, value: e.id }))}
                                                        value={field.value}
                                                        onValueChange={field.onChange}
                                                        placeholder="Select Experience"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    )}
                                    <FormField
                                        control={form.control as any}
                                        name="company"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">
                                                    Company Name
                                                </FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Acme Inc." className="h-9" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control as any}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Job Title</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Manager" className="h-9" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {isTravel ? (
                                        <>
                                            <FormField
                                                control={form.control as any}
                                                name="creation_type"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">
                                                            Creation <span className="text-red-500">*</span>
                                                        </FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="h-9">
                                                                    <SelectValue placeholder="Select source" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="manual">Manual</SelectItem>
                                                                <SelectItem value="auto">Auto</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control as any}
                                                name="combined_source"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">
                                                            Source <span className="text-red-500">*</span>
                                                        </FormLabel>
                                                        <FormControl>
                                                            <SearchableSelect
                                                                options={sources.map(s => ({ label: s.name, value: s.id }))}
                                                                value={field.value}
                                                                onValueChange={field.onChange}
                                                                placeholder="Select Source"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control as any}
                                                name="source_medium"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">
                                                            Source Medium
                                                        </FormLabel>
                                                        <FormControl>
                                                            <SearchableSelect
                                                                options={source_mediums.map(s => ({ label: s.name, value: s.name }))}
                                                                value={field.value}
                                                                onValueChange={field.onChange}
                                                                placeholder="Select Source Medium"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </>
                                    ) : (
                                        <>
                                        <FormField
                                            control={form.control as any}
                                            name="combined_source"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] font-bold uppercase text-slate-500">
                                                        Source <span className="text-red-500">*</span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <SearchableSelect
                                                            options={[
                                                                { label: "Manual", value: "manual" },
                                                                { label: "Auto", value: "auto" },
                                                                ...sources.map(s => ({ label: s.name, value: s.id }))
                                                            ]}
                                                            value={field.value}
                                                            onValueChange={field.onChange}
                                                            placeholder="Select Source"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control as any}
                                            name="source_medium"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] font-bold uppercase text-slate-500">
                                                        Source Medium
                                                    </FormLabel>
                                                    <FormControl>
                                                        <SearchableSelect
                                                            options={source_mediums.map(s => ({ label: s.name, value: s.name }))}
                                                            value={field.value}
                                                            onValueChange={field.onChange}
                                                            placeholder="Select Source Medium"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        </>
                                    )}
                                    <FormField
                                        control={form.control as any}
                                        name="campaign_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Campaign</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Summer Sale" className="h-9" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control as any}
                                        name="website"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Website</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="https://..." className="h-9" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control as any}
                                        name="no_employees"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">No. Employees</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="10" className="h-9" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6 xl:col-span-4">
                        {/* Location Section */}
                        <Card className="border-slate-200 dark:border-slate-800 shadow-sm h-full">
                            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b py-4">
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-5 w-5 text-blue-600" />
                                    <div>
                                        <CardTitle className="text-lg font-semibold">Location</CardTitle>
                                        <CardDescription>Target area and address</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="grid gap-4 grid-cols-1">
                                    <LocationFields form={form} />
                                    <FormField
                                        control={form.control as any}
                                        name="street"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Street Address</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="123 Main St" className="h-9" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Industry-Specific Fields */}
                        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                            <CardContent className="p-4">
                                <IndustryLeadFields industry={industry} form={form} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onCancel ? onCancel() : router.back()}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <LoadingButton 
                        type="submit" 
                        isLoading={isLoading}
                        loadingText={leadId ? "Updating..." : "Creating..."}
                    >
                        {leadId ? "Update Lead" : "Create Lead"}
                    </LoadingButton>
                </div>
            </form>
        </Form>
    );
}
