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
import { leadsService } from "@/lib/api/services/leads.service";
import { Lead, LeadCreateData, LeadStatus, Source, Industry, Rating } from "../types";
import { ErrorHandler, showSuccessToast } from "@/lib/error-handler";
import { logger } from "@/lib/logger";
import { LoadingButton } from "@/components/ui/loading";

const leadFormSchema = z.object({
    salutation: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().min(1, { message: "Last name is required." }),
    company: z.string().optional(),
    email: z.string().email({ message: "Invalid email address." }),
    phone: z.string().min(1, { message: "Phone is required." }),
    mobile: z.string().min(1, { message: "Mobile is required." }),
    no_employees: z.string().optional(),
    website: z.string().optional(),
    title: z.string().optional(),
    lead_status_id: z.string().optional(),
    source_id: z.string().min(1, { message: "Source is required." }),
    source_medium: z.string().optional(),
    industry_id: z.string().optional(),
    rating_id: z.string().optional(),
    street: z.string().optional(),
    city: z.string().min(1, { message: "City is required." }),
    state: z.string().min(1, { message: "State is required." }),
    zip: z.string().optional(),
    country: z.string().min(1, { message: "Country is required." }),
    campaign_name: z.string().optional(),
    travel_date: z.string().min(1, { message: "Travel date is required." }),
    no_of_nights: z.string().min(1, { message: "Number of nights is required." }),
    no_of_pax: z.string().min(1, { message: "Number of pax is required." }),
    ip_address: z.string().min(1, { message: "IP Address is required." }),
    is_fixed: z.boolean().default(false).optional(),
    destinations: z.string().min(1, { message: "Destinations are required." }),
});

type LeadFormValues = z.infer<typeof leadFormSchema>;

interface LeadFormProps {
    initialData?: Lead;
    leadId?: string;
    statuses?: LeadStatus[];
    sources?: Source[];
    industries?: Industry[];
    ratings?: Rating[];
}

export function LeadForm({
    initialData,
    leadId,
    statuses = [],
    sources = [],
    industries = [],
    ratings = []
}: LeadFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<LeadFormValues>({
        resolver: zodResolver(leadFormSchema),
        defaultValues: {
            salutation: initialData?.salutation || "",
            first_name: initialData?.first_name || "",
            last_name: initialData?.last_name || "",
            company: initialData?.company || "",
            email: initialData?.email || "",
            phone: initialData?.phone || "",
            mobile: initialData?.mobile || "",
            no_employees: initialData?.no_employees?.toString() || "",
            website: initialData?.website || "",
            title: initialData?.title || "",
            lead_status_id: initialData?.lead_status_id || "",
            source_id: initialData?.source_id || "",
            source_medium: initialData?.source_medium || "",
            industry_id: initialData?.industry_id || "",
            rating_id: initialData?.rating_id || "",
            street: initialData?.street || "",
            city: initialData?.city || "",
            state: initialData?.state || "",
            zip: initialData?.zip || "",
            country: initialData?.country || "",
            campaign_name: initialData?.campaign_name || "",
            travel_date: initialData?.travel_date || "",
            no_of_nights: initialData?.no_of_nights?.toString() || "",
            no_of_pax: initialData?.no_of_pax?.toString() || "",
            ip_address: initialData?.ip_address || "",
            is_fixed: initialData?.is_fixed || false,
            destinations: initialData?.destinations?.join(", ") || "",
        },
    });

    async function onSubmit(data: LeadFormValues) {
        setIsLoading(true);
        try {
            const payload: LeadCreateData = {
                salutation: data.salutation,
                first_name: data.first_name || "",
                last_name: data.last_name,
                company: data.company,
                email: data.email,
                phone: data.phone,
                mobile: data.mobile,
                no_employees: data.no_employees ? parseInt(data.no_employees) : undefined,
                website: data.website,
                title: data.title,
                lead_status_id: data.lead_status_id || undefined,
                source_id: data.source_id,
                source_medium: data.source_medium,
                industry_id: data.industry_id || undefined,
                rating_id: data.rating_id || undefined,
                street: data.street || undefined,
                city: data.city,
                state: data.state,
                zip: data.zip,
                country: data.country,
                campaign_name: data.campaign_name,
                travel_date: data.travel_date,
                no_of_nights: parseInt(data.no_of_nights),
                no_of_pax: parseInt(data.no_of_pax),
                ip_address: data.ip_address,
                is_fixed: data.is_fixed,
                destinations: data.destinations.split(",").map(d => d.trim()).filter(Boolean),
            };

            await ErrorHandler.withErrorHandling(async () => {
                if (leadId) {
                    await leadsService.updateLead(leadId, payload);
                    showSuccessToast("Lead updated successfully");
                } else {
                    await leadsService.createLead(payload);
                    showSuccessToast("Lead created successfully");
                }
            }, "Failed to save lead");

            router.push("/leads");
            router.refresh();
        } catch (error) {
            // Error is already handled by ErrorHandler.withErrorHandling
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="space-y-4">
                    <h3 className="text-lg font-medium border-b pb-2">Client Information</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                                            <SelectItem value="Mrs.">Mrs.</SelectItem>
                                            <SelectItem value="Ms.">Ms.</SelectItem>
                                            <SelectItem value="Dr.">Dr.</SelectItem>
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
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email *</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="john.doe@example.com" {...field} />
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
                                    <FormLabel>Phone *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="+1 234 567 890" {...field} />
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
                                        <Input placeholder="+1 234 567 890" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium border-b pb-2">Company & Source</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <FormField
                            control={form.control}
                            name="company"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Company Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Acme Inc." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="no_employees"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>No of Employees</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="50" {...field} />
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
                        <FormField
                            control={form.control}
                            name="source_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Source *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Source" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {sources.map((source) => (
                                                <SelectItem key={source.id} value={source.id}>
                                                    {source.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="source_medium"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Source Medium</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Facebook, Google, etc." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="campaign_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Campaign Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Summer Sale" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium border-b pb-2">Location</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <FormField
                            control={form.control}
                            name="country"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Country *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="USA" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="state"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>State *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="California" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="city"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>City *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Los Angeles" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="street"
                            render={({ field }) => (
                                <FormItem className="col-span-full">
                                    <FormLabel>Street Address</FormLabel>
                                    <FormControl>
                                        <Input placeholder="123 Main St" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium border-b pb-2">Travel Requirements</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <FormField
                            control={form.control}
                            name="travel_date"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Travel Date *</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
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
                                    <FormLabel>No of Nights *</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="4" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="no_of_pax"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>No of Pax *</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="2" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="destinations"
                            render={({ field }) => (
                                <FormItem className="col-span-2">
                                    <FormLabel>Destinations *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Paris, London, Rome" {...field} />
                                    </FormControl>
                                    <div className="text-[0.8rem] text-muted-foreground">
                                        Separate destinations with commas.
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="is_fixed"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                                    <FormControl>
                                        <Input
                                            type="checkbox"
                                            className="h-4 w-4"
                                            checked={field.value}
                                            onChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>
                                            Is Fixed Package?
                                        </FormLabel>
                                    </div>
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium border-b pb-2">Technical Information</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="ip_address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>IP Address *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="127.0.0.1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <LoadingButton
                        type="submit"
                        isLoading={isLoading}
                        loadingText={leadId ? "Updating..." : "Creating..."}
                    >
                        {leadId ? "Update Lead" : "Create Lead"}
                    </LoadingButton>
                </div>
            </form>
        </Form>
    );
}
