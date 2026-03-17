"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { AxiosRequestConfig } from "axios";

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
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Separator } from "@/components/ui/separator";
import { accountService } from "@/features/accounts/services/accountService";
import { contactService } from "@/features/contacts/services/contactService";
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

const accountFormSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters.").max(255).optional().or(z.literal("")),
    salutation: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().email("Invalid email address.").optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")).refine(val => !val || /^\+?\d{1,4}\s\d{10}$/.test(val), {
        message: "Please select a country code and enter exactly a 10-digit number."
    }),
    mobile: z.string().optional().or(z.literal("")).refine(val => !val || /^\+?\d{1,4}\s\d{10}$/.test(val), {
        message: "Please select a country code and enter exactly a 10-digit number."
    }),
    website: z.string().url("Invalid URL.").optional().or(z.literal("")),

    // Classification
    industry_id: z.string().optional(),
    rating_id: z.string().optional(),
    acc_type_id: z.string().optional(),
    account_source_id: z.string().optional(),
    owner_id: z.string().optional(),

    // Addresses
    billing_street: z.string().optional(),
    billing_city: z.string().optional(),
    billing_state: z.string().optional(),
    billing_zip: z.string().regex(/^[A-Za-z0-9\s-]{3,10}$/, "Invalid Zip/Postal code format.").optional().or(z.literal("")),
    billing_country: z.string().optional(),

    shipping_street: z.string().optional(),
    shipping_city: z.string().optional(),
    shipping_state: z.string().optional(),
    shipping_zip: z.string().regex(/^[A-Za-z0-9\s-]{3,10}$/, "Invalid Zip/Postal code format.").optional().or(z.literal("")),
    shipping_country: z.string().optional(),

});

type AccountFormValues = z.infer<typeof accountFormSchema>;

interface AccountFormProps {
    isPersonAccount?: boolean;
    initialData?: any;
    id?: string;
    onSuccess?: () => void;
    onCancel?: () => void;
    isDrawer?: boolean;
}

interface MetaData {
    industries: { id: string, name: string }[];
    ratings: { id: string, name: string }[];
    account_types: { id: string, name: string }[];
    sources: { id: string, name: string }[];
    users: { id: string, name: string }[];
}

export function AccountForm({ isPersonAccount = false, initialData, id, onSuccess, onCancel, isDrawer = false }: AccountFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [metaData, setMetaData] = useState<MetaData | null>(null);

    const form = useForm<AccountFormValues>({
        resolver: zodResolver(accountFormSchema),
        defaultValues: {
            name: initialData?.name || "",
            salutation: initialData?.salutation || "",
            first_name: initialData?.first_name || "",
            last_name: initialData?.last_name || "",
            email: initialData?.email || "",
            phone: initialData?.phone || "",
            mobile: initialData?.mobile || "",
            website: initialData?.website || "",
            industry_id: initialData?.industry_id || initialData?.industry || "",
            rating_id: initialData?.rating_id || initialData?.rating || "",
            acc_type_id: initialData?.acc_type_id || "",
            account_source_id: initialData?.account_source_id || "",
            owner_id: initialData?.owner_id || "",
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
            };

            await ErrorHandler.withErrorHandling(async () => {
                try {
                    if (id) {
                        await accountService.updateAccount(id, payload);
                        toast.success("Account updated successfully");
                    } else {
                        await accountService.createAccount(payload as any);
                        toast.success("Account created successfully");
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
        } catch (error) {
            // Error is already handled
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
            >
                {/* General Information */}
                <div>
                    <h3 className="text-lg font-medium mb-4">General Information</h3>
                    <div className="grid gap-6 md:grid-cols-2">
                        {!isPersonAccount ? (
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Account Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Acme Corp" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ) : (
                            <>
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
                                                    <SelectItem value="Ms.">Ms.</SelectItem>
                                                    <SelectItem value="Mrs.">Mrs.</SelectItem>
                                                    <SelectItem value="Dr.">Dr.</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-2 gap-4">
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
                                                <FormLabel>Last Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Doe" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </>
                        )}

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="contact@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {!isPersonAccount && (
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
                        )}
                    </div>
                </div>

                <Separator />

                {/* Contact Information */}
                <div>
                    <h3 className="text-lg font-medium mb-4">Contact Information</h3>
                    <div className="grid gap-6 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone</FormLabel>
                                    <FormControl>
                                        <PhoneInput {...field} placeholder="Phone number" />
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
                                        <PhoneInput {...field} placeholder="Mobile number" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <Separator />
                {/* Classification */}
                <div>
                    <h3 className="text-lg font-medium mb-4">Classification</h3>
                    <div className="grid gap-6 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="industry_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Industry</FormLabel>
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

                        <FormField
                            control={form.control}
                            name="account_source_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Account Source</FormLabel>
                                    <FormControl>
                                        <SearchableSelect
                                            options={metaData?.sources.map(s => ({ label: s.name, value: s.id })) || []}
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
                            control={form.control}
                            name="owner_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Owner</FormLabel>
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
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="billing_city"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>City</FormLabel>
                                        <FormControl>
                                            <Input placeholder="City" {...field} />
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
                                        <FormLabel>State</FormLabel>
                                        <FormControl>
                                            <Input placeholder="State" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="billing_zip"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Zip Code</FormLabel>
                                        <FormControl>
                                            <Input placeholder="12345" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="billing_country"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Country</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Country" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                </div>

                <div className={cn("flex justify-end gap-4 pt-4 border-t", isDrawer && "sticky bottom-0 bg-white px-5 py-3 -mx-5 -mb-5 z-10")}>
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
