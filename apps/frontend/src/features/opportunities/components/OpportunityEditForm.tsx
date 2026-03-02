"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { CalendarIcon, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

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
import { Textarea } from "@/components/ui/textarea";
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
import { useUpdateOpportunity, useExperiences } from "../api/useOpportunities";
import { Opportunity } from "../types";
import { normalizeSalesStages, getProbabilityForStageId, StageWithProbability } from "@/features/opportunities/utils/stageConfig";
import { toast } from "sonner";

const opportunityFormSchema = z.object({
    name: z.string().min(2, {
        message: "Deal name must be at least 2 characters.",
    }),
    amount: z.string().optional(),
    sales_stage_id: z.string().min(1, "Sales stage is required."),
    probability: z.string().optional(),
    close_date: z.string().optional(),
    travel_date: z.string().optional(),
    experience_id: z.string().optional(),
    no_of_pax: z.string().optional(),
    no_of_adults: z.string().optional(),
    no_of_nights: z.string().optional(),
    description: z.string().optional(),
});

type OpportunityFormValues = z.infer<typeof opportunityFormSchema>;

interface OpportunityEditFormProps {
    opportunity: Opportunity;
    stages: StageWithProbability[];
}

export function OpportunityEditForm({ opportunity, stages }: OpportunityEditFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const updateOpportunity = useUpdateOpportunity();
    const { data: experiences } = useExperiences();
    const normalizedStages = normalizeSalesStages(stages);

    const [isProbabilityManuallyEdited, setIsProbabilityManuallyEdited] = useState(false);

    const form = useForm<OpportunityFormValues>({
        resolver: zodResolver(opportunityFormSchema),
        defaultValues: {
            name: opportunity.name || "",
            amount: opportunity.amount?.toString() || "0",
            sales_stage_id: opportunity.sales_stage_id || "",
            probability: opportunity.probability?.toString() || "10",
            close_date: new Date().toISOString().split('T')[0],
            travel_date: opportunity.travel_date || "",
            experience_id: opportunity.experience_id || "",
            no_of_pax: opportunity.no_of_pax?.toString() || "",
            no_of_adults: opportunity.no_of_adults?.toString() || "",
            no_of_nights: opportunity.no_of_nights?.toString() || "",
            description: opportunity.description || "",
        },
    });

    const selectedStageId = form.watch("sales_stage_id");

    // Auto-set probability when sales stage changes (unless user has edited it manually)
    useEffect(() => {
        if (!selectedStageId || isProbabilityManuallyEdited) return;
        const stageProbability = getProbabilityForStageId(selectedStageId, normalizedStages);
        if (typeof stageProbability === "number") {
            form.setValue("probability", stageProbability.toString());
        }
    }, [selectedStageId, isProbabilityManuallyEdited, normalizedStages, form]);

    async function onSubmit(data: OpportunityFormValues) {
        setIsLoading(true);
        try {
            // Convert string values to numbers for API
            const payload: any = {
                name: data.name,
                sales_stage_id: data.sales_stage_id,
            };

            if (data.amount) payload.amount = Number(data.amount);
            if (data.probability) payload.probability = Number(data.probability);
            if (data.close_date) payload.close_date = data.close_date;
            if (data.travel_date) payload.travel_date = data.travel_date;
            if (data.experience_id && data.experience_id !== "none") payload.experience_id = data.experience_id;
            if (data.no_of_pax) payload.no_of_pax = Number(data.no_of_pax);
            if (data.no_of_adults) payload.no_of_adults = Number(data.no_of_adults);
            if (data.no_of_nights) payload.no_of_nights = Number(data.no_of_nights);
            if (data.description) payload.description = data.description;

            await updateOpportunity.mutateAsync({
                id: opportunity.id,
                data: payload
            });

            toast.success("Opportunity updated successfully");
            router.push(`/opportunities/${opportunity.id}`);
            router.refresh();
        } catch (error) {
            console.error("Failed to update opportunity", error);
            toast.error("Failed to update opportunity");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                    <Link href={`/opportunities/${opportunity.id}`}>
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                </Button>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid gap-6 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Opportunity Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter opportunity name" {...field} />
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
                                    <FormLabel>Amount ($)</FormLabel>
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
                                    <FormLabel>Sales Stage *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a stage" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {normalizedStages.map((stage) => (
                                                <SelectItem key={stage.id} value={stage.id}>
                                                    {stage.name}
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
                            name="probability"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Probability (%)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            placeholder="50"
                                            {...field}
                                            onChange={(e) => {
                                                setIsProbabilityManuallyEdited(true);
                                                field.onChange(e);
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="experience_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Experience</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select an experience" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {experiences?.map((exp: any) => (
                                                <SelectItem key={exp.id} value={exp.id}>
                                                    {exp.name}
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
                            name="close_date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Expected Close Date</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    disabled
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
                                                captionLayout="dropdown"
                                                startMonth={new Date(1900, 0)}
                                                endMonth={new Date(2100, 11)}
                                                selected={field.value ? new Date(field.value) : undefined}
                                                onSelect={(date) => {
                                                    if (!date) return field.onChange(undefined);
                                                    const year = date.getFullYear();
                                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                                    const day = String(date.getDate()).padStart(2, '0');
                                                    field.onChange(`${year}-${month}-${day}`);
                                                }}
                                                disabled={(date) => {
                                                    const today = new Date();
                                                    today.setHours(0, 0, 0, 0);
                                                    const compareDate = new Date(date);
                                                    compareDate.setHours(0, 0, 0, 0);
                                                    return compareDate.getTime() !== today.getTime();
                                                }}
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
                            name="travel_date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Travel Date</FormLabel>
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
                                                captionLayout="dropdown"
                                                startMonth={new Date(1900, 0)}
                                                endMonth={new Date(2100, 11)}
                                                selected={field.value ? new Date(field.value) : undefined}
                                                onSelect={(date) => {
                                                    if (!date) return field.onChange(undefined);
                                                    const year = date.getFullYear();
                                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                                    const day = String(date.getDate()).padStart(2, '0');
                                                    field.onChange(`${year}-${month}-${day}`);
                                                }}
                                                disabled={(date) => {
                                                    const today = new Date();
                                                    today.setHours(0, 0, 0, 0);
                                                    return date < today;
                                                }}
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
                            name="no_of_pax"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Number of Pax</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="4" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="no_of_adults"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Number of Adults</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="2" {...field} />
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
                                    <FormLabel>Number of Nights</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="7" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Enter opportunity description..."
                                        className="min-h-[100px]"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="flex gap-4">
                        <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                            {isLoading ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push(`/opportunities/${opportunity.id}`)}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
