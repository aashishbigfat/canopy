"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Building2,
    User as LucideUser,
    Briefcase,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Calendar as CalendarIcon,
    RadioTower,
    PlusCircle,
    UserCircle2
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
import { User } from "../types";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LeadConvertData } from "../types";

const convertSchema = z.object({
    account_type: z.enum(["Account", "Person Account"]),
    account_mode: z.enum(["new", "existing_only", "existing"]),
    account_id: z.string().optional(),
    account_name: z.string().optional(),
    contact_id: z.string().optional(),
    contact_create: z.boolean(),
    contact_salutation: z.string().optional(),
    contact_first_name: z.string().optional(),
    contact_last_name: z.string().min(1, "Last name is required"),
    create_opportunity: z.boolean(),
    opportunity_name: z.string().optional(),
    opportunity_amount: z.coerce.number().optional(),
    opportunity_close_date: z.date().optional(),
    travel_date: z.date().optional(),
    destination_ids: z.array(z.string()).optional(),
    experience_id: z.string().optional(),
    no_of_adults: z.coerce.number().optional(),
    no_of_childs: z.coerce.number().optional(),
    no_of_infants: z.coerce.number().optional(),
    no_of_pax: z.coerce.number().optional(),
    sales_stage_id: z.string().optional(),
    no_of_nights: z.coerce.number().optional(),
    description: z.string().optional(),
    opportunity_owner_id: z.string().optional(),
});

type ConvertFormValues = z.infer<typeof convertSchema>;

interface ConvertLeadDialogProps {
    lead: Lead;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    users?: User[];
    experiences?: { id: string; name: string }[];
    sales_stages?: { id: string; name: string }[];
}

export function ConvertLeadDialog({
    lead,
    open,
    onOpenChange,
    onSuccess,
    users = [],
    experiences = [],
    sales_stages = []
}: ConvertLeadDialogProps) {
    const convertLead = useConvertLead();
    const { data: suggestions, isLoading: suggestionsLoading } = useConversionSuggestions(lead.id);

    // Person Account detection logic
    const isPersonAccount = React.useMemo(() => {
        if (!lead.email) return false;
        const emailLower = lead.email.toLowerCase();
        const personalDomains = ["gmail", "yahoo", "hotmail", "rediffmail", "outlook"];
        return personalDomains.some(domain => emailLower.includes(`@${domain}.`) || emailLower.endsWith(`@${domain}.com`));
    }, [lead.email]);

    const form = useForm<ConvertFormValues>({
        resolver: zodResolver(convertSchema) as any,
        defaultValues: {
            account_type: isPersonAccount ? "Person Account" : "Account",
            account_mode: isPersonAccount ? "new" : "existing",
            account_name: lead.company || lead.full_name,
            contact_create: true,
            contact_salutation: lead.salutation || "",
            contact_first_name: lead.first_name || "",
            contact_last_name: lead.last_name || "",
            create_opportunity: true,
            opportunity_name: `${lead.company || lead.full_name} - Opportunity`,
            opportunity_amount: 0,
            no_of_adults: 1,
            no_of_childs: 0,
            no_of_infants: 0,
            no_of_pax: 1,
            no_of_nights: lead.no_of_nights || 0,
            description: "",
            destination_ids: lead.destination_ids || [],
            opportunity_close_date: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        },
    });

    const accountType = form.watch("account_type");
    const accountMode = form.watch("account_mode");
    const createOpportunity = form.watch("create_opportunity");
    const adults = form.watch("no_of_adults") || 0;
    const childs = form.watch("no_of_childs") || 0;
    const infants = form.watch("no_of_infants") || 0;

    // Update Pax automatically
    useEffect(() => {
        const totalPax = Number(adults) + Number(childs) + Number(infants);
        form.setValue("no_of_pax", totalPax);
    }, [adults, childs, infants, form]);

    async function onSubmit(values: ConvertFormValues) {
        try {
            const convertData: LeadConvertData = {
                lead_id: lead.id,
                account_type: values.account_type,
                account_id: values.account_mode !== "new" ? values.account_id : undefined,
                account_name: values.account_mode === "new" ? values.account_name : undefined,
                contact_id: values.contact_id,
                contact_create: values.contact_create,
                contact_salutation: values.contact_salutation,
                contact_first_name: values.contact_first_name,
                contact_last_name: values.contact_last_name,
                create_opportunity: values.create_opportunity,
                opportunity_name: values.opportunity_name,
                opportunity_amount: values.opportunity_amount,
                opportunity_close_date: values.opportunity_close_date?.toISOString(),
                travel_date: values.travel_date?.toISOString(),
                destination_ids: values.destination_ids,
                experience_id: values.experience_id,
                no_of_adults: values.no_of_adults,
                no_of_childs: values.no_of_childs,
                no_of_infants: values.no_of_infants,
                no_of_pax: values.no_of_pax,
                sales_stage_id: values.sales_stage_id,
                no_of_nights: values.no_of_nights,
                description: values.description,
                opportunity_owner_id: values.opportunity_owner_id,
            };

            await convertLead.mutateAsync(convertData);
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            // Error is handled by useConvertLead
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px] w-[95vw] max-h-[95vh] overflow-y-auto p-0 border-none">
                <DialogHeader className="border-b p-6 pb-4 mb-0">
                    <DialogTitle className="flex items-center gap-2 text-2xl text-blue-700">
                        <CheckCircle2 className="h-7 w-7" />
                        Convert Lead: {lead.full_name}
                    </DialogTitle>
                    <DialogDescription>
                        This process will create an Account, Contact, and optionally an Opportunity.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {/* Left Column: Account & Contact */}
                            <div className="space-y-8">
                                {/* 1. Account Selection */}
                                <Card className="border-blue-100 bg-blue-50/30">
                                    <CardContent className="pt-6 space-y-4">
                                        <div className="flex items-center gap-2 font-semibold text-blue-800 border-b border-blue-100 pb-2">
                                            <Building2 className="h-5 w-5" />
                                            <h3>Account Selection</h3>
                                        </div>

                                        <FormField
                                            control={form.control}
                                            name="account_type"
                                            render={({ field }) => (
                                                <FormItem className="space-y-3">
                                                    <FormLabel>Account Type</FormLabel>
                                                    <FormControl>
                                                        <RadioGroup
                                                            onValueChange={field.onChange}
                                                            defaultValue={field.value}
                                                            className="flex gap-6"
                                                        >
                                                            <div className="flex items-center space-x-2">
                                                                <RadioGroupItem value="Account" id="type-acc" />
                                                                <Label htmlFor="type-acc" className="font-normal cursor-pointer">Account</Label>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <RadioGroupItem value="Person Account" id="type-person" />
                                                                <Label htmlFor="type-person" className="font-normal cursor-pointer">Person Account</Label>
                                                            </div>
                                                        </RadioGroup>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="account_mode"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Selection Mode</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="new">Create New</SelectItem>
                                                            <SelectItem value="existing">Choose Existing</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {accountMode === "new" ? (
                                            <FormField
                                                control={form.control}
                                                name="account_name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Account Name</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} placeholder="Account Name" className="bg-white" />
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
                                                        <FormLabel>Select Existing Account</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="bg-white">
                                                                    <SelectValue placeholder="Select an account..." />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {suggestions?.accounts?.map((acc) => (
                                                                    <SelectItem key={acc.id} value={acc.id}>
                                                                        {acc.name} ({acc.match_type})
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </CardContent>
                                </Card>

                                {/* 2. Contact Section */}
                                <Card className="border-indigo-100 bg-indigo-50/30">
                                    <CardContent className="pt-6 space-y-4">
                                        <div className="flex items-center gap-2 font-semibold text-indigo-800 border-b border-indigo-100 pb-2">
                                            <UserCircle2 className="h-5 w-5" />
                                            <h3>Contact Details</h3>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                            <FormField
                                                control={form.control}
                                                name="contact_salutation"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Salutation</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} placeholder="Mr." className="bg-white" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="contact_first_name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>First Name</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} placeholder="First Name" className="bg-white" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="contact_last_name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Last Name</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} placeholder="Last Name" className="bg-white" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {suggestions?.contacts && suggestions.contacts.length > 0 && (
                                            <FormField
                                                control={form.control}
                                                name="contact_id"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Link to Existing Contact? (Optional)</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="bg-white">
                                                                    <SelectValue placeholder="Select existing contact..." />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="">-- Create New --</SelectItem>
                                                                {suggestions?.contacts?.map((con) => (
                                                                    <SelectItem key={con.id} value={con.id}>
                                                                        {con.name} ({con.match_type})
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right Column: Opportunity */}
                            <div className="space-y-8">
                                <Card className="border-orange-100 bg-orange-50/30">
                                    <CardContent className="pt-6 space-y-4">
                                        <div className="flex items-center justify-between border-b border-orange-100 pb-2">
                                            <div className="flex items-center gap-2 font-semibold text-orange-800">
                                                <Briefcase className="h-5 w-5" />
                                                <h3>Opportunity Details</h3>
                                            </div>
                                            <FormField
                                                control={form.control}
                                                name="create_opportunity"
                                                render={({ field }) => (
                                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={field.value}
                                                                onCheckedChange={field.onChange}
                                                            />
                                                        </FormControl>
                                                        <FormLabel className="text-sm font-medium cursor-pointer">
                                                            Create
                                                        </FormLabel>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {createOpportunity && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                                <FormField
                                                    control={form.control}
                                                    name="opportunity_name"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Opportunity Name</FormLabel>
                                                            <FormControl>
                                                                <Input {...field} className="bg-white" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="travel_date"
                                                        render={({ field }) => (
                                                            <FormItem className="flex flex-col">
                                                                <FormLabel>Date of Travel</FormLabel>
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <FormControl>
                                                                            <Button
                                                                                variant={"outline"}
                                                                                className={cn(
                                                                                    "w-full pl-3 text-left font-normal bg-white",
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
                                                        name="opportunity_close_date"
                                                        render={({ field }) => (
                                                            <FormItem className="flex flex-col">
                                                                <FormLabel>Expected Close Date</FormLabel>
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <FormControl>
                                                                            <Button
                                                                                variant={"outline"}
                                                                                className={cn(
                                                                                    "w-full pl-3 text-left font-normal bg-white",
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
                                                                            initialFocus
                                                                        />
                                                                    </PopoverContent>
                                                                </Popover>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="experience_id"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Experience</FormLabel>
                                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                    <FormControl>
                                                                        <SelectTrigger className="bg-white">
                                                                            <SelectValue placeholder="Select experience..." />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {experiences?.map(exp => (
                                                                            <SelectItem key={exp.id} value={exp.id}>{exp.name}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={form.control}
                                                        name="sales_stage_id"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Stage</FormLabel>
                                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                    <FormControl>
                                                                        <SelectTrigger className="bg-white">
                                                                            <SelectValue placeholder="Select stage..." />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {sales_stages?.map(stage => (
                                                                            <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-x-4 gap-y-3 border p-4 rounded-lg bg-white shadow-sm">
                                                    <FormField
                                                        control={form.control}
                                                        name="no_of_adults"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-[10px] uppercase font-bold text-slate-500">Adults</FormLabel>
                                                                <FormControl>
                                                                    <Input type="number" {...field} className="h-8 text-xs" />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="no_of_childs"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-[10px] uppercase font-bold text-slate-500">Childs</FormLabel>
                                                                <FormControl>
                                                                    <Input type="number" {...field} className="h-8 text-xs" />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="no_of_infants"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-[10px] uppercase font-bold text-slate-500">Infants</FormLabel>
                                                                <FormControl>
                                                                    <Input type="number" {...field} className="h-8 text-xs" />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="no_of_pax"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-[10px] uppercase font-bold text-blue-600">Total Pax</FormLabel>
                                                                <FormControl>
                                                                    <Input type="number" {...field} readOnly className="h-8 text-xs bg-blue-50 border-blue-200 font-bold" />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="opportunity_amount"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Lead Amount</FormLabel>
                                                                <FormControl>
                                                                    <div className="relative">
                                                                        <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
                                                                        <Input type="number" {...field} className="pl-7 bg-white" />
                                                                    </div>
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={form.control}
                                                        name="no_of_nights"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>No of Nights</FormLabel>
                                                                <FormControl>
                                                                    <Input type="number" {...field} className="bg-white" />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>

                                                <FormField
                                                    control={form.control}
                                                    name="opportunity_owner_id"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Opportunity Owner</FormLabel>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <FormControl>
                                                                    <SelectTrigger className="bg-white">
                                                                        <SelectValue placeholder="Assign owner..." />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    {users?.map(user => (
                                                                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    control={form.control}
                                                    name="description"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Notes / Description</FormLabel>
                                                            <FormControl>
                                                                <Textarea
                                                                    {...field}
                                                                    placeholder="Add any specific requirements or notes..."
                                                                    className="min-h-[80px] bg-white resize-none"
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        <DialogFooter className="border-t p-6 bg-slate-50/50 gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                                className="text-slate-500 hover:text-slate-700"
                            >
                                Not Now
                            </Button>
                            <Button
                                type="submit"
                                disabled={convertLead.isPending}
                                className="bg-blue-700 hover:bg-blue-800 text-white min-w-[140px] shadow-lg shadow-blue-200"
                            >
                                {convertLead.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Converting...
                                    </>
                                ) : (
                                    "Convert Lead"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
