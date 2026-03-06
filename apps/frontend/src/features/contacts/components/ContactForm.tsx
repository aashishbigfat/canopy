"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
import { useEffect } from "react";

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
}

export function ContactForm({ initialData, id }: ContactFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [accounts, setAccounts] = useState<{ id: string, name: string }[]>([]);

    const form = useForm<ContactFormValues>({
        resolver: zodResolver(contactFormSchema),
        defaultValues: initialData || defaultValues,
    });

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
        } catch (error) {
            console.error(`Failed to ${id ? 'update' : 'create'} contact`, error);
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
                                    <Input placeholder="john@example.com" {...field} />
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
                                <Select onValueChange={field.onChange} value={field.value || ""}>
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
