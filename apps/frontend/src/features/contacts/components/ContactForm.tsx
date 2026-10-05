"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";
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
import { AsyncAccountSelect } from "@/features/views/AsyncAccountSelect";
import { contactsService } from "@/lib/api/services/contacts.service";
import { ErrorHandler, ErrorType } from "@/lib/error-handler";
import { PHONE_ERROR, PHONE_REGEX } from "@/lib/validation/inline-field-validation";
import { useRef } from "react";
import { cn } from "@/lib/utils";

const contactFormSchema = z.object({
    salutation: z.string().optional(),
    first_name: z.string().max(100).optional(),
    last_name: z.string().min(2, {
        message: "Last name must be at least 2 characters.",
    }).max(100),
    email: z.string().min(1, { message: "Email is required." }).email({ message: "Invalid email address." }),
    phone: z.string().optional().or(z.literal("")).refine(val => !val || PHONE_REGEX.test(val), {
        message: PHONE_ERROR,
    }),
    mobile: z.string().min(1, { message: "Mobile is required." }).refine(val => !val || PHONE_REGEX.test(val), {
        message: PHONE_ERROR,
    }),
    title: z.string().optional(),
    date_of_birth: z.string().optional(),
    account_id: z.string().min(1, { message: "Account is required." }),
    owner_id: z.string().optional(),
    // Mailing address
    mailing_street: z.string().optional(),
    mailing_city: z.string().optional(),
    mailing_state: z.string().optional(),
    mailing_zip: z.string().optional().or(z.literal("")).refine(val => !val || /^[A-Za-z0-9\s-]{3,10}$/.test(val), {
        message: "Invalid Zip/Postal code format.",
    }),
    mailing_country: z.string().optional(),
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
    date_of_birth: "",
    account_id: "",
    owner_id: "",
    mailing_street: "",
    mailing_city: "",
    mailing_state: "",
    mailing_zip: "",
    mailing_country: "",
};

interface ContactFormProps {
    initialData?: ContactFormValues & { owner_name?: string; owner?: { name?: string }; account_name?: string };
    id?: string;
    /** Name of the current account (for the info banner) */
    initialAccountName?: string;
    onSuccess?: () => void;
    onCancel?: () => void;
    isDrawer?: boolean;
}

export function ContactForm({ initialData, id, initialAccountName, onSuccess, onCancel, isDrawer = false }: ContactFormProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const [isLoading, setIsLoading] = useState(false);
    // Name shown on the account picker; accounts are searched on the server as the user types
    const [accountName, setAccountName] = useState(initialAccountName || initialData?.account_name || "");
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
        defaultValues: {
            ...defaultValues,
            ...sanitizedInitial,
            // API returns an ISO datetime; the date input wants YYYY-MM-DD
            date_of_birth: initialData?.date_of_birth ? String(initialData.date_of_birth).slice(0, 10) : "",
        },
    });

    // Watch account_id to show info banner
    const watchedAccountId = form.watch("account_id");
    const accountChanged = !!id && watchedAccountId !== originalAccountId.current;

    // Display name of the new account for the banner
    const newAccountName = accountChanged ? accountName : undefined;

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

    async function onSubmit(values: ContactFormValues) {
        setIsLoading(true);
        const startTime = Date.now();
        let isSuccess = false;
        // An empty date must go as null, not "" (the API expects a date or nothing).
        const data = { ...values, date_of_birth: values.date_of_birth || null };
        try {
            await ErrorHandler.withErrorHandling(async () => {
                try {
                    if (id) {
                        await contactsService.updateContact(id, data as any);
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
                <div>
                    <h3 className="text-lg font-medium mb-4">Contact Information</h3>
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

                        {/* Account Owner — read-only; reassignment uses Change Owner action */}
                        <div className="flex flex-col space-y-2">
                            <FormLabel>Account Owner</FormLabel>
                            <p className="min-h-[40px] rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground flex items-center">
                                {initialData?.owner_name
                                    || initialData?.owner?.name
                                    || session?.user?.name
                                    || "Automatically assigned to you"}
                            </p>
                        </div>

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
                            name="account_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Account Name *</FormLabel>
                                    <FormControl>
                                        <AsyncAccountSelect
                                            value={field.value || ""}
                                            label={accountName}
                                            onSelect={(accountId, name) => {
                                                field.onChange(accountId);
                                                setAccountName(name);
                                            }}
                                            isPersonAccount={null}
                                            placeholder="Search Account"
                                        />
                                    </FormControl>
                                    <FormDescription>
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
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Manager" {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="date_of_birth"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Date of Birth</FormLabel>
                                    <FormControl>
                                        <Input type="date" max={new Date().toISOString().slice(0, 10)} {...field} value={field.value ?? ""} />
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
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-medium mb-4">Address Information</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="mailing_street"
                            render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Mailing Street</FormLabel>
                                    <FormControl>
                                        <Input placeholder="123 Main St" {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="mailing_city"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>City</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Mumbai" {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="mailing_state"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>State</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Maharashtra" {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="mailing_zip"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Zip / Postal Code</FormLabel>
                                    <FormControl>
                                        <Input placeholder="400001" {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="mailing_country"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Country</FormLabel>
                                    <FormControl>
                                        <Input placeholder="India" {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
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
