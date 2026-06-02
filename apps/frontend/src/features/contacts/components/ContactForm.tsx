"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePicklist } from "@/hooks/use-picklist";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
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
import { contactsService } from "@/lib/api/services/contacts.service";
import { ErrorHandler, ErrorType } from "@/lib/error-handler";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const contactFormSchema = z.object({
    salutation: z.string().optional(),
    first_name: z.string().max(100).optional(),
    last_name: z.string().min(2, {
        message: "Last name must be at least 2 characters.",
    }).max(100),
    email: z.string().min(1, { message: "Email is required." }).email({ message: "Invalid email address." }),
    phone: z.string().optional().or(z.literal("")).refine(val => !val || /^\+?\d{1,4}\s\d{10}$/.test(val), {
        message: "Please select a country code and enter exactly a 10-digit number.",
    }),
    mobile: z.string().min(1, { message: "Mobile is required." }).refine(val => !val || /^\+?\d{1,4}\s\d{10}$/.test(val), {
        message: "Please select a country code and enter exactly a 10-digit number.",
    }),
    title: z.string().optional(),
    account_id: z.string().min(1, { message: "Account is required." }),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

const defaultValues: Partial<ContactFormValues> = {
    salutation: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    mobile: "",
    title: "",
    account_id: "",
};

interface ContactFormProps {
    initialData?: ContactFormValues;
    id?: string;
    /** Name of the current account (for the info banner) */
    initialAccountName?: string;
    onSuccess?: () => void;
    onCancel?: () => void;
    isDrawer?: boolean;
}

export function ContactForm({ initialData, id, initialAccountName, onSuccess, onCancel, isDrawer = false }: ContactFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [accounts, setAccounts] = useState<{ id: string, name: string, website?: string }[]>([]);
    const { items: salutations } = usePicklist("salutation");

    // Track original account_id to detect changes
    const originalAccountId = useRef(initialData?.account_id ?? "");

    // Coerce null/undefined from the loaded contact to "" so inputs stay
    // controlled (React warns when an input's `value` is null).
    const sanitizedInitial = Object.fromEntries(
        Object.entries(initialData || {}).map(([k, v]) => [k, v ?? ""])
    );

    const form = useForm<ContactFormValues>({
        resolver: zodResolver(contactFormSchema),
        defaultValues: { ...defaultValues, ...sanitizedInitial },
    });

    // Watch account_id to show info banner
    const watchedAccountId = form.watch("account_id");
    const accountChanged = !!id && watchedAccountId !== originalAccountId.current;

    // Resolve display name of the new account for the banner
    const newAccountName = accounts.find(a => a.id === watchedAccountId)?.name;

    useEffect(() => {
        const fetchMetaData = async () => {
            try {
                const data = await contactsService.getFormData();
                setAccounts(data.accounts || []);
            } catch (err) {
                console.error("Error fetching contact form metadata", err);
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

    async function onSubmit(data: ContactFormValues) {
        setIsLoading(true);
        const startTime = Date.now();
        let isSuccess = false;
        try {
            await ErrorHandler.withErrorHandling(async () => {
                try {
                    if (id) {
                        await contactsService.updateContact(id, data);
                        toast.success("Contact updated successfully");
                    } else {
                        await contactsService.createContact(data as any);
                        toast.success("Contact created successfully");
                    }
                    isSuccess = true;
                    
                    const elapsedTime = Date.now() - startTime;
                    if (elapsedTime < 2500) {
                        await new Promise(r => setTimeout(r, 2500 - elapsedTime));
                    }
                    
                    if (onSuccess) {
                        onSuccess();
                    } else {
                        router.push("/contacts");
                        router.refresh();
                    }
                } catch (error: any) {
                    const mapped = handleBackendErrors(ErrorHandler.parseError(error, "Failed to save contact"));
                    if (!mapped) throw error;
                }
            }, "Failed to save contact");
        } catch (error) {
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
                <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="salutation"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Salutation</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value ?? ""}>
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
                    <FormField
                        control={form.control}
                        name="first_name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="John" {...field} value={field.value ?? ""} />
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
                                    <Input
                                        placeholder="john@example.com"
                                        {...field}
                                    />
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
                                <FormLabel>Mobile *</FormLabel>
                                <FormControl>
                                    <PhoneInput {...field} placeholder="Mobile number" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Job Title</FormLabel>
                                <FormControl>
                                    <Input placeholder="Manager" {...field} value={field.value ?? ""} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="account_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Account *</FormLabel>
                                <FormControl>
                                    <SearchableSelect
                                        options={accounts.map(acc => ({ label: acc.name, value: acc.id }))}
                                        value={field.value || ""}
                                        onValueChange={field.onChange}
                                        placeholder="Select an account"
                                    />
                                </FormControl>
                                <FormDescription>
                                    {/* Tier 2: Info banner when account changes in edit mode */}
                                    {accountChanged && (
                                        <span className="flex items-start gap-1.5 mt-1.5 text-amber-600 dark:text-amber-400 text-xs leading-snug">
                                            <span>ℹ️</span>
                                            <span>
                                                This contact will move to
                                                {newAccountName ? ` "${newAccountName}"` : " the new account"}.
                                                Associated opportunities will also be reassigned to
                                                {newAccountName ? ` "${newAccountName}"` : " the new account"}.
                                            </span>
                                        </span>
                                    )}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                </div>
                <div className={cn("flex justify-end gap-4 pt-4 border-t", isDrawer && "sticky bottom-0 z-10 -mx-5 -mb-5 bg-card/95 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/85")}>
                    <Button type="button" variant="outline" onClick={() => onCancel ? onCancel() : router.back()}>
                        {isDrawer ? "Close" : "Cancel"}
                    </Button>
                    <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                        {isLoading ? (id ? "Updating..." : "Creating...") : (id ? "Update" : "Save")}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
