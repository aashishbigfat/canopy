"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";

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
    email: z.string().email({ message: "Invalid email address." }),
    phone: z.string().min(1, { message: "Phone is required." }),
    mobile: z.string().min(1, { message: "Mobile is required." }),
    no_employees: z.string().optional(),
    website: z.string().optional(),
    title: z.string().optional(),
    lead_status_id: z.string().optional(),
    source_id: z.string().min(1, { message: "Source is required." }),
    source_medium: z.string().optional(),
    industry_id: z.string().optional(),
    rating_id: z.string().optional(),
    street: z.string().optional(),
    city: z.string().min(1, { message: "City is required." }),
    state: z.string().min(1, { message: "State is required." }),
    zip: z.string().optional(),
    country: z.string().min(1, { message: "Country is required." }),
    campaign_name: z.string().optional(),
    travel_date: z.string().min(1, { message: "Travel date is required." }),
    no_of_nights: z.string().min(1, { message: "Number of nights is required." }),
    no_of_pax: z.string().min(1, { message: "Number of pax is required." }),
    is_fixed: z.boolean().default(false).optional(),
    destinations: z.string().min(1, { message: "Destinations are required." }),
    segment: z.string().optional(),
});

type LeadFormValues = z.infer<typeof leadFormSchema>;

interface LeadFormProps {
    initialData?: Lead;
    leadId?: string;
    statuses?: LeadStatus[];
    sources?: Source[];
    industries?: Industry[];
    ratings?: Rating[];
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
    ratings = []
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
        resolver: zodResolver(leadFormSchema),
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
            industry_id: initialData?.industry_id || "",
            rating_id: initialData?.rating_id || "",
            street: initialData?.street || "",
            city: initialData?.city || "",
            state: initialData?.state || "",
            zip: initialData?.zip || "",
            country: initialData?.country || "",
            campaign_name: initialData?.campaign_name || "",
            travel_date: initialData?.travel_date || "",
            no_of_nights: initialData?.no_of_nights?.toString() || "",
            no_of_pax: initialData?.no_of_pax?.toString() || "",
            is_fixed: initialData?.is_fixed || false,
            destinations: initialData?.destinations?.join(", ") || "",
            segment: initialData?.segment || "B2C",
        },
    });

    const email = form.watch("email");

    useEffect(() => {
        if (!email || !email.includes("@")) return;

        const domain = email.split("@")[1]?.toLowerCase();
        if (!domain) return;

        const isPublic = PUBLIC_EMAIL_DOMAINS.some(d => domain.endsWith(d));
        const detectedSegment = isPublic ? "B2C" : "B2B";

        form.setValue("segment", detectedSegment);
    }, [email, form]);


    async function onSubmit(data: LeadFormValues) {
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
                source_id: data.source_id,
                source_medium: data.source_medium,
                industry_id: data.industry_id || undefined,
                rating_id: data.rating_id || undefined,
                street: data.street || undefined,
                city: data.city,
                state: data.state,
                zip: data.zip,
                country: data.country,
                campaign_name: data.campaign_name,
                travel_date: data.travel_date,
                no_of_nights: parseInt(data.no_of_nights),
                no_of_pax: parseInt(data.no_of_pax),
                is_fixed: data.is_fixed,
                destinations: data.destinations.split(",").map(d => d.trim()).filter(Boolean),
                segment: data.segment,
            };

            await ErrorHandler.withErrorHandling(async () => {
                if (leadId) {
                    await leadsService.updateLead(leadId, payload);
                    showSuccessToast("Lead updated successfully");
                } else {
                    await leadsService.createLead(payload);
                    showSuccessToast("Lead created successfully");
                }
            }, "Failed to save lead");

            router.push("/leads");
            router.refresh();
        } catch (error) {
            // Error is already handled by ErrorHandler.withErrorHandling
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="space-y-4">
                    <h3 className="text-lg font-medium border-b pb-2">Client Information</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <FormField
                            control={form.control}
                            name="salutation"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Salutation</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
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
                            control={form.control}
                            name="first_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>First Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="John" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="last_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Last Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Doe" {...field} />
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
                                    <FormLabel>Email *</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="john.doe@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="segment"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Segment</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Segment" />
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
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="+1 234 567 890" {...field} />
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
                                    <FormLabel>Mobile *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="+1 234 567 890" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium border-b pb-2">Company & Source</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <FormField
                            control={form.control}
                            name="company"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Company Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Acme Inc." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="no_employees"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>No of Employees</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="50" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="website"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Website</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="source_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Source *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Source" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
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
                            control={form.control}
                            name="source_medium"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Source Medium</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Facebook, Google, etc." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="campaign_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Campaign Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Summer Sale" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium border-b pb-2">Location</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <LocationFields form={form} />
                        <FormField
                            control={form.control}
                            name="street"
                            render={({ field }) => (
                                <FormItem className="col-span-full">
                                    <FormLabel>Street Address</FormLabel>
                                    <FormControl>
                                        <Input placeholder="123 Main St" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium border-b pb-2">Travel Requirements</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                                                captionLayout="dropdown"
                                                startMonth={new Date(1900, 0)}
                                                endMonth={new Date(2100, 11)}
                                                selected={field.value ? new Date(field.value) : undefined}
                                                onSelect={(date) => field.onChange(date?.toISOString().split('T')[0])}
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
                            name="no_of_nights"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>No of Nights *</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="4" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="no_of_pax"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>No of Pax *</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="2" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="destinations"
                            render={({ field }) => (
                                <FormItem className="col-span-2">
                                    <FormLabel>Destinations *</FormLabel>
                                    <Popover open={destinationOpen} onOpenChange={setDestinationOpen}>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className={cn(
                                                        "w-full justify-between h-auto min-h-10",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    <div className="flex flex-wrap gap-1 items-center">
                                                        {field.value ? (
                                                            field.value.split(",").map(d => d.trim()).filter(Boolean).map((d, i) => (
                                                                <Badge key={i} variant="secondary" className="mr-1 flex items-center gap-1">
                                                                    {d}
                                                                    <span
                                                                        role="button"
                                                                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 px-0 py-0 cursor-pointer"
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                        }}
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            const names = field.value.split(",").map(n => n.trim()).filter(Boolean);
                                                                            const newNames = names.filter(n => n !== d);
                                                                            field.onChange(newNames.join(", "));
                                                                        }}
                                                                    >
                                                                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                                                    </span>
                                                                </Badge>
                                                            ))
                                                        ) : (
                                                            <span>Select destinations</span>
                                                        )}
                                                    </div>
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[400px] p-0" align="start">
                                            <Command shouldFilter={false}>
                                                <CommandInput
                                                    placeholder="Search destination..."
                                                    onValueChange={setDestSearch}
                                                />
                                                <CommandList>
                                                    <CommandEmpty>No destination found.</CommandEmpty>
                                                    <CommandGroup className="max-h-64 overflow-y-auto">
                                                        {availableDestinations
                                                            .filter(d => d.name.toLowerCase().includes(destSearch.toLowerCase()))
                                                            .map((dest) => {
                                                                const selectedNames = field.value ? field.value.split(",").map(n => n.trim()).filter(Boolean) : [];
                                                                const isSelected = selectedNames.includes(dest.name);
                                                                return (
                                                                    <CommandItem
                                                                        key={dest.id}
                                                                        onSelect={() => {
                                                                            let newNames;
                                                                            if (isSelected) {
                                                                                newNames = selectedNames.filter(n => n !== dest.name);
                                                                            } else {
                                                                                newNames = [...selectedNames, dest.name];
                                                                            }
                                                                            field.onChange(newNames.join(", "));
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
                                    <div className="text-[0.8rem] text-muted-foreground">
                                        Select one or more destinations from the list.
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="is_fixed"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                                    <FormControl>
                                        <Input
                                            type="checkbox"
                                            className="h-4 w-4"
                                            checked={field.value}
                                            onChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>
                                            Is Fixed Package?
                                        </FormLabel>
                                    </div>
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
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
