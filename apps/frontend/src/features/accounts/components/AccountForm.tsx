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
import { accountService } from "@/features/accounts/services/accountService";

const accountFormSchema = z.object({
    name: z.string().min(2, {
        message: "Name must be at least 2 characters.",
    }),
    industry: z.string().optional(),
    website: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal("")),
    phone: z.string().optional(),
    status: z.enum(["active", "inactive"]),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

const defaultValues: AccountFormValues = {
    name: "",
    industry: "",
    website: "",
    phone: "",
    status: "active",
};

interface AccountFormProps {
    isPersonAccount?: boolean;
    initialData?: AccountFormValues;
    id?: string;
}

export function AccountForm({ isPersonAccount = false, initialData, id }: AccountFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<AccountFormValues>({
        resolver: zodResolver(accountFormSchema),
        defaultValues: initialData || defaultValues as any,
    });

    async function onSubmit(data: AccountFormValues) {
        setIsLoading(true);
        try {
            if (id) {
                await accountService.updateAccount(id, {
                    ...data,
                    is_person_account: isPersonAccount,
                });
            } else {
                await accountService.createAccount({
                    ...data,
                    is_person_account: isPersonAccount,
                    acc_type_id: isPersonAccount ? "B2C" : "B2B",
                });
            }
            // Optional: Show success toast here
            router.push(isPersonAccount ? "/person-accounts" : "/accounts");
            router.refresh();
        } catch (error) {
            console.error(`Failed to ${id ? 'update' : 'create'} account`, error);
            // Optional: Show error toast here
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
                    {!isPersonAccount && (
                        <FormField
                            control={form.control}
                            name="industry"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Industry</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Technology" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
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
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? (id ? "Updating..." : "Creating...") : (id ? "Update Account" : "Create Account")}
                </Button>
            </form>
        </Form>
    );
}
