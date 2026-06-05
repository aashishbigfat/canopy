"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { usePicklist } from "@/hooks/use-picklist";
import { useSession } from "next-auth/react";
import { Paperclip, X } from "lucide-react";
import { locationService, Country, State, City } from "@/lib/api/services/locations.service";

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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/ui/phone-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Separator } from "@/components/ui/separator";
import { accountService } from "@/features/accounts/services/accountService";
import { useUploadFile } from "@/features/files/api/use-files";
import { ErrorHandler, ErrorType } from "@/lib/error-handler";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const getAccountFormSchema = (isPersonAccount: boolean) => z.object({
    name: isPersonAccount ? z.string().optional().or(z.literal("")) : z.string().min(2, "Name must be at least 2 characters.").max(255),
    salutation: z.string().optional(),
    first_name: z.string().optional(),
    last_name: isPersonAccount ? z.string().min(1, "Last Name is required") : z.string().optional(),
    email: z.string().email("Invalid email address."),
    phone: z.string().min(1, "Phone is required").refine(val => !val || /^\+?\d{1,4}\s\d{10}$/.test(val), {
        message: "Please select a country code and enter exactly a 10-digit number."
    }),
    mobile: z.string().optional().refine(val => !val || /^\+?\d{1,4}\s\d{10}$/.test(val), {
        message: "Please select a country code and enter exactly a 10-digit number."
    }),
    website: z
        .string()
        .trim()
        .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
        .refine(
            (v) => !v || /^https?:\/\/[^\s/$.?#][^\s]*\.[^\s]{2,}$/i.test(v),
            { message: "Please enter a valid website, e.g. example.com" }
        )
        .optional()
        .or(z.literal("")),
    description: z.string().optional(),

    // Classification
    industry_id: isPersonAccount ? z.string().optional() : z.string().min(1, "Industry is required"),
    acc_type_id: isPersonAccount ? z.string().optional() : z.string().min(1, "Account Type is required"),
    category_id: z.string().optional(),

    // Addresses
    billing_street: z.string().optional(),
    billing_city: z.string().optional(),
    billing_state: z.string().min(1, "State is required"),
    billing_zip: z.string().regex(/^\d{3,10}$/, "Invalid Zip/Postal code format. Must be numeric.").optional().or(z.literal("")),
    billing_country: z.string().min(1, "Country is required"),

    shipping_street: z.string().optional(),
    shipping_city: z.string().optional(),
    shipping_state: z.string().optional(),
    shipping_zip: z.string().regex(/^\d{3,10}$/, "Invalid Zip/Postal code format. Must be numeric.").optional().or(z.literal("")),
    shipping_country: z.string().optional(),
    owner_id: z.string().optional(),
});

type AccountFormValues = z.infer<ReturnType<typeof getAccountFormSchema>>;

interface AccountFormProps {
    isPersonAccount?: boolean;
    initialData?: any;
    id?: string;
    onSuccess?: () => void;
    onCancel?: () => void;
    isDrawer?: boolean;
}

interface MetaData {
    industries: { id: string; name: string }[];
    account_types: { id: string; name: string }[];
    sources: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    users: { id: string; name: string }[];
    current_user_name?: string;
}

const locationCache = {
    countries: new Map<string, any>(),
    states: new Map<string, any>(),
    cities: new Map<string, any>(),
};

function BillingLocationFields({ form, children }: { form: any, children?: React.ReactNode }) {
    const [countries, setCountries] = useState<Country[]>([]);
    const [states, setStates] = useState<State[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [loadingCountries, setLoadingCountries] = useState(false);
    const [loadingStates, setLoadingStates] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);

    useEffect(() => {
        const init = async () => {
            const currentCountryName = form.getValues("billing_country");
            const currentStateName = form.getValues("billing_state");
            const currentCityName = form.getValues("billing_city");

            setLoadingCountries(true);
            try {
                let loadedCountries: Country[] = [];
                const cacheKey = "popular";
                if (locationCache.countries.has(cacheKey)) {
                    loadedCountries = locationCache.countries.get(cacheKey);
                } else {
                    const r = await locationService.getCountries(true);
                    locationCache.countries.set(cacheKey, r.countries);
                    loadedCountries = r.countries;
                }
                
                if (currentCountryName && !loadedCountries.find(c => c.name === currentCountryName)) {
                    const searchRes = await locationService.searchCountries(currentCountryName);
                    const specific = searchRes.countries.find(c => c.name === currentCountryName);
                    if (specific) loadedCountries = [...loadedCountries, specific];
                }
                setCountries(loadedCountries);

                if (currentCountryName) {
                    const country = loadedCountries.find(c => c.name === currentCountryName);
                    if (country) {
                        setLoadingStates(true);
                        try {
                            const statesCacheKey = `${country.id}:all`;
                            let loadedStates: State[] = [];
                            if (locationCache.states.has(statesCacheKey)) {
                                loadedStates = locationCache.states.get(statesCacheKey);
                            } else {
                                const sRes = await locationService.getStates(country.id);
                                locationCache.states.set(statesCacheKey, sRes.states);
                                loadedStates = sRes.states;
                            }
                            
                            if (currentStateName && !loadedStates.find(s => s.name === currentStateName)) {
                                const sSearch = await locationService.searchStates(currentStateName, country.id);
                                const specificState = sSearch.states.find(s => s.name === currentStateName);
                                if (specificState) loadedStates = [...loadedStates, specificState];
                            }
                            setStates(loadedStates);

                            if (currentStateName) {
                                const state = loadedStates.find(s => s.name === currentStateName);
                                if (state) {
                                    setLoadingCities(true);
                                    try {
                                        const citiesCacheKey = `${state.id}:all`;
                                        let loadedCities: City[] = [];
                                        if (locationCache.cities.has(citiesCacheKey)) {
                                            loadedCities = locationCache.cities.get(citiesCacheKey);
                                        } else {
                                            const cRes = await locationService.getCitiesByState(state.id);
                                            locationCache.cities.set(citiesCacheKey, cRes.cities);
                                            loadedCities = cRes.cities;
                                        }
                                        
                                        if (currentCityName && !loadedCities.find(c => c.name === currentCityName)) {
                                            const cSearch = await locationService.searchCities(currentCityName, country.id, state.id);
                                            const specificCity = cSearch.cities.find(c => c.name === currentCityName);
                                            if (specificCity) loadedCities = [...loadedCities, specificCity];
                                        }
                                        setCities(loadedCities);
                                    } finally {
                                        setLoadingCities(false);
                                    }
                                }
                            }
                        } finally {
                            setLoadingStates(false);
                        }
                    }
                }
            } catch (err) {
                console.error("Location init error", err);
            } finally {
                setLoadingCountries(false);
            }
        };
        init();
    }, [form]);

    const handleCountrySearch = useCallback(async (query: string, signal?: AbortSignal) => {
        try {
            if (!query) {
                const cacheKey = "popular";
                if (locationCache.countries.has(cacheKey)) {
                    setCountries(locationCache.countries.get(cacheKey));
                    return;
                }
                const res = await locationService.getCountries(true, signal);
                locationCache.countries.set(cacheKey, res.countries);
                setCountries(res.countries);
                return;
            }

            if (locationCache.countries.has(query)) {
                setCountries(locationCache.countries.get(query));
                return;
            }

            setLoadingCountries(true);
            const res = await locationService.searchCountries(query, signal);
            locationCache.countries.set(query, res.countries);
            setCountries(res.countries);
        } catch (error) {
            import("axios").then(axios => {
                if (axios.default.isCancel(error)) return;
                console.error("Country search error", error);
            });
        } finally {
            setLoadingCountries(false);
        }
    }, []);

    const handleStateSearch = useCallback(async (query: string, signal?: AbortSignal) => {
        const countryName = form.getValues("billing_country");
        const country = countries.find(c => c.name === countryName);
        if (!country) return;

        try {
            const cacheKey = `${country.id}:${query || "all"}`;
            if (locationCache.states.has(cacheKey)) {
                setStates(locationCache.states.get(cacheKey));
                return;
            }

            if (!query) {
                const res = await locationService.getStates(country.id, signal);
                locationCache.states.set(cacheKey, res.states);
                setStates(res.states);
                return;
            }

            setLoadingStates(true);
            const res = await locationService.searchStates(query, country.id, signal);
            locationCache.states.set(cacheKey, res.states);
            setStates(res.states);
        } catch (error) {
            import("axios").then(axios => {
                if (axios.default.isCancel(error)) return;
                console.error("State search error", error);
            });
        } finally {
            setLoadingStates(false);
        }
    }, [countries, form]);

    const handleCitySearch = useCallback(async (query: string, signal?: AbortSignal) => {
        const countryName = form.getValues("billing_country");
        const stateName = form.getValues("billing_state");
        const country = countries.find(c => c.name === countryName);
        const state = states.find(s => s.name === stateName);
        
        if (!state) return;

        try {
            const cacheKey = `${state.id}:${query || "all"}`;
            if (locationCache.cities.has(cacheKey)) {
                setCities(locationCache.cities.get(cacheKey));
                return;
            }

            if (!query) {
                const res = await locationService.getCitiesByState(state.id, signal);
                locationCache.cities.set(cacheKey, res.cities);
                setCities(res.cities);
                return;
            }

            setLoadingCities(true);
            const res = await locationService.searchCities(query, country?.id, state.id, signal);
            locationCache.cities.set(cacheKey, res.cities);
            setCities(res.cities);
        } catch (error) {
            import("axios").then(axios => {
                if (axios.default.isCancel(error)) return;
                console.error("City search error", error);
            });
        } finally {
            setLoadingCities(false);
        }
    }, [countries, states, form]);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="billing_country"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Country *</FormLabel>
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
                                            form.setValue("billing_state", "");
                                            form.setValue("billing_city", "");
                                            setStates([]);
                                            setCities([]);
                                            if (val) {
                                                const country = countries.find(c => c.name === val);
                                                if (country) {
                                                    setLoadingStates(true);
                                                    locationService.getStates(country.id).then(res => {
                                                        setStates(res.states);
                                                        setLoadingStates(false);
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
                    name="billing_state"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>State *</FormLabel>
                            <FormControl>
                                <SearchableSelect
                                    options={states.map(s => ({ label: s.name, value: s.name }))}
                                    value={field.value}
                                    onSearch={handleStateSearch}
                                    isLoading={loadingStates}
                                    onValueChange={(val) => {
                                        const prev = field.value;
                                        field.onChange(val);
                                        if (prev !== val) {
                                            form.setValue("billing_city", "");
                                            setCities([]);
                                            if (val) {
                                                const state = states.find(s => s.name === val);
                                                if (state) {
                                                    setLoadingCities(true);
                                                    locationService.getCitiesByState(state.id).then(res => {
                                                        setCities(res.cities);
                                                        setLoadingCities(false);
                                                    });
                                                }
                                            }
                                        }
                                    }}
                                    placeholder="Select State"
                                    disabled={!form.watch("billing_country")}
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
                    name="billing_city"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                                <SearchableSelect
                                    options={cities.map(c => ({ label: c.name, value: c.name }))}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    onSearch={handleCitySearch}
                                    disabled={!form.watch("billing_state")}
                                    isLoading={loadingCities}
                                    placeholder="Select City"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {children}
            </div>
        </div>
    );
}

export function AccountForm({ isPersonAccount = false, initialData, id, onSuccess, onCancel, isDrawer = false }: AccountFormProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const [isLoading, setIsLoading] = useState(false);
    const [metaData, setMetaData] = useState<MetaData | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadFile = useUploadFile();
    const { items: salutations } = usePicklist("salutation");

    const form = useForm<AccountFormValues>({
        resolver: zodResolver(getAccountFormSchema(isPersonAccount)),
        defaultValues: {
            name: initialData?.name || "",
            salutation: initialData?.salutation || "",
            first_name: initialData?.first_name || "",
            last_name: initialData?.last_name || "",
            email: initialData?.email || "",
            phone: initialData?.phone || "",
            mobile: initialData?.mobile || "",
            website: initialData?.website || "",
            description: initialData?.description || "",
            industry_id: initialData?.industry_id || initialData?.industry || "",
            acc_type_id: initialData?.acc_type_id || "",
            category_id: initialData?.category_id || "",
            billing_street: initialData?.billing_street || "",
            billing_city: initialData?.billing_city || "",
            billing_state: initialData?.billing_state || "",
            billing_zip: initialData?.billing_zip || "",
            billing_country: initialData?.billing_country || "",
            shipping_street: initialData?.shipping_street || "",
            shipping_city: initialData?.shipping_city || "",
            shipping_state: initialData?.shipping_state || "",
            shipping_zip: initialData?.shipping_zip || "",
            shipping_country: initialData?.shipping_country || "",
            owner_id: initialData?.owner_id || "",
        },
    });

    useEffect(() => {
        const fetchMetaData = async () => {
            try {
                const data = await accountService.getFormData();
                setMetaData(data);
            } catch (err) {
                console.error("Error fetching form metadata", err);
            }
        };
        fetchMetaData();
    }, []);

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

    async function onSubmit(data: AccountFormValues) {
        setIsLoading(true);
        const startTime = Date.now();
        let isSuccess = false;
        try {
            let finalName = data.name || "";
            if (isPersonAccount && !finalName) {
                finalName = `${data.first_name || ""} ${data.last_name || ""}`.trim() || "Unknown Person";
            } else if (!isPersonAccount && !finalName) {
                finalName = initialData?.name || "Unnamed Account";
            }

            // Clean up payload: convert empty strings to null/undefined for backend compatibility
            const cleanedData = Object.entries(data).reduce((acc, [key, value]) => {
                acc[key] = value === "" ? null : value;
                return acc;
            }, {} as any);

            const payload = {
                ...cleanedData,
                name: finalName,
                is_person_account: isPersonAccount,
                // Mobile is a person-account-only field; never persist it for B2B/company accounts.
                mobile: isPersonAccount ? cleanedData.mobile : null,
            };

            await ErrorHandler.withErrorHandling(async () => {
                try {
                    let accountId = id;
                    if (id) {
                        await accountService.updateAccount(id, payload);
                    } else {
                        const created = await accountService.createAccount(payload as any);
                        accountId = created?.id;
                    }

                    // Upload the attached file (if any) and link it to the account.
                    if (selectedFile && accountId) {
                        try {
                            await uploadFile.mutateAsync({
                                file: selectedFile,
                                fileable_type: "Account",
                                fileable_id: accountId,
                            });
                        } catch (uploadErr) {
                            console.error("Attachment upload failed", uploadErr);
                            toast.error("Account saved, but the attachment failed to upload.");
                        }
                    }

                    toast.success(id ? "Account updated successfully" : "Account created successfully");
                    isSuccess = true;
                    
                    const elapsedTime = Date.now() - startTime;
                    if (elapsedTime < 2500) {
                        await new Promise(r => setTimeout(r, 2500 - elapsedTime));
                    }
                    
                    if (onSuccess) {
                        onSuccess();
                    } else {
                        router.push(isPersonAccount ? "/person-accounts" : "/accounts");
                        router.refresh();
                    }
                } catch (error: any) {
                    const mapped = handleBackendErrors(ErrorHandler.parseError(error, "Failed to save account"));
                    if (!mapped) throw error;
                }
            }, "Failed to save account");
        } catch (_) {
            // Error is already handled
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
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
            >
                {/* Additional Information */}
                <div>
                    <h3 className="text-lg font-medium mb-4">Additional Information</h3>
                    <div className="grid gap-6 md:grid-cols-2">
                        {!isPersonAccount ? (
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Account Name *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Acme Corp" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ) : (
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
                                                {salutations.map((s) => (
                                                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* Account Owner */}
                        {initialData || id ? (
                            <FormField
                                control={form.control}
                                name="owner_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Account Owner</FormLabel>
                                        <FormControl>
                                            <SearchableSelect
                                                options={metaData?.users.map(u => ({ label: u.name, value: u.id })) || []}
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                placeholder="Select Owner"
                                                disabled
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ) : (
                            <div className="flex flex-col space-y-2">
                                <FormLabel>Account Owner</FormLabel>
                                <p className="min-h-[40px] rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground flex items-center">
                                    {session?.user?.name || "Automatically assigned to you"}
                                </p>
                            </div>
                        )}

                        {isPersonAccount && (
                            <>
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
                            </>
                        )}

                        {!isPersonAccount && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="acc_type_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Account Type *</FormLabel>
                                            <FormControl>
                                                <SearchableSelect
                                                    options={metaData?.account_types?.map(t => ({ label: t.name, value: t.id })) || []}
                                                    value={field.value}
                                                    onValueChange={field.onChange}
                                                    placeholder="Select Account Type"
                                                />
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
                            </>
                        )}

                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone *</FormLabel>
                                    <FormControl>
                                        <PhoneInput {...field} placeholder="Phone number" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {isPersonAccount && (
                            <FormField
                                control={form.control}
                                name="mobile"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mobile</FormLabel>
                                        <FormControl>
                                            <PhoneInput {...field} placeholder="Mobile number" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {!isPersonAccount && (
                            <FormField
                                control={form.control}
                                name="industry_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Industry *</FormLabel>
                                        <FormControl>
                                            <SearchableSelect
                                                options={metaData?.industries.map(i => ({ label: i.name, value: i.id })) || []}
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                placeholder="Select Industry"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {!isPersonAccount && (
                            <FormField
                                control={form.control}
                                name="category_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <FormControl>
                                            <SearchableSelect
                                                options={metaData?.categories?.map(c => ({ label: c.name, value: c.id })) || []}
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                placeholder="Select Category"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email *</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="contact@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Add a description..."
                                            className="min-h-24"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormItem className="md:col-span-2">
                            <Label>Attachment</Label>
                            {selectedFile ? (
                                <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                                    <span className="flex min-w-0 items-center gap-2">
                                        <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <span className="truncate">{selectedFile.name}</span>
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setSelectedFile(null);
                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-fit"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Paperclip className="mr-2 h-4 w-4" />
                                    Attach File
                                </Button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                            />
                        </FormItem>
                    </div>
                </div>

                <Separator />

                {/* Address Information */}
                <div>
                    <h3 className="text-lg font-medium mb-4">Address Information</h3>
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="billing_street"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Street</FormLabel>
                                    <FormControl>
                                        <Input placeholder="123 Main St" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <BillingLocationFields form={form}>
                            <FormField
                                control={form.control}
                                name="billing_zip"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Zip Code</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="12345" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </BillingLocationFields>
                    </div>
                </div>

                <div className={cn("flex justify-end gap-4 pt-4 border-t", isDrawer && "sticky bottom-0 z-10 -mx-5 -mb-5 bg-card/95 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/85")}>
                    <Button type="button" variant="outline" onClick={() => onCancel ? onCancel() : router.back()}>
                        {isDrawer ? "Close" : "Cancel"}
                    </Button>
                    <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                        {isLoading ? (id ? "Updating..." : "Creating...") : (isDrawer ? (id ? "Update" : "Save") : (id ? "Update Account" : "Create Account"))}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
