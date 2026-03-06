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
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { accountService } from "@/features/accounts/services/accountService";
import { getSession } from "next-auth/react";

const accountFormSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters.").optional().or(z.literal("")),
    salutation: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().email("Invalid email address.").optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    mobile: z.string().optional().or(z.literal("")),
    website: z.string().url("Invalid URL.").optional().or(z.literal("")),
    description: z.string().optional(),

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
    billing_zip: z.string().optional(),
    billing_country: z.string().optional(),

    shipping_street: z.string().optional(),
    shipping_city: z.string().optional(),
    shipping_state: z.string().optional(),
    shipping_zip: z.string().optional(),
    shipping_country: z.string().optional(),

    status: z.enum(["active", "inactive"]),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

interface AccountFormProps {
    isPersonAccount?: boolean;
    initialData?: any;
    id?: string;
}

interface MetaData {
    industries: { id: string, name: string }[];
    ratings: { id: string, name: string }[];
    account_types: { id: string, name: string }[];
    sources: { id: string, name: string }[];
    users: { id: string, name: string }[];
}

export function AccountForm({ isPersonAccount = false, initialData, id }: AccountFormProps) {
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
            description: initialData?.description || "",
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
            status: initialData?.status || "active",
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

    const copyBillingToShipping = () => {
        const values = form.getValues();
        form.setValue("shipping_street", values.billing_street);
        form.setValue("shipping_city", values.billing_city);
        form.setValue("shipping_state", values.billing_state);
        form.setValue("shipping_zip", values.billing_zip);
        form.setValue("shipping_country", values.billing_country);
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

            const payload = {
                ...data,
                name: finalName,
                is_person_account: isPersonAccount,
            };

            if (id) {
                await accountService.updateAccount(id, payload);
            } else {
                await accountService.createAccount(payload as any);
            }
            router.push(isPersonAccount ? "/person-accounts" : "/accounts");
            router.refresh();
        } catch (error) {
            console.error(`Failed to ${id ? 'update' : 'create'} account`, error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                                        <Input placeholder="1234567890" {...field} />
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
                                        <Input placeholder="1234567890" {...field} />
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
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Industry" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {metaData?.industries.map(i => (
                                                <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="rating_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Rating</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Rating" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {metaData?.ratings.map(r => (
                                                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Source" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {metaData?.sources.map(s => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Owner" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {metaData?.users.map(u => (
                                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <Separator />

                {/* Address Information */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">Address Information</h3>
                        <Button type="button" variant="outline" size="sm" onClick={copyBillingToShipping}>
                            Copy Billing to Shipping
                        </Button>
                    </div>

                    <div className="grid gap-10 md:grid-cols-2">
                        {/* Billing */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold uppercase text-slate-500">Billing Address</h4>
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

                        {/* Shipping */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold uppercase text-slate-500">Shipping Address</h4>
                            <FormField
                                control={form.control}
                                name="shipping_street"
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
                                    name="shipping_city"
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
                                    name="shipping_state"
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
                                    name="shipping_zip"
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
                                    name="shipping_country"
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
                </div>

                <Separator />

                {/* Description & Status */}
                <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Add any additional notes here..."
                                        className="h-32"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a status" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                        {isLoading ? (id ? "Updating..." : "Creating...") : (id ? "Update Account" : "Create Account")}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
