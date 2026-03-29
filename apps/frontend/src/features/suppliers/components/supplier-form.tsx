"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
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
import { Badge } from "@/components/ui/badge";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useCreateSupplier, useUpdateSupplier } from "@/features/suppliers/api/use-suppliers";
import { suppliersService } from "@/lib/api/services/suppliers.service";
import { locationService, Country, State, City } from "@/lib/api/services/locations.service";
import { destinationsService, Destination } from "@/lib/api/services/destinations.service";
import axios from "axios";
import { Supplier } from "@/features/suppliers/types";
import { ErrorHandler, ErrorType } from "@/lib/error-handler";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// More robust validation rules
const leadPhoneRegex = /^\+?\d{1,4}\s\d{10}$/;

const supplierFormSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    supplier_type: z.string().min(1, "Supplier type is required."),
    owner_id: z.string().optional(),
    contact_person_name: z.string().optional(),
    phone: z.string().min(1, "Phone is required.")
        .refine(val => leadPhoneRegex.test(val), {
            message: "Please select a country code and enter exactly a 10-digit number.",
        }),
    mobile: z.string().optional().or(z.literal(""))
        .refine(val => !val || leadPhoneRegex.test(val), {
            message: "Please select a country code and enter exactly a 10-digit number.",
        }),
    email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal("")),
    services: z.array(z.string()).optional(),
    
    // Service Area
    countries: z.array(z.string()).optional(),
    states: z.array(z.string()).optional(),
    service_cities: z.array(z.string()).optional(),
    destinations: z.array(z.string()).optional(),

    // Address
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional().or(z.literal(""))
        .refine(val => !val || /^\d+$/.test(val), {
            message: "Zip code must contain only numbers.",
        }),
    country: z.string().optional(),

    is_active: z.boolean().optional(),
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

interface SupplierFormProps {
    initialData?: Supplier;
    onSuccess?: () => void;
    onCancel?: () => void;
    isDrawer?: boolean;
}

const locationCache = {
    countries: new Map<string, any>(),
    states: new Map<string, any>(),
    cities: new Map<string, any>(),
};

export function SupplierForm({ initialData, onSuccess, onCancel, isDrawer = false }: SupplierFormProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const { toast } = useToast();
    const createSupplier = useCreateSupplier();
    const updateSupplier = useUpdateSupplier();
    const [isLoading, setIsLoading] = useState(false);
    const [metaData, setMetaData] = useState<{ 
        users: { id: string; name: string }[],
        services?: { id: string; name: string }[],
        current_user_name?: string
    } | null>(null);

    // States for Address Locations
    const [addrCountries, setAddrCountries] = useState<Country[]>([]);
    const [addrStates, setAddrStates] = useState<State[]>([]);
    const [addrCities, setAddrCities] = useState<City[]>([]);
    const [loadingAddrCountries, setLoadingAddrCountries] = useState(false);
    const [loadingAddrStates, setLoadingAddrStates] = useState(false);
    const [loadingAddrCities, setLoadingAddrCities] = useState(false);

    // States for Service Area Locations
    const [svcCountries, setSvcCountries] = useState<Country[]>([]);
    const [svcStates, setSvcStates] = useState<State[]>([]);
    const [svcCities, setSvcCities] = useState<City[]>([]);
    const [loadingSvcCountries, setLoadingSvcCountries] = useState(false);
    const [loadingSvcStates, setLoadingSvcStates] = useState(false);
    const [loadingSvcCities, setLoadingSvcCities] = useState(false);

    // Destinations Multi-select state
    const [availableDestinations, setAvailableDestinations] = useState<Destination[]>([]);
    const [destinationOpen, setDestinationOpen] = useState(false);
    const [destSearch, setDestSearch] = useState("");
    const [loadingDestinations, setLoadingDestinations] = useState(false);

    const form = useForm<SupplierFormValues>({
        resolver: zodResolver(supplierFormSchema),
        defaultValues: {
            name: initialData?.name || "",
            supplier_type: initialData?.supplier_type || "",
            owner_id: initialData?.owner_id || "",
            contact_person_name: initialData?.contact_person_name || "",
            phone: initialData?.phone || "",
            mobile: initialData?.mobile || "",
            email: initialData?.email || "",
            services: initialData?.services || [],
            countries: initialData?.countries || [],
            states: initialData?.states || [],
            service_cities: (initialData as any)?.service_cities || [],
            destinations: initialData?.destinations || [],
            street: initialData?.street || "",
            city: initialData?.city || "",
            state: initialData?.state || "",
            zip: initialData?.zip || "",
            country: initialData?.country || "",
            is_active: initialData?.is_active ?? true,
        },
    });

    // Initialize Metadata and Locations
    useEffect(() => {
        const fetchMetaData = async () => {
            try {
                const data = await suppliersService.getFormData();
                setMetaData(data);
            } catch (err) {
                console.error("Error fetching form metadata", err);
            }
        };
        fetchMetaData();

        // Load Countries for both sections
        const loadInitialCountries = async () => {
            setLoadingAddrCountries(true);
            setLoadingSvcCountries(true);
            try {
                let initialCountries: Country[] = [];
                const cacheKey = "popular";
                if (locationCache.countries.has(cacheKey)) {
                    initialCountries = locationCache.countries.get(cacheKey);
                } else {
                    const r = await locationService.getCountries(true);
                    locationCache.countries.set(cacheKey, r.countries);
                    initialCountries = r.countries;
                }
                
                // Add initial selections if not in popular
                const addrCountryName = form.getValues("country");
                const svcCountryName = form.getValues("countries")?.[0];

                let allNeededCountries = [...initialCountries];
                if (addrCountryName && !allNeededCountries.some(c => c.name === addrCountryName)) {
                    const res = await locationService.searchCountries(addrCountryName);
                    if (res.countries[0]) allNeededCountries.push(res.countries[0]);
                }
                if (svcCountryName && !allNeededCountries.some(c => c.name === svcCountryName)) {
                    const res = await locationService.searchCountries(svcCountryName);
                    if (res.countries[0]) allNeededCountries.push(res.countries[0]);
                }

                // Final deduplication by ID just in case
                const uniqueCountries = Array.from(new Map(allNeededCountries.map(c => [c.id, c])).values());

                setAddrCountries(uniqueCountries);
                setSvcCountries(uniqueCountries);

                // Load Initial States and Cities if any
                if (addrCountryName) {
                    const country = uniqueCountries.find(c => 
                        c.name.toLowerCase() === addrCountryName.toLowerCase() || 
                        c.code?.toLowerCase() === addrCountryName.toLowerCase()
                    );
                    if (country) {
                        if (country.name !== addrCountryName) {
                            form.setValue("country", country.name);
                        }
                        await loadStates(country.id, "address", form.getValues("state"), form.getValues("city"));
                    }
                }
                if (svcCountryName) {
                    const country = uniqueCountries.find(c => 
                        c.name.toLowerCase() === svcCountryName.toLowerCase() || 
                        c.code?.toLowerCase() === svcCountryName.toLowerCase()
                    );
                    if (country) {
                        if (country.name !== svcCountryName) {
                            form.setValue("countries", [country.name]);
                        }
                        await loadStates(country.id, "service", form.getValues("states")?.[0], form.getValues("service_cities")?.[0]);
                    }
                }

            } catch (err) {
                console.error("Location init error", err);
            } finally {
                setLoadingAddrCountries(false);
                setLoadingSvcCountries(false);
            }
        };

        const loadStates = async (countryId: string, type: "address" | "service", stateName?: string, cityName?: string) => {
            const setLoading = type === "address" ? setLoadingAddrStates : setLoadingSvcStates;
            const setStates = type === "address" ? setAddrStates : setSvcStates;
            setLoading(true);
            try {
                const res = await locationService.getStates(countryId);
                let states = res.states;
                if (stateName && !states.find(s => s.name === stateName)) {
                    const sSearch = await locationService.searchStates(stateName, countryId);
                    if (sSearch.states[0]) states = [...states, sSearch.states[0]];
                }
                setStates(states);

                if (stateName) {
                    const state = states.find(s => 
                        s.name.toLowerCase() === stateName.toLowerCase() || 
                        s.code?.toLowerCase() === stateName.toLowerCase()
                    );
                    if (state) {
                        if (state.name !== stateName) {
                            if (type === "address") form.setValue("state", state.name);
                            else form.setValue("states", [state.name]);
                        }
                        await loadCities(state.id, type, countryId, cityName);
                    }
                }
            } finally {
                setLoading(false);
            }
        };

        const loadCities = async (stateId: string, type: "address" | "service", countryId: string, cityName?: string) => {
            const setLoading = type === "address" ? setLoadingAddrCities : setLoadingSvcCities;
            const setCities = type === "address" ? setAddrCities : setSvcCities;
            setLoading(true);
            try {
                const res = await locationService.getCitiesByState(stateId);
                let cities = res.cities;
                if (cityName && !cities.find(c => c.name === cityName)) {
                    const cSearch = await locationService.searchCities(cityName, countryId, stateId);
                    if (cSearch.cities[0]) cities = [...cities, cSearch.cities[0]];
                }
                setCities(cities);
            } finally {
                setLoading(false);
            }
        };

        loadInitialCountries();

        // Load Destinations
        setLoadingDestinations(true);
        destinationsService.getDestinations({ limit: 1000 })
            .then(res => setAvailableDestinations(res.destinations))
            .catch(err => console.error(err))
            .finally(() => setLoadingDestinations(false));
            
    }, [form]);

    // Search handlers
    const handleLocationSearch = useCallback(async (query: string, type: "country" | "state" | "city", section: "address" | "service", signal?: AbortSignal) => {
        try {
            if (type === "country") {
                const setLoading = section === "address" ? setLoadingAddrCountries : setLoadingSvcCountries;
                const setCountries = section === "address" ? setAddrCountries : setSvcCountries;
                if (!query) {
                    const res = await locationService.getCountries(true, signal);
                    setCountries(res.countries);
                    return;
                }
                setLoading(true);
                const res = await locationService.searchCountries(query, signal);
                // Deduplicate search results
                setCountries(Array.from(new Map(res.countries.map(c => [c.id, c])).values()));
                setLoading(false);
            } else if (type === "state") {
                const sectionCountries = section === "address" ? addrCountries : svcCountries;
                const countryName = section === "address" ? form.getValues("country") : form.getValues("countries")?.[0];
                const country = sectionCountries.find(c => c.name === countryName);
                if (!country) return;

                const setLoading = section === "address" ? setLoadingAddrStates : setLoadingSvcStates;
                const setStates = section === "address" ? setAddrStates : setSvcStates;
                
                setLoading(true);
                const res = query 
                    ? await locationService.searchStates(query, country.id, signal)
                    : await locationService.getStates(country.id, signal);
                // Deduplicate search results
                setStates(Array.from(new Map(res.states.map(s => [s.id, s])).values()));
                setLoading(false);
            } else if (type === "city") {
                const sectionCountries = section === "address" ? addrCountries : svcCountries;
                const sectionStates = section === "address" ? addrStates : svcStates;
                const countryName = section === "address" ? form.getValues("country") : form.getValues("countries")?.[0];
                const stateName = section === "address" ? form.getValues("state") : form.getValues("states")?.[0];
                
                const country = sectionCountries.find(c => c.name === countryName);
                const state = sectionStates.find(s => s.name === stateName);
                if (!state) return;

                const setLoading = section === "address" ? setLoadingAddrCities : setLoadingSvcCities;
                const setCities = section === "address" ? setAddrCities : setSvcCities;

                setLoading(true);
                const res = query
                    ? await locationService.searchCities(query, country?.id, state.id, signal)
                    : await locationService.getCitiesByState(state.id, signal);
                // Deduplicate search results
                setCities(Array.from(new Map(res.cities.map(c => [c.id, c])).values()));
                setLoading(false);
            }
        } catch (error) {
            if (!axios.isCancel(error)) console.error(`${type} search error`, error);
        }
    }, [addrCountries, svcCountries, addrStates, svcStates, form]);

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

    const onSubmit = async (data: SupplierFormValues) => {
        setIsLoading(true);
        const startTime = Date.now();
        let isSuccess = false;
        try {
            await ErrorHandler.withErrorHandling(async () => {
                try {
                    const payload = { ...data };
                    // Ensure service_cities is correctly named for backend if needed
                    // (But I updated the backend to use service_cities)

                    if (initialData) {
                        await updateSupplier.mutateAsync({ id: initialData.id, data: payload as any });
                        toast({ title: "Success", description: "Supplier updated successfully" });
                    } else {
                        await createSupplier.mutateAsync(payload as any);
                        toast({ title: "Success", description: "Supplier created successfully" });
                    }
                    isSuccess = true;
                    
                    const elapsedTime = Date.now() - startTime;
                    if (elapsedTime < 2500) {
                        await new Promise(r => setTimeout(r, 2500 - elapsedTime));
                    }
                    
                    form.reset();
                    router.refresh();
                    if (onSuccess) onSuccess();
                } catch (error: any) {
                    const mapped = handleBackendErrors(ErrorHandler.parseError(error, "Failed to save supplier"));
                    if (!mapped) throw error;
                }
            }, "Failed to save supplier");
        } catch (error) {
            // Handled
        } finally {
            if (!isSuccess) {
                const elapsedTime = Date.now() - startTime;
                if (elapsedTime < 2500) {
                    await new Promise(r => setTimeout(r, 2500 - elapsedTime));
                }
                setIsLoading(false);
            }
        }
    };

    const serviceOptions = metaData?.services?.map(s => ({
        label: s.name,
        value: s.name
    })) || [];

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-4">
                {/* Supplier Information Section */}
                <div>
                    <h3 className="text-sm font-semibold bg-[#FFF9E5] text-[#333] py-2 px-3 mb-4 rounded-sm border-l-4 border-yellow-400">
                        Supplier Information
                    </h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Supplier Name <span className="text-red-500">*</span></FormLabel>
                                    <FormControl>
                                        <Input placeholder="Supplier Name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        {initialData ? (
                            <FormField
                                control={form.control}
                                name="owner_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Supplier Owner</FormLabel>
                                        <FormControl>
                                            <SearchableSelect
                                                options={metaData?.users.map(u => ({ label: u.name, value: u.id })) || []}
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                placeholder="Select Owner"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ) : (
                            <div className="flex flex-col space-y-2 mt-2">
                                <FormLabel>Supplier Owner</FormLabel>
                                <p className="text-sm border rounded-md px-3 py-2 bg-slate-50 text-slate-500 min-h-[40px] flex items-center">
                                    {session?.user?.name || "Automatically assigned to you"}
                                </p>
                            </div>
                        )}

                        <FormField
                            control={form.control}
                            name="supplier_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Supplier Type<span className="text-red-500">*</span></FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="DMC">DMC</SelectItem>
                                            <SelectItem value="Airlines">Airlines</SelectItem>
                                            <SelectItem value="Hotel">Hotel</SelectItem>
                                            <SelectItem value="Tour Operator">Tour Operator</SelectItem>
                                            <SelectItem value="Visa Facilitator">Visa Facilitator</SelectItem>
                                            <SelectItem value="Transporters">Transporters (Cab/ Taxi)</SelectItem>
                                            <SelectItem value="Embassy">Embassy</SelectItem>
                                            <SelectItem value="Travel Insurance">Travel Insurance</SelectItem>
                                            <SelectItem value="Miscellaneous">Miscellaneous</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="contact_person_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contact Person</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Contact Person" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone <span className="text-red-500">*</span></FormLabel>
                                    <FormControl>
                                        <PhoneInput placeholder="Phone number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="mobile"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Mobile</FormLabel>
                                    <FormControl>
                                        <PhoneInput placeholder="Mobile number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email<span className="text-red-500">*</span></FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. hello@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="col-span-2">
                            <FormField
                                control={form.control}
                                name="services"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Service(s)</FormLabel>
                                        <FormControl>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        className={cn("w-full justify-between h-auto min-h-[40px] px-3 py-2", !field.value?.length && "text-muted-foreground")}
                                                    >
                                                        <div className="flex flex-wrap gap-1">
                                                            {field.value?.length ? field.value.map(val => (
                                                                <Badge key={val} variant="secondary" className="font-normal">
                                                                    {val}
                                                                    <X className="ml-1 h-3 w-3 cursor-pointer" onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        field.onChange(field.value?.filter(v => v !== val));
                                                                    }} />
                                                                </Badge>
                                                            )) : "Select Services..."}
                                                        </div>
                                                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                    <Command>
                                                        <CommandInput placeholder="Search services..." />
                                                        <CommandList>
                                                            <CommandEmpty>No services found.</CommandEmpty>
                                                            <CommandGroup className="max-h-64 overflow-auto">
                                                                {serviceOptions.map((opt) => (
                                                                    <CommandItem
                                                                        key={opt.value}
                                                                        onSelect={() => {
                                                                            const current = field.value || [];
                                                                            if (current.includes(opt.value)) {
                                                                                field.onChange(current.filter(v => v !== opt.value));
                                                                            } else {
                                                                                field.onChange([...current, opt.value]);
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Check className={cn("mr-2 h-4 w-4", field.value?.includes(opt.value) ? "opacity-100" : "opacity-0")} />
                                                                        {opt.label}
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                </div>

                {/* Supplier Service Area */}
                <div>
                     <h3 className="text-sm font-semibold bg-[#FFF9E5] text-[#333] py-2 px-3 mb-4 rounded-sm border-l-4 border-yellow-400">
                        Supplier Service Area
                    </h3>
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="countries"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Country</FormLabel>
                                        <FormControl>
                                            <SearchableSelect
                                                options={svcCountries.map(c => ({ label: c.name, value: c.name }))}
                                                value={field.value?.[0] || ""}
                                                onSearch={(q, s) => handleLocationSearch(q, "country", "service", s)}
                                                isLoading={loadingSvcCountries}
                                                onValueChange={(val) => {
                                                    const prev = field.value?.[0];
                                                    field.onChange(val ? [val] : []);
                                                    if (prev !== val) {
                                                        form.setValue("states", []);
                                                        form.setValue("service_cities", []);
                                                        setSvcStates([]);
                                                        setSvcCities([]);
                                                        if (val) {
                                                            const country = svcCountries.find(c => c.name === val);
                                                            if (country) {
                                                                setLoadingSvcStates(true);
                                                                locationService.getStates(country.id).then(res => {
                                                                    setSvcStates(res.states);
                                                                    setLoadingSvcStates(false);
                                                                });
                                                            }
                                                        }
                                                    }
                                                }}
                                                placeholder="Select Country"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="states"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>State</FormLabel>
                                        <FormControl>
                                            <SearchableSelect
                                                options={svcStates.map(s => ({ label: s.name, value: s.name }))}
                                                value={field.value?.[0] || ""}
                                                onSearch={(q, s) => handleLocationSearch(q, "state", "service", s)}
                                                isLoading={loadingSvcStates}
                                                disabled={!form.watch("countries")?.length}
                                                onValueChange={(val) => {
                                                    const prev = field.value?.[0];
                                                    field.onChange(val ? [val] : []);
                                                    if (prev !== val) {
                                                        form.setValue("service_cities", []);
                                                        setSvcCities([]);
                                                        if (val) {
                                                            const state = svcStates.find(s => s.name === val);
                                                            if (state) {
                                                                setLoadingSvcCities(true);
                                                                locationService.getCitiesByState(state.id).then(res => {
                                                                    setSvcCities(res.cities);
                                                                    setLoadingSvcCities(false);
                                                                });
                                                            }
                                                        }
                                                    }
                                                }}
                                                placeholder="Select State"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="service_cities"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>City</FormLabel>
                                    <FormControl>
                                        <SearchableSelect
                                            options={svcCities.map(c => ({ label: c.name, value: c.name }))}
                                            value={field.value?.[0] || ""}
                                            onSearch={(q, s) => handleLocationSearch(q, "city", "service", s)}
                                            isLoading={loadingSvcCities}
                                            disabled={!form.watch("states")?.length}
                                            onValueChange={(val) => field.onChange(val ? [val] : [])}
                                            placeholder="Select City"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="destinations"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Destination(s)</FormLabel>
                                    <FormControl>
                                        <Popover open={destinationOpen} onOpenChange={setDestinationOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className={cn("w-full justify-between h-auto min-h-[40px] px-3 py-2", !field.value?.length && "text-muted-foreground")}
                                                >
                                                    <div className="flex flex-wrap gap-1">
                                                        {field.value?.length ? field.value.map(val => (
                                                            <Badge key={val} variant="secondary" className="font-normal">
                                                                {val}
                                                                <X className="ml-1 h-3 w-3 cursor-pointer" onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    field.onChange(field.value?.filter(v => v !== val));
                                                                }} />
                                                            </Badge>
                                                        )) : "Select Destinations..."}
                                                    </div>
                                                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" onPointerDownOutside={(e) => e.stopPropagation()}>
                                                <Command shouldFilter={false}>
                                                    <CommandInput 
                                                        placeholder="Search destinations..." 
                                                        value={destSearch}
                                                        onValueChange={setDestSearch}
                                                    />
                                                    <CommandList>
                                                        {loadingDestinations ? (
                                                            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                Loading...
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <CommandEmpty>No destinations found.</CommandEmpty>
                                                                <CommandGroup className="max-h-64 overflow-auto">
                                                                    {availableDestinations
                                                                        .filter(d => d.name.toLowerCase().includes(destSearch.toLowerCase()))
                                                                        .map((dest) => (
                                                                        <CommandItem
                                                                            key={dest.id}
                                                                            onSelect={() => {
                                                                                const current = field.value || [];
                                                                                if (current.includes(dest.name)) {
                                                                                    field.onChange(current.filter(v => v !== dest.name));
                                                                                } else {
                                                                                    field.onChange([...current, dest.name]);
                                                                                }
                                                                                setDestSearch("");
                                                                            }}
                                                                        >
                                                                            <Check className={cn("mr-2 h-4 w-4", field.value?.includes(dest.name) ? "opacity-100" : "opacity-0")} />
                                                                            {dest.name}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </>
                                                        )}
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* Address Information */}
                <div>
                     <h3 className="text-sm font-semibold bg-[#FFF9E5] text-[#333] py-2 px-3 mb-4 rounded-sm border-l-4 border-yellow-400">
                        Address Information
                    </h3>
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="street"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Billing Street</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Street Address" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="country"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Billing Country</FormLabel>
                                        <FormControl>
                                            <SearchableSelect
                                                options={addrCountries.map(c => ({ label: c.name, value: c.name }))}
                                                value={field.value}
                                                onSearch={(q, s) => handleLocationSearch(q, "country", "address", s)}
                                                isLoading={loadingAddrCountries}
                                                onValueChange={(val) => {
                                                    const prev = field.value;
                                                    field.onChange(val);
                                                    if (prev !== val) {
                                                        form.setValue("state", "");
                                                        form.setValue("city", "");
                                                        setAddrStates([]);
                                                        setAddrCities([]);
                                                        if (val) {
                                                            const country = addrCountries.find(c => c.name === val);
                                                            if (country) {
                                                                setLoadingAddrStates(true);
                                                                locationService.getStates(country.id).then(res => {
                                                                    setAddrStates(res.states);
                                                                    setLoadingAddrStates(false);
                                                                });
                                                            }
                                                        }
                                                    }
                                                }}
                                                placeholder="Select Country"
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
                                    <FormItem>
                                        <FormLabel>Billing State</FormLabel>
                                        <FormControl>
                                            <SearchableSelect
                                                options={addrStates.map(s => ({ label: s.name, value: s.name }))}
                                                value={field.value}
                                                onSearch={(q, s) => handleLocationSearch(q, "state", "address", s)}
                                                isLoading={loadingAddrStates}
                                                disabled={!form.watch("country")}
                                                onValueChange={(val) => {
                                                    const prev = field.value;
                                                    field.onChange(val);
                                                    if (prev !== val) {
                                                        form.setValue("city", "");
                                                        setAddrCities([]);
                                                        if (val) {
                                                            const state = addrStates.find(s => s.name === val);
                                                            if (state) {
                                                                setLoadingAddrCities(true);
                                                                locationService.getCitiesByState(state.id).then(res => {
                                                                    setAddrCities(res.cities);
                                                                    setLoadingAddrCities(false);
                                                                });
                                                            }
                                                        }
                                                    }
                                                }}
                                                placeholder="Select State"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <FormField
                                control={form.control}
                                name="zip"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Billing Zip</FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="Zip/Postal Code" 
                                                {...field} 
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value === "" || /^\d+$/.test(value)) {
                                                        field.onChange(value);
                                                    }
                                                }}
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
                                    <FormItem>
                                        <FormLabel>Billing City</FormLabel>
                                        <FormControl>
                                            <SearchableSelect
                                                options={addrCities.map(c => ({ label: c.name, value: c.name }))}
                                                value={field.value}
                                                onSearch={(q, s) => handleLocationSearch(q, "city", "address", s)}
                                                isLoading={loadingAddrCities}
                                                disabled={!form.watch("state")}
                                                onValueChange={field.onChange}
                                                placeholder="Select City"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                </div>

                <div className={cn("flex justify-end gap-2 pt-4 border-t", isDrawer && "sticky bottom-0 bg-white px-5 py-3 -mx-5 -mb-5 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]")}>
                    <Button type="button" variant="outline" onClick={onCancel || (() => router.back())}>
                        {isDrawer ? "Close" : "Cancel"}
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 font-normal px-6 text-white" disabled={isLoading}>
                        {isLoading ? (initialData ? "Updating..." : "Creating...") : (initialData ? "Update" : "Save")}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
