"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Building2,
    User,
    Briefcase,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Calendar as CalendarIcon
} from "lucide-react";
import { format } from "date-fns";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    useConvertLead,
    useConversionSuggestions
} from "../api/useLeads";
import { Lead } from "../types";
import { LoadingButton } from "@/components/ui/loading";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const convertSchema = z.object({
    account_id: z.string().optional(),
    account_name: z.string().optional(),
    contact_id: z.string().optional(),
    contact_create: z.boolean(),
    create_opportunity: z.boolean(),
    opportunity_name: z.string().optional(),
    opportunity_amount: z.coerce.number().optional(),
    opportunity_close_date: z.date().optional(),
});

type ConvertFormValues = z.infer<typeof convertSchema>;

interface ConvertLeadDialogProps {
    lead: Lead;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function ConvertLeadDialog({
    lead,
    open,
    onOpenChange,
    onSuccess
}: ConvertLeadDialogProps) {
    const { data: suggestions, isLoading: isLoadingSuggestions } = useConversionSuggestions(lead.id);
    const convertLead = useConvertLead();

    const [accountMode, setAccountMode] = useState<"new" | "existing">("new");
    const [contactMode, setContactMode] = useState<"new" | "existing">("new");

    const form = useForm<ConvertFormValues>({
        resolver: zodResolver(convertSchema),
        defaultValues: {
            account_id: "",
            account_name: lead.company || "",
            contact_id: "",
            contact_create: true,
            create_opportunity: true,
            opportunity_name: lead.company ? `${lead.company} - Opportunity` : `${lead.full_name} - Opportunity`,
            opportunity_amount: 0,
            opportunity_close_date: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        },
    });

    // Auto-select "existing" if suggestions are found
    useEffect(() => {
        if (suggestions?.accounts?.length && accountMode === "new") {
            setAccountMode("existing");
            form.setValue("account_id", suggestions.accounts[0].id);
        }
        if (suggestions?.contacts?.length && contactMode === "new") {
            setContactMode("existing");
            form.setValue("contact_id", suggestions.contacts[0].id);
        }
    }, [suggestions, form, accountMode, contactMode]);

    async function onSubmit(data: ConvertFormValues) {
        await convertLead.mutateAsync({
            lead_id: lead.id,
            account_id: accountMode === "existing" ? data.account_id : undefined,
            account_name: accountMode === "new" ? data.account_name : undefined,
            contact_id: contactMode === "existing" ? data.contact_id : undefined,
            contact_create: contactMode === "new" ? data.contact_create : false,
            create_opportunity: data.create_opportunity,
            opportunity_name: data.opportunity_name,
            opportunity_amount: isNaN(data.opportunity_amount || 0) ? 0 : data.opportunity_amount,
            opportunity_close_date: data.opportunity_close_date?.toISOString(),
        });

        onOpenChange(false);
        onSuccess?.();
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                        <DialogTitle className="text-2xl">Convert Lead</DialogTitle>
                    </div>
                    <DialogDescription>
                        Convert <strong>{lead.full_name}</strong> into an Account, Contact, and Opportunity.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">

                        {/* Account Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 font-semibold text-lg text-slate-900 border-b pb-1">
                                <Building2 className="h-5 w-5 text-blue-600" />
                                <h3>Account</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Card
                                    className={cn(
                                        "cursor-pointer hover:border-blue-300 transition-colors",
                                        accountMode === "new" && "border-blue-600 ring-1 ring-blue-600"
                                    )}
                                    onClick={() => setAccountMode("new")}
                                >
                                    <CardContent className="p-3 flex items-center justify-between">
                                        <div className="text-sm font-medium">Create New</div>
                                        {accountMode === "new" && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                                    </CardContent>
                                </Card>
                                <Card
                                    className={cn(
                                        "cursor-pointer hover:border-blue-300 transition-colors",
                                        accountMode === "existing" && "border-blue-600 ring-1 ring-blue-600",
                                        !suggestions?.accounts?.length && "opacity-50 cursor-not-allowed"
                                    )}
                                    onClick={() => suggestions?.accounts?.length && setAccountMode("existing")}
                                >
                                    <CardContent className="p-3 flex items-center justify-between">
                                        <div className="text-sm font-medium">Choose Existing</div>
                                        {accountMode === "existing" && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                                    </CardContent>
                                </Card>
                            </div>

                            {accountMode === "new" ? (
                                <FormField
                                    control={form.control}
                                    name="account_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Account Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Company Name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ) : (
                                <FormField
                                    control={form.control}
                                    name="account_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Select Account</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select an account" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {suggestions?.accounts.map((acc) => (
                                                        <SelectItem key={acc.id} value={acc.id}>
                                                            <div className="flex flex-col">
                                                                <span>{acc.name}</span>
                                                                <span className="text-xs text-muted-foreground">{acc.email || "No email"}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription className="flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                Suggestions based on company name
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        {/* Contact Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 font-semibold text-lg text-slate-900 border-b pb-1">
                                <User className="h-5 w-5 text-indigo-600" />
                                <h3>Contact</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Card
                                    className={cn(
                                        "cursor-pointer hover:border-indigo-300 transition-colors",
                                        contactMode === "new" && "border-indigo-600 ring-1 ring-indigo-600"
                                    )}
                                    onClick={() => setContactMode("new")}
                                >
                                    <CardContent className="p-3 flex items-center justify-between">
                                        <div className="text-sm font-medium">Create New</div>
                                        {contactMode === "new" && <CheckCircle2 className="h-4 w-4 text-indigo-600" />}
                                    </CardContent>
                                </Card>
                                <Card
                                    className={cn(
                                        "cursor-pointer hover:border-indigo-300 transition-colors",
                                        contactMode === "existing" && "border-indigo-600 ring-1 ring-indigo-600",
                                        !suggestions?.contacts?.length && "opacity-50 cursor-not-allowed"
                                    )}
                                    onClick={() => suggestions?.contacts?.length && setContactMode("existing")}
                                >
                                    <CardContent className="p-3 flex items-center justify-between">
                                        <div className="text-sm font-medium">Choose Existing</div>
                                        {contactMode === "existing" && <CheckCircle2 className="h-4 w-4 text-indigo-600" />}
                                    </CardContent>
                                </Card>
                            </div>

                            {contactMode === "existing" && (
                                <FormField
                                    control={form.control}
                                    name="contact_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Select Contact</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a contact" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {suggestions?.contacts.map((con) => (
                                                        <SelectItem key={con.id} value={con.id}>
                                                            <div className="flex flex-col">
                                                                <span>{con.name}</span>
                                                                <span className="text-xs text-muted-foreground">{con.email}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription className="flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                Duplicates found by email or name
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {contactMode === "new" && (
                                <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                                    <p className="text-sm text-slate-600 flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        A new contact will be created for <strong>{lead.full_name}</strong>
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Opportunity Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-1">
                                <div className="flex items-center gap-2 font-semibold text-lg text-slate-900">
                                    <Briefcase className="h-5 w-5 text-amber-600" />
                                    <h3>Opportunity</h3>
                                </div>
                                <FormField
                                    control={form.control}
                                    name="create_opportunity"
                                    render={({ field }) => (
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="create_opp"
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                            <label
                                                htmlFor="create_opp"
                                                className="text-sm font-medium leading-none cursor-pointer"
                                            >
                                                Create Opportunity
                                            </label>
                                        </div>
                                    )}
                                />
                            </div>

                            {form.watch("create_opportunity") && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="opportunity_name"
                                        render={({ field }) => (
                                            <FormItem className="md:col-span-2">
                                                <FormLabel>Opportunity Name</FormLabel>
                                                <FormControl>
                                                    <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="opportunity_amount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Amount</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        placeholder="0.00"
                                                        {...field}
                                                        value={field.value === undefined || field.value === null ? "" : field.value}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            field.onChange(val === "" ? undefined : parseFloat(val));
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="opportunity_close_date"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>Close Date</FormLabel>
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
                                                                    format(field.value, "PPP")
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
                                                            selected={field.value}
                                                            onSelect={field.onChange}
                                                            disabled={(date) =>
                                                                date < new Date(new Date().setHours(0, 0, 0, 0))
                                                            }
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}
                        </div>

                        <DialogFooter className="sticky bottom-0 bg-white pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <LoadingButton
                                type="submit"
                                isLoading={convertLead.isPending}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                Convert Lead
                            </LoadingButton>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
