"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { opportunityService } from "@/features/opportunities/services/opportunityService";

const opportunityFormSchema = z.object({
    name: z.string().min(2, {
        message: "Deal name must be at least 2 characters.",
    }),
    amount: z.string().min(1, "Value is required."),
    sales_stage_id: z.string().min(1, "Sales stage is required."),
    probability: z.string().min(1, "Probability is required."),
    close_date: z.string().min(1, "Close date is required."),
    account_id: z.string().optional(),
});

type OpportunityFormValues = z.infer<typeof opportunityFormSchema>;

const defaultValues: Partial<OpportunityFormValues> = {
    name: "",
    amount: "0",
    sales_stage_id: "",
    probability: "10",
    close_date: "",
    account_id: "",
};

export function OpportunityForm() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<OpportunityFormValues>({
        resolver: zodResolver(opportunityFormSchema),
        defaultValues,
    });

    async function onSubmit(data: OpportunityFormValues) {
        setIsLoading(true);
        try {
            // Convert string values to numbers for API
            const payload = {
                ...data,
                amount: Number(data.amount) || 0,
            };
            await opportunityService.createOpportunity(payload);
            router.push("/opportunities");
            router.refresh();
        } catch (error) {
            console.error("Failed to create opportunity", error);
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
                                <FormLabel>Deal Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="New Deal" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Value ($)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="5000" {...field} />
                                </FormControl>
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
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a stage" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="1">Prospecting</SelectItem>
                                        <SelectItem value="2">Qualification</SelectItem>
                                        <SelectItem value="3">Proposal</SelectItem>
                                        <SelectItem value="4">Negotiation</SelectItem>
                                        <SelectItem value="5">Closed Won</SelectItem>
                                        <SelectItem value="6">Closed Lost</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="probability"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Probability (%)</FormLabel>
                                <FormControl>
                                    <Input type="number" min="0" max="100" placeholder="50" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="close_date"
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
                                                    format(new Date(field.value), "PPP")
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
                                            selected={field.value ? new Date(field.value) : undefined}
                                            onSelect={(date) => field.onChange(date?.toISOString().split('T')[0])}
                                            disabled={(date) =>
                                                date < new Date("1900-01-01")
                                            }
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
                        name="account_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Account</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an account" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {/* Iterate accounts mock */}
                                        <SelectItem value="1">Acme Corp</SelectItem>
                                        <SelectItem value="2">Global Industries</SelectItem>
                                        <SelectItem value="3">TechStart Inc</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Creating..." : "Create Opportunity"}
                </Button>
            </form>
        </Form>
    );
}
