"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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


function LocationFields({ form }: { form: any }) {
    const [countries, setCountries] = useState<Country[]>([]);
    const [states, setStates] = useState<State[]>([]);
    const [cities, setCities] = useState<City[]>([]);

    const [loadingCountries, setLoadingCountries] = useState(false);
    const [loadingStates, setLoadingStates] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);

    const [countryOpen, setCountryOpen] = useState(false);
    const [stateOpen, setStateOpen] = useState(false);
    const [cityOpen, setCityOpen] = useState(false);

    const [searchTermCountry, setSearchTermCountry] = useState("");
    const [searchTermState, setSearchTermState] = useState("");
    const [searchTermCity, setSearchTermCity] = useState("");

    // Initial load and edit mode support
    useEffect(() => {
        const init = async () => {
            setLoadingCountries(true);
            try {
                const res = await locationService.getCountries();
                if (res && res.countries) {
                    setCountries(res.countries);
                    const currentCountryName = form.getValues("country");
                    const currentStateName = form.getValues("state");

                    if (currentCountryName) {
                        const country = res.countries.find((c: Country) => c.name === currentCountryName);
                        if (country) {
                            const statesRes = await locationService.getStates(country.id);
                            if (statesRes && statesRes.states) {
                                setStates(statesRes.states);
                                if (currentStateName) {
                                    const state = statesRes.states.find((s: State) => s.name === currentStateName);
                                    if (state) {
                                        const citiesRes = await locationService.getCitiesByState(state.id);
                                        if (citiesRes && citiesRes.cities) {
                                            setCities(citiesRes.cities);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Location initialization failed", err);
            } finally {
                setLoadingCountries(false);
            }
        };
        init();
    }, []); // Run only once

    const filteredCountries = countries.filter((c: Country) =>
        c.name.toLowerCase().includes(searchTermCountry.toLowerCase())
    );
    const filteredStates = states.filter((s: State) =>
        s.name.toLowerCase().includes(searchTermState.toLowerCase())
    );
    const filteredCities = cities.filter((c: City) =>
        c.name.toLowerCase().includes(searchTermCity.toLowerCase())
    );

    return (
        <>
            <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Country *</FormLabel>
                        <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className={cn(
                                            "w-full justify-between",
                                            !field.value && "text-muted-foreground"
                                        )}
                                    >
                                        {field.value
                                            ? countries.find((c: Country) => c.name === field.value)?.name || field.value
                                            : "Select country"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0">
                                <Command shouldFilter={false}>
                                    <CommandInput
                                        placeholder="Search country..."
                                        onValueChange={setSearchTermCountry}
                                    />
                                    <CommandList>
                                        <CommandEmpty>No country found.</CommandEmpty>
                                        <CommandGroup>
                                            {filteredCountries.map((country) => (
                                                <CommandItem
                                                    value={country.name}
                                                    key={country.id}
                                                    onSelect={() => {
                                                        const prev = field.value;
                                                        field.onChange(country.name);
                                                        if (prev !== country.name) {
                                                            form.setValue("state", "");
                                                            form.setValue("city", "");
                                                            setStates([]);
                                                            setCities([]);
                                                            setLoadingStates(true);
                                                            locationService.getStates(country.id).then(r => {
                                                                setStates(r?.states || []);
                                                                setLoadingStates(false);
                                                            });
                                                        }
                                                        setCountryOpen(false);
                                                    }}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", country.name === field.value ? "opacity-100" : "opacity-0")} />
                                                    {country.name}
                                                </CommandItem>
                                            ))}
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
                name="state"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>State *</FormLabel>
                        <Popover open={stateOpen} onOpenChange={setStateOpen}>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        disabled={!form.watch("country") || loadingStates}
                                        className={cn(
                                            "w-full justify-between",
                                            !field.value && "text-muted-foreground"
                                        )}
                                    >
                                        {field.value
                                            ? states.find((s) => s.name === field.value)?.name || field.value
                                            : "Select state"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0">
                                <Command shouldFilter={false}>
                                    <CommandInput
                                        placeholder="Search state..."
                                        onValueChange={setSearchTermState}
                                    />
                                    <CommandList>
                                        <CommandEmpty>No state found.</CommandEmpty>
                                        <CommandGroup>
                                            {filteredStates.map((state) => (
                                                <CommandItem
                                                    value={state.name}
                                                    key={state.id}
                                                    onSelect={() => {
                                                        const prev = field.value;
                                                        field.onChange(state.name);
                                                        if (prev !== state.name) {
                                                            form.setValue("city", "");
                                                            setCities([]);
                                                            setLoadingCities(true);
                                                            locationService.getCitiesByState(state.id).then(r => {
                                                                setCities(r?.cities || []);
                                                                setLoadingCities(false);
                                                            });
                                                        }
                                                        setStateOpen(false);
                                                    }}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", state.name === field.value ? "opacity-100" : "opacity-0")} />
                                                    {state.name}
                                                </CommandItem>
                                            ))}
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
                name="city"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>City *</FormLabel>
                        <Popover open={cityOpen} onOpenChange={setCityOpen}>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        disabled={!form.watch("state") || loadingCities}
                                        className={cn(
                                            "w-full justify-between",
                                            !field.value && "text-muted-foreground"
                                        )}
                                    >
                                        {field.value
                                            ? cities.find((c) => c.name === field.value)?.name || field.value
                                            : "Select city"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0">
                                <Command shouldFilter={false}>
                                    <CommandInput
                                        placeholder="Search city..."
                                        onValueChange={setSearchTermCity}
                                    />
                                    <CommandList>
                                        <CommandEmpty>No city found.</CommandEmpty>
                                        <CommandGroup>
                                            {filteredCities.map((city) => (
                                                <CommandItem
                                                    value={city.name}
                                                    key={city.id}
                                                    onSelect={() => {
                                                        field.onChange(city.name);
                                                        setCityOpen(false);
                                                    }}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", city.name === field.value ? "opacity-100" : "opacity-0")} />
                                                    {city.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
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
        .refine(val => !val || /^\+?[1-9]\d{1,14}$/.test(val), {
            message: "Invalid phone format. Please use a valid number (e.g. +91 9876543210).",
        }),
    mobile: z.string()
        .optional()
        .or(z.literal(""))
        .refine(val => !val || /^\+?[1-9]\d{1,14}$/.test(val), {
            message: "Invalid mobile format. Please use a valid number (e.g. +91 9876543210).",
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
    no_of_nights: z.coerce.number().int().min(1, { message: "Number of nights must be at least 1." }),
    no_of_adults: z.coerce.number().int().min(1, { message: "Number of adults must be at least 1." }),
    no_of_pax: z.coerce.number().int().min(1, { message: "Number of pax must be at least 1." }),
    no_of_childs: z.coerce.number().int().min(0).optional(),
    no_of_infants: z.coerce.number().int().min(0).optional(),
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
}: LeadFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [availableDestinations, setAvailableDestinations] = useState<Destination[]>([]);
    const [destinationOpen, setDestinationOpen] = useState(false);
    const [destSearch, setDestSearch] = useState("");

    useEffect(() => {
        destinationsService.getDestinations({ limit: 1000 }).then(res => {
            setAvailableDestinations(res.destinations);
        }).catch(err => console.error("Failed to fetch destinations", err));
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
            form.setValue("no_of_pax", total as any);
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
                    router.push("/leads");
                    router.refresh();
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

    return (
        <Form {...(form as any)} className="w-full">
            <form
                onSubmit={form.handleSubmit(onSubmit as any, (errors) => {
                    console.error("Validation errors:", errors);
                    toast.error("Please fix the validation errors in the form.");
                })}
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
                                                    <Input placeholder="+1 234..." className="h-9 bg-white" {...field} />
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
                                                    <Input placeholder="+1 234..." className="h-9 bg-white" {...field} />
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
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-9 bg-white">
                                                            <SelectValue placeholder="Select Status" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {statuses.map((status) => (
                                                            <SelectItem key={status.id} value={status.id}>
                                                                {status.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
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
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-9 bg-white">
                                                            <SelectValue placeholder="Select Industry" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {industries.map((industry) => (
                                                            <SelectItem key={industry.id} value={industry.id}>
                                                                {industry.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control as any}
                                        name="company"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Company Name</FormLabel>
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
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-9 bg-white">
                                                            <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="manual">Manual</SelectItem>
                                                        <SelectItem value="auto">Auto</SelectItem>
                                                        {sources.map((source) => (
                                                            <SelectItem key={source.id} value={source.id}>
                                                                {source.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
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
                                                    <Input type="number" placeholder="2" readOnly className="h-9 bg-slate-50 cursor-not-allowed" {...field} />
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
                                                    Fixed Package?
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
                                                                        "Select..."
                                                                    )}
                                                                </div>
                                                                <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-full p-0 md:w-[500px]" align="start">
                                                        <Command>
                                                            <CommandInput
                                                                placeholder="Search..."
                                                                className="h-8"
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
                                                                                className="text-sm py-1"
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
                                                                                        "mr-2 h-3 w-3",
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
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
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
