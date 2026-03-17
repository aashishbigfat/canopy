"use client";

import axios from "axios";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
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
import { Lead, LeadCreateData, LeadStatus, Source, Industry, Rating } from "../types";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { ErrorHandler, showSuccessToast } from "@/lib/error-handler";
import { logger } from "@/lib/logger";
import { LoadingButton } from "@/components/ui/loading";
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
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Country *</FormLabel>
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
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">State *</FormLabel>
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
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">City *</FormLabel>
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

type LeadFormValues = z.infer<typeof leadFormSchema>;

interface LeadFormProps {
    initialData?: Lead;
    leadId?: string;
    statuses?: LeadStatus[];
    sources?: Source[];
    industries?: Industry[];
    experiences?: { id: string; name: string }[];
    /** Called after successful create/update instead of router.push */
    onSuccess?: () => void;
    /** Called when cancel is clicked instead of router.back */
    onCancel?: () => void;
    /** When true, renders a compact single-column layout for drawer panels */
    isDrawer?: boolean;
}

const PUBLIC_EMAIL_DOMAINS = [
    "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com",
    "me.com", "live.com", "msn.com", "aol.com", "gmail.co.uk", "yahoo.co.in"
];

export function LeadForm({
    initialData,
    leadId,
    statuses = [],
    sources = [],
    industries = [],
    experiences = [],
    onSuccess,
    onCancel,
    isDrawer = false,
}: LeadFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [availableDestinations, setAvailableDestinations] = useState<Destination[]>([]);

    const [loadingDestinations, setLoadingDestinations] = useState(false);

    useEffect(() => {
        setLoadingDestinations(true);
        destinationsService.getDestinations({ limit: 20 }).then(res => {
            setAvailableDestinations(res.destinations);
        }).catch(err => console.error("Failed to fetch destinations", err))
          .finally(() => setLoadingDestinations(false));
    }, []);

    const handleDestinationSearch = useCallback(async (query: string, signal?: AbortSignal) => {
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
    }, []);

    const form = useForm<LeadFormValues>({
        resolver: zodResolver(leadFormSchema) as any,
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
            combined_source: initialData?.source_id || initialData?.creation_type || "manual",
            industry_id: initialData?.industry_id || "",
            street: initialData?.street || "",
            city: initialData?.city || "",
            state: initialData?.state || "",
            zip: initialData?.zip || "",
            country: initialData?.country || "",
            campaign_name: initialData?.campaign_name || "",
            travel_date: initialData?.travel_date || "",
            no_of_nights: initialData?.no_of_nights?.toString() ?? ("" as any),
            no_of_adults: initialData?.no_of_adults?.toString() ?? ("1" as any),
            no_of_pax: initialData?.no_of_pax?.toString() ?? ("1" as any),
            no_of_childs: initialData?.no_of_childs?.toString() ?? ("0" as any),
            no_of_infants: initialData?.no_of_infants?.toString() ?? ("0" as any),
            is_fixed: initialData?.is_fixed || false,
            destinations: initialData?.destinations?.join(", ") || "",
            segment: initialData?.segment || "B2C",
            creation_type: (initialData?.creation_type as "manual" | "auto") || "manual",
            experience_id: initialData?.experience_id || "",
        },
    });

    const email = form.watch("email");

    const adults = form.watch("no_of_adults") || 0;
    const childs = form.watch("no_of_childs") || 0;
    const infants = form.watch("no_of_infants") || 0;

    useEffect(() => {
        const total = (Number(adults) || 0) + (Number(childs) || 0) + (Number(infants) || 0);
        if (total > 0) {
            form.setValue("no_of_pax", total.toString() as any);
        }
    }, [adults, childs, infants, form]);

    useEffect(() => {
        if (!email || !email.includes("@")) return;

        const domain = email.split("@")[1]?.toLowerCase();
        if (!domain) return;

        const isPublic = PUBLIC_EMAIL_DOMAINS.some(d => domain.endsWith(d));
        const detectedSegment = isPublic ? "B2C" : "B2B";

        form.setValue("segment", detectedSegment);
    }, [email, form]);

    const handleBackendErrors = (error: any) => {
        if (error.type === ErrorType.VALIDATION && error.details?.detail) {
            const details = error.details.detail;
            details.forEach((err: any) => {
                // loc is usually ["body", "field_name"] or ["query", "field_name"]
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



    const onSubmit = async (data: any) => {
        setIsLoading(true);
        try {
            const payload: LeadCreateData = {
                salutation: data.salutation,
                first_name: data.first_name || "",
                last_name: data.last_name,
                company: data.company,
                email: data.email,
                phone: data.phone,
                mobile: data.mobile,
                no_employees: data.no_employees ? parseInt(data.no_employees) : undefined,
                website: data.website,
                title: data.title,
                lead_status_id: data.lead_status_id || undefined,
                source_id: ["manual", "auto"].includes(data.combined_source) ? undefined : data.combined_source,
                source_medium: data.source_medium, // Keep medium if it was already there or if we decide to use it somehow
                industry_id: data.industry_id || undefined,
                street: data.street || undefined,
                city: data.city,
                state: data.state,
                zip: data.zip,
                country: data.country,
                campaign_name: data.campaign_name,
                travel_date: data.travel_date,
                no_of_nights: Number(data.no_of_nights),
                no_of_adults: Number(data.no_of_adults),
                no_of_pax: Number(data.no_of_pax),
                no_of_childs: data.no_of_childs ? Number(data.no_of_childs) : 0,
                no_of_infants: data.no_of_infants ? Number(data.no_of_infants) : 0,
                is_fixed: data.is_fixed,
                destinations: data.destinations.split(",").map((d: string) => d.trim()).filter(Boolean),
                segment: data.segment,
                creation_type: ["manual", "auto"].includes(data.combined_source) ? data.combined_source : "manual",
                experience_id: data.experience_id || undefined,
            };

            await ErrorHandler.withErrorHandling(async () => {
                try {
                    if (leadId) {
                        await leadsService.updateLead(leadId, payload);
                        showSuccessToast("Lead updated successfully");
                    } else {
                        await leadsService.createLead(payload);
                        showSuccessToast("Lead created successfully");
                    }
                    if (onSuccess) {
                        onSuccess();
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
            setIsLoading(false);
        }
    }

    if (isDrawer) {
        return (
            <Form {...(form as any)} className="w-full">
                <form
                    onSubmit={form.handleSubmit(onSubmit as any)}
                    className="w-full"
                >
                    <div className="px-5 py-4 space-y-5">
                        {/* Section: Client Information */}
                        <div>
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-blue-100">
                                <User className="h-4 w-4 text-blue-600" />
                                <h3 className="text-sm font-semibold text-slate-700">Client Information</h3>
                            </div>
                            <div className="grid gap-3 grid-cols-2">
                                <FormField control={form.control as any} name="salutation" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Salutation</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger className="h-8 bg-white text-xs"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="Mr.">Mr.</SelectItem>
                                                <SelectItem value="Mrs.">Mrs.</SelectItem>
                                                <SelectItem value="Ms.">Ms.</SelectItem>
                                                <SelectItem value="Dr.">Dr.</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="segment" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Segment</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger className="h-8 bg-white text-xs"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="B2C">B2C (Individual)</SelectItem>
                                                <SelectItem value="B2B">B2B (Corporate)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="first_name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">First Name</FormLabel>
                                        <FormControl><Input placeholder="John" className="h-8 bg-white text-xs" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="last_name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Last Name <span className="text-red-500">*</span></FormLabel>
                                        <FormControl><Input placeholder="Doe" className="h-8 bg-white text-xs" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="email" render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Email <span className="text-red-500">*</span></FormLabel>
                                        <FormControl><Input type="email" placeholder="john@example.com" className="h-8 bg-white text-xs" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="phone" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Phone <span className="text-red-500">*</span></FormLabel>
                                        <FormControl><PhoneInput {...field} placeholder="Phone" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="mobile" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Mobile <span className="text-red-500">*</span></FormLabel>
                                        <FormControl><PhoneInput {...field} placeholder="Mobile" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>

                        {/* Section: Company & Source */}
                        <div>
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-blue-100">
                                <Building2 className="h-4 w-4 text-blue-600" />
                                <h3 className="text-sm font-semibold text-slate-700">Company & Source</h3>
                            </div>
                            <div className="grid gap-3 grid-cols-2">
                                <FormField control={form.control as any} name="lead_status_id" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Lead Status</FormLabel>
                                        <FormControl><SearchableSelect options={statuses.map(s => ({ label: s.name, value: s.id }))} value={field.value} onValueChange={field.onChange} placeholder="Select Status" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="combined_source" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Source Medium <span className="text-red-500">*</span></FormLabel>
                                        <FormControl><SearchableSelect options={[{ label: "Manual", value: "manual" }, { label: "Auto", value: "auto" }, ...sources.map(s => ({ label: s.name, value: s.id }))]} value={field.value} onValueChange={field.onChange} placeholder="Select Source" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="industry_id" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Industry</FormLabel>
                                        <FormControl><SearchableSelect options={industries.map(i => ({ label: i.name, value: i.id }))} value={field.value} onValueChange={field.onChange} placeholder="Select" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="experience_id" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Experience</FormLabel>
                                        <FormControl><SearchableSelect options={experiences.map(e => ({ label: e.name, value: e.id }))} value={field.value} onValueChange={field.onChange} placeholder="Select" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="company" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Company</FormLabel>
                                        <FormControl><Input placeholder="Acme Inc." className="h-8 bg-white text-xs" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="title" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Job Title</FormLabel>
                                        <FormControl><Input placeholder="Manager" className="h-8 bg-white text-xs" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="website" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Website</FormLabel>
                                        <FormControl><Input placeholder="https://..." className="h-8 bg-white text-xs" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="campaign_name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Campaign</FormLabel>
                                        <FormControl><Input placeholder="Summer Sale" className="h-8 bg-white text-xs" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>

                        {/* Section: Location */}
                        <div>
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-blue-100">
                                <MapPin className="h-4 w-4 text-blue-600" />
                                <h3 className="text-sm font-semibold text-slate-700">Location</h3>
                            </div>
                            <div className="grid gap-3 grid-cols-1">
                                <LocationFields form={form} />
                                <FormField control={form.control as any} name="street" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Street Address</FormLabel>
                                        <FormControl><Input placeholder="123 Main St" className="h-8 bg-white text-xs" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>

                        {/* Section: Travel Requirements */}
                        <div>
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-blue-100">
                                <Globe className="h-4 w-4 text-blue-600" />
                                <h3 className="text-sm font-semibold text-slate-700">Travel Requirements</h3>
                            </div>
                            <div className="grid gap-3 grid-cols-2">
                                <FormField control={form.control as any} name="travel_date" render={({ field }) => (
                                    <FormItem className="flex flex-col col-span-2">
                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Travel Date <span className="text-red-500">*</span></FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant="outline" className={cn("h-8 pl-3 text-left font-normal bg-white text-xs", !field.value && "text-muted-foreground")}>
                                                        {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                                                        <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <DayPicker mode="single" captionLayout="dropdown" startMonth={new Date(1900, 0)} endMonth={new Date(2100, 11)} selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => { if (!date) return field.onChange(undefined); const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0'); field.onChange(`${y}-${m}-${d}`); }} disabled={(date) => { const today = new Date(); today.setHours(0,0,0,0); return date < today; }} initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="no_of_nights" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Nights <span className="text-red-500">*</span></FormLabel>
                                        <FormControl><Input type="number" placeholder="4" min={1} className="h-8 bg-white text-xs" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="no_of_adults" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Adults <span className="text-red-500">*</span></FormLabel>
                                        <FormControl><Input type="number" placeholder="2" min={1} className="h-8 bg-white text-xs" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="no_of_pax" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Total Pax</FormLabel>
                                        <FormControl><Input type="number" placeholder="2" min={1} className="h-8 bg-white text-xs" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="no_of_childs" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Childs</FormLabel>
                                        <FormControl><Input type="number" placeholder="0" min={0} className="h-8 bg-white text-xs" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="no_of_infants" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Infants</FormLabel>
                                        <FormControl><Input type="number" placeholder="0" min={0} className="h-8 bg-white text-xs" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="is_fixed" render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-2 bg-slate-50/50 h-8 col-span-2">
                                        <FormControl><Input type="checkbox" className="h-3 w-3" checked={field.value} onChange={field.onChange} /></FormControl>
                                        <FormLabel className="text-xs font-medium cursor-pointer mb-0 pb-0">Fixed Departure?</FormLabel>
                                    </FormItem>
                                )} />
                                <FormField control={form.control as any} name="destinations" render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Destinations <span className="text-red-500">*</span></FormLabel>
                                        <SearchableSelect options={availableDestinations.map(d => ({ label: d.name, value: d.name }))} value="" onValueChange={(val) => { if (!val) return; const current = field.value ? field.value.split(", ") : []; if (!current.includes(val)) { field.onChange([...current, val].join(", ")); } }} onSearch={handleDestinationSearch} placeholder="Add destination..." isLoading={loadingDestinations} />
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {field.value ? field.value.split(", ").map((dest: string) => (
                                                <Badge key={dest} variant="secondary" className="rounded-sm px-1 font-normal text-[10px]">
                                                    {dest}
                                                    <span className="ml-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); field.onChange(field.value.split(", ").filter((d: string) => d !== dest).join(", ")); }}>
                                                        <X className="h-2 w-2 text-muted-foreground hover:text-foreground" />
                                                    </span>
                                                </Badge>
                                            )) : null}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>
                    </div>

                    {/* Sticky footer */}
                    <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-3 flex justify-end gap-3">
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
                className="w-full space-y-6"
            >
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    <div className="space-y-6 xl:col-span-8">
                        {/* Client Information Section */}
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader className="bg-slate-50/50 border-b py-4">
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
                                                        <SelectTrigger className="h-9 bg-white">
                                                            <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Mr.">Mr.</SelectItem>
                                                        <SelectItem value="Mrs.">Mrs.</SelectItem>
                                                        <SelectItem value="Ms.">Ms.</SelectItem>
                                                        <SelectItem value="Dr.">Dr.</SelectItem>
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
                                                    <Input placeholder="John" className="h-9 bg-white" {...field} />
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
                                                    <Input placeholder="Doe" className="h-9 bg-white" {...field} />
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
                                                    <Input type="email" placeholder="john@example.com" className="h-9 bg-white" {...field} />
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
                                                        <SelectTrigger className="h-9 bg-white">
                                                            <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="B2C">B2C (Individual)</SelectItem>
                                                        <SelectItem value="B2B">B2B (Corporate)</SelectItem>
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
                        <Card className="border-slate-200 shadow-sm h-full">
                            <CardHeader className="bg-slate-50/50 border-b py-4">
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
                                    <FormField
                                        control={form.control as any}
                                        name="company"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">
                                                    Company Name
                                                </FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Acme Inc." className="h-9 bg-white" {...field} />
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
                                                    <Input placeholder="Manager" className="h-9 bg-white" {...field} />
                                                </FormControl>
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
                                                    Source Medium <span className="text-red-500">*</span>
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
                                        name="campaign_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Campaign</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Summer Sale" className="h-9 bg-white" {...field} />
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
                                                    <Input placeholder="https://..." className="h-9 bg-white" {...field} />
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
                                                    <Input type="number" placeholder="10" className="h-9 bg-white" {...field} />
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
                        <Card className="border-slate-200 shadow-sm h-full">
                            <CardHeader className="bg-slate-50/50 border-b py-4">
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
                                                    <Input placeholder="123 Main St" className="h-9 bg-white" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Travel Requirements Section */}
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader className="bg-slate-50/50 border-b py-3">
                                <div className="flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-blue-600" />
                                    <div>
                                        <CardTitle className="text-base font-semibold">Travel Requirements</CardTitle>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="grid gap-4 grid-cols-2">
                                    <FormField
                                        control={form.control as any}
                                        name="travel_date"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col col-span-2">
                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">
                                                    Travel Date <span className="text-red-500">*</span>
                                                </FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant={"outline"}
                                                                className={cn(
                                                                    "h-9 pl-3 text-left font-normal bg-white",
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
                                                        <DayPicker
                                                            mode="single"
                                                            captionLayout="dropdown"
                                                            startMonth={new Date(1900, 0)}
                                                            endMonth={new Date(2100, 11)}
                                                            selected={field.value ? new Date(field.value) : undefined}
                                                            onSelect={(date) => {
                                                                if (!date) return field.onChange(undefined);
                                                                // Use local date to avoid timezone issues
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
                                        control={form.control as any}
                                        name="no_of_nights"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">
                                                    Nights <span className="text-red-500">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="4" min={1} className="h-9 bg-white" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control as any}
                                        name="no_of_adults"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">
                                                    Adults <span className="text-red-500">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="2" min={1} className="h-9 bg-white" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control as any}
                                        name="no_of_pax"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">
                                                    Total Pax
                                                </FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="2" min={1} className="h-9 bg-white" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control as any}
                                        name="no_of_childs"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">
                                                    Childs
                                                </FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="0" min={0} className="h-9 bg-white" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control as any}
                                        name="no_of_infants"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">
                                                    Infants
                                                </FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="0" min={0} className="h-9 bg-white" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control as any}
                                        name="is_fixed"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-2 shadow-sm bg-slate-50/50 mt-6 lg:mt-0 h-9">
                                                <FormControl>
                                                    <Input
                                                        type="checkbox"
                                                        className="h-3 w-3"
                                                        checked={field.value}
                                                        onChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="text-xs font-medium cursor-pointer mb-0 pb-0">
                                                    Fixed Departure?
                                                </FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control as any}
                                        name="destinations"
                                        render={({ field }) => (
                                            <FormItem className="col-span-full">
                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">
                                                    Destinations <span className="text-red-500">*</span>
                                                </FormLabel>
                                                <SearchableSelect
                                                    options={availableDestinations.map(d => ({ label: d.name, value: d.name }))}
                                                    value=""
                                                    onValueChange={(val) => {
                                                        if (!val) return;
                                                        const current = field.value ? field.value.split(", ") : [];
                                                        if (!current.includes(val)) {
                                                            field.onChange([...current, val].join(", "));
                                                        }
                                                    }}
                                                    onSearch={handleDestinationSearch}
                                                    placeholder="Add destination..."
                                                    isLoading={loadingDestinations}
                                                    className="border-none shadow-none focus-visible:ring-0 p-0 h-auto"
                                                />
                                                <div className="flex flex-wrap gap-1 mt-2">
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
                                                    ) : null}
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
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
                    <LoadingButton type="submit" isLoading={isLoading}>
                        {leadId ? "Update Lead" : "Create Lead"}
                    </LoadingButton>
                </div>
            </form>
        </Form>
    );
}
