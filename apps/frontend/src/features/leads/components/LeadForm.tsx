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
    first_name: z.string().min(2, { message: "First name is required." }),
    middle_name: z.string().optional(),
    last_name: z.string().min(2, { message: "Last name is required." }),
    company: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    website: z.string().optional(),
    title: z.string().optional(),
    lead_status_id: z.string().optional(),
    source_id: z.string().optional(),
    industry_id: z.string().optional(),
    rating_id: z.string().optional(),
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
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
            middle_name: initialData?.middle_name || "",
            last_name: initialData?.last_name || "",
            company: initialData?.company || "",
            email: initialData?.email || "",
            phone: initialData?.phone || "",
            mobile: initialData?.mobile || "",
            website: initialData?.website || "",
            title: initialData?.title || "",
            lead_status_id: initialData?.lead_status_id || "",
            source_id: initialData?.source_id || "",
            industry_id: initialData?.industry_id || "",
            rating_id: initialData?.rating_id || "",
            street: initialData?.street || "",
            city: initialData?.city || "",
            state: initialData?.state || "",
            zip: initialData?.zip || "",
            country: initialData?.country || "",
        },
    });

    async function onSubmit(data: LeadFormValues) {
        setIsLoading(true);
        try {
            const payload: LeadCreateData = {
                salutation: data.salutation,
                first_name: data.first_name,
                middle_name: data.middle_name,
                last_name: data.last_name,
                company: data.company,
                email: data.email || undefined,
                phone: data.phone,
                mobile: data.mobile,
                website: data.website,
                title: data.title,
                lead_status_id: data.lead_status_id || undefined,
                source_id: data.source_id || undefined,
                industry_id: data.industry_id || undefined,
                rating_id: data.rating_id || undefined,
                street: data.street || undefined,
                city: data.city,
                state: data.state,
                zip: data.zip,
                country: data.country,
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
                <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="salutation"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Salutation</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Mr./Mrs./Ms." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Mr.">Mr.</SelectItem>
                                        <SelectItem value="Mrs.">Mrs.</SelectItem>
                                        <SelectItem value="Ms.">Ms.</SelectItem>
                                        <SelectItem value="Dr.">Dr.</SelectItem>
                                        <SelectItem value="Prof.">Prof.</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="hidden md:block" /> { /* Spacer */}

                    <FormField
                        control={form.control}
                        name="first_name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>First Name *</FormLabel>
                                <FormControl>
                                    <Input placeholder="Sarah" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="middle_name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Middle Name</FormLabel>
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
                                    <Input placeholder="Connor" {...field} />
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
                                    <Input placeholder="sarah@example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="company"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Company</FormLabel>
                                <FormControl>
                                    <Input placeholder="Cyberdyne Systems" {...field} />
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
                        name="mobile"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Mobile</FormLabel>
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
                                    <Input placeholder="Consultant" {...field} />
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
                        name="lead_status_id"
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
                                        {statuses.map((status) => (
                                            <SelectItem key={status.id} value={status.id}>
                                                {status.name}
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
                        name="source_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Source</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a source" />
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
                        name="industry_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Industry</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an industry" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {industries.map((industry) => (
                                            <SelectItem key={industry.id} value={industry.id}>
                                                {industry.name}
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
                        name="rating_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Rating</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a rating" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {ratings.map((rating) => (
                                            <SelectItem key={rating.id} value={rating.id}>
                                                {rating.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Address</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="street"
                            render={({ field }) => (
                                <FormItem className="col-span-2">
                                    <FormLabel>Street</FormLabel>
                                    <FormControl>
                                        <Input placeholder="123 Main St" {...field} />
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
                                    <FormLabel>City</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Los Angeles" {...field} />
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
                                    <FormLabel>State</FormLabel>
                                    <FormControl>
                                        <Input placeholder="CA" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="zip"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Zip Code</FormLabel>
                                    <FormControl>
                                        <Input placeholder="90001" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="country"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Country</FormLabel>
                                    <FormControl>
                                        <Input placeholder="USA" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <LoadingButton
                    type="submit"
                    isLoading={isLoading}
                    loadingText={leadId ? "Updating..." : "Creating..."}
                >
                    {leadId ? "Update Lead" : "Create Lead"}
                </LoadingButton>
            </form>
        </Form>
    );
}
