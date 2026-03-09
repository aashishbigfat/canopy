"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { contactsService } from "@/lib/api/services/contacts.service";
import { useEffect, useRef } from "react";

const contactFormSchema = z.object({
    first_name: z.string().min(2, {
        message: "First name must be at least 2 characters.",
    }),
    last_name: z.string().min(2, {
        message: "Last name must be at least 2 characters.",
    }),
    email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    title: z.string().optional(),
    account_id: z.string().optional(),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

const defaultValues: Partial<ContactFormValues> = {
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    title: "",
    account_id: "",
};

interface ContactFormProps {
    initialData?: ContactFormValues;
    id?: string;
    /** Name of the current account (for the info banner) */
    initialAccountName?: string;
}

/** 
 * Helper to extract domain from a string (email or website)
 * e.g. "john@big.com" -> "big.com", "https://www.big.com/test" -> "big.com"
 */
function extractDomain(input: string): string {
    if (!input) return "";
    let domain = input.toLowerCase();
    if (domain.includes("@")) {
        domain = domain.split("@")[1];
    }
    return domain
        .replace(/https?:\/\//, "")
        .replace(/^www\./, "")
        .split("/")[0]
        .split("?")[0];
}

export function ContactForm({ initialData, id, initialAccountName }: ContactFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [accounts, setAccounts] = useState<{ id: string, name: string, website?: string }[]>([]);

    // Track original account_id to detect changes
    const originalAccountId = useRef(initialData?.account_id ?? "");

    const form = useForm<ContactFormValues>({
        resolver: zodResolver(contactFormSchema),
        defaultValues: initialData || defaultValues,
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

    async function onSubmit(data: ContactFormValues) {
        setIsLoading(true);
        try {
            if (id) {
                await contactsService.updateContact(id, data);
            } else {
                await contactsService.createContact(data as any);
            }
            router.push("/contacts");
            router.refresh();
        } catch (error: any) {
            const message =
                error?.response?.data?.detail ??
                `Failed to ${id ? "update" : "create"} contact`;
            toast.error(message);
            console.error(message, error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid gap-4 md:grid-cols-2">
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
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="john@example.com"
                                        {...field}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            field.onChange(value);

                                            // Auto-select account based on email domain
                                            if (value.includes("@")) {
                                                const emailDomain = extractDomain(value);
                                                if (emailDomain) {
                                                    // Try to match by website OR by account name matching the domain
                                                    const matchingAccount = accounts.find(acc => {
                                                        const websiteMatch = acc.website && extractDomain(acc.website) === emailDomain;

                                                        // Extract just the name part from domain (e.g. "bigfatailabs" from "bigfatailabs.com")
                                                        const rawDomainName = emailDomain.split('.')[0];
                                                        const nameMatch = acc.name.toLowerCase().replace(/\s+/g, '') === rawDomainName;

                                                        return websiteMatch || nameMatch;
                                                    });

                                                    if (matchingAccount) {
                                                        form.setValue("account_id", matchingAccount.id, { shouldValidate: true, shouldDirty: true });
                                                    } else {
                                                        form.setValue("account_id", "", { shouldValidate: true, shouldDirty: true });
                                                    }
                                                }
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
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Phone</FormLabel>
                                <FormControl>
                                    <Input placeholder="+1 555-000-0000" {...field} />
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
                                    <Input placeholder="Manager" {...field} />
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
                                <FormLabel>Account</FormLabel>
                                <Select
                                    onValueChange={(val) => {
                                        field.onChange(val);
                                        // Auto-update email domain based on selected account
                                        const selectedAccount = accounts.find(a => a.id === val);
                                        if (selectedAccount) {
                                            const currentEmail = form.getValues("email") || "";
                                            // Fallback to account name if website is missing
                                            const accountDomain = selectedAccount.website ? extractDomain(selectedAccount.website) : `${selectedAccount.name.toLowerCase().replace(/\s+/g, '')}.com`;

                                            if (currentEmail.includes("@") && accountDomain) {
                                                const [localPart] = currentEmail.split("@");
                                                form.setValue("email", `${localPart}@${accountDomain}`, { shouldValidate: true, shouldDirty: true });
                                            } else if (!currentEmail && accountDomain) {
                                                form.setValue("email", `info@${accountDomain}`, { shouldValidate: true, shouldDirty: true });
                                            }
                                        }
                                    }}
                                    value={field.value || ""}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an account" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {accounts.map(account => (
                                            <SelectItem key={account.id} value={account.id}>
                                                {account.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                <div className="flex justify-end gap-4 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                        {isLoading ? (id ? "Updating..." : "Creating...") : (id ? "Update Contact" : "Create Contact")}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
