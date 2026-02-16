"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, SubmitHandler, Resolver } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import {
    Calendar as CalendarIcon,
    Building2,
    UserCircle2,
    Briefcase,
    Plus,
    CheckCircle2
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { opportunityService } from "@/features/opportunities/services/opportunityService";
import { useSearchParams } from "next/navigation";
import { useAccounts } from "@/features/accounts/api/useAccounts";
import { useContacts } from "@/features/contacts/api/useContacts";
import { useSalesStages, useExperiences } from "@/features/opportunities/api/useOpportunities";
import { destinationsService, Destination } from "@/lib/api/services/destinations.service";

const opportunityFormSchema = z.object({
    name: z.string().min(2, "Deal name is required"),
    amount: z.coerce.number().min(0).default(0),
    sales_stage_id: z.string().min(1, "Sales stage is required"),
    probability: z.coerce.number().min(0).max(100).default(10),
    close_date: z.date(),
    travel_date: z.date().optional(),
    account_id: z.string().min(1, "Account is required"),
    contact_id: z.string().optional(),
    experience_id: z.string().optional(),
    destination_ids: z.array(z.string()).default([]),
    no_of_adults: z.coerce.number().min(0).default(1),
    no_of_childs: z.coerce.number().min(0).default(0),
    no_of_infants: z.coerce.number().min(0).default(0),
    no_of_pax: z.coerce.number().min(0).default(1),
    no_of_nights: z.coerce.number().min(0).default(0),
    description: z.string().optional(),
});

interface OpportunityFormValues {
    name: string;
    amount: number;
    sales_stage_id: string;
    probability: number;
    close_date: Date;
    travel_date?: Date;
    account_id: string;
    contact_id?: string;
    experience_id?: string;
    destination_ids: string[];
    no_of_adults: number;
    no_of_childs: number;
    no_of_infants: number;
    no_of_pax: number;
    no_of_nights: number;
    description?: string;
}

export function OpportunityForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const accountId = searchParams.get("accountId") || "";
    const contactId = searchParams.get("contactId") || "";

    const [isLoading, setIsLoading] = useState(false);
    const [availableDestinations, setAvailableDestinations] = useState<Destination[]>([]);
    const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(false);

    // Fetch real data
    const { data: accountsData } = useAccounts({ per_page: 100 });
    const { data: contactsData } = useContacts({ per_page: 100 });
    const { data: salesStagesData } = useSalesStages();
    const { data: experiencesData } = useExperiences();

    useEffect(() => {
        destinationsService.getDestinations({ limit: 1000 }).then(res => {
            setAvailableDestinations(res.destinations);
        });
    }, []);

    const accounts = accountsData?.accounts || [];
    const contacts = contactsData?.contacts || [];
    const salesStages = salesStagesData || [];
    const experiences = experiencesData || [];

    const form = useForm<OpportunityFormValues>({
        resolver: zodResolver(opportunityFormSchema) as Resolver<OpportunityFormValues>,
        defaultValues: {
            name: "",
            amount: 0,
            sales_stage_id: "",
            probability: 10,
            close_date: new Date(),
            account_id: accountId,
            contact_id: contactId,
            experience_id: "",
            no_of_adults: 1,
            no_of_childs: 0,
            no_of_infants: 0,
            no_of_pax: 1,
            no_of_nights: 0,
            destination_ids: [],
            description: "",
        },
    });

    // Reset if params change
    useEffect(() => {
        if (accountId) form.setValue("account_id", accountId);
        if (contactId) form.setValue("contact_id", contactId);
    }, [accountId, contactId]);

    const adults = form.watch("no_of_adults") || 0;
    const childs = form.watch("no_of_childs") || 0;
    const infants = form.watch("no_of_infants") || 0;
    const travelDate = form.watch("travel_date");
    const selectedDestIds = form.watch("destination_ids");
    const selectedAccountId = form.watch("account_id");
    const selectedContactId = form.watch("contact_id");

    // Auto-select Account when Contact is selected
    useEffect(() => {
        if (selectedContactId && selectedContactId !== "none") {
            const contact = contacts.find(c => c.id === selectedContactId);
            if (contact && contact.account_id && contact.account_id !== selectedAccountId) {
                form.setValue("account_id", contact.account_id);
            }
        }
    }, [selectedContactId, contacts, selectedAccountId, form]);

    // Clear Contact if it doesn't belong to the selected Account
    useEffect(() => {
        if (selectedAccountId && selectedContactId) {
            const contact = contacts.find(c => c.id === selectedContactId);
            if (contact && contact.account_id && contact.account_id !== selectedAccountId) {
                form.setValue("contact_id", "");
            }
        }
    }, [selectedAccountId, selectedContactId, contacts, form]);

    // Auto-calculate Pax
    useEffect(() => {
        const totalPax = (Number(adults) || 0) + (Number(childs) || 0) + (Number(infants) || 0);
        form.setValue("no_of_pax", totalPax);
    }, [adults, childs, infants, form]);

    // Auto-generate name: [Destination]_[Pax]Pax_[TravelDate]
    useEffect(() => {
        if (isNameManuallyEdited) return;

        const pax = form.getValues("no_of_pax") || 0;
        let destName = "Opportunity";

        if (selectedDestIds && selectedDestIds.length > 0) {
            const match = availableDestinations.find(d => d.id === selectedDestIds[0]);
            if (match) destName = match.name;
        } else if (selectedAccountId) {
            const account = accounts.find(a => a.id === selectedAccountId);
            if (account) destName = account.name;
        }

        let dateStr = "";
        if (travelDate instanceof Date && !isNaN(travelDate.getTime())) {
            dateStr = `_${format(travelDate, "ddMMM")}`;
        }

        const newName = `${destName}_${pax}Pax${dateStr}`;
        form.setValue("name", newName);
    }, [selectedDestIds, selectedAccountId, adults, childs, infants, travelDate, availableDestinations, isNameManuallyEdited, form, accounts]);

    const onSubmit: SubmitHandler<OpportunityFormValues> = async (data) => {
        setIsLoading(true);
        try {
            await opportunityService.createOpportunity({
                ...data,
                close_date: data.close_date.toISOString(),
                travel_date: data.travel_date?.toISOString(),
            } as any);
            router.push("/opportunities");
            router.refresh();
        } catch (error) {
            console.error("Failed to create opportunity", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Account & Contact */}
                    <div className="space-y-8">
                        <Card className="border-blue-100 bg-blue-50/30">
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex items-center gap-2 font-semibold text-blue-800 border-b border-blue-100 pb-2">
                                    <Building2 className="h-5 w-5" />
                                    <h3>Account Selection</h3>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="account_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Account</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="bg-white">
                                                        <SelectValue placeholder="Select an account..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {accounts.map((acc) => (
                                                        <SelectItem key={acc.id} value={acc.id}>
                                                            {acc.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        <Card className="border-indigo-100 bg-indigo-50/30">
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex items-center gap-2 font-semibold text-indigo-800 border-b border-indigo-100 pb-2">
                                    <UserCircle2 className="h-5 w-5" />
                                    <h3>Contact Details</h3>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="contact_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Link to Contact (Optional)</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="bg-white">
                                                        <SelectValue placeholder="Select a contact..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="none">-- Select Contact --</SelectItem>
                                                    {contacts
                                                        .filter(c => !selectedAccountId || c.account_id === selectedAccountId)
                                                        .map((con) => (
                                                            <SelectItem key={con.id} value={con.id}>
                                                                {con.full_name}
                                                            </SelectItem>
                                                        ))
                                                    }
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Opportunity Details */}
                    <div className="space-y-8 lg:col-span-2">
                        <Card className="border-orange-100 bg-orange-50/30">
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex items-center gap-2 font-semibold text-orange-800 border-b border-orange-100 pb-2">
                                    <Briefcase className="h-5 w-5" />
                                    <h3>Opportunity Details</h3>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Opportunity Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    className="bg-white"
                                                    onChange={(e) => {
                                                        field.onChange(e);
                                                        setIsNameManuallyEdited(true);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                                            captionLayout="dropdown"
                                                            startMonth={new Date(1900, 0)}
                                                            endMonth={new Date(2100, 11)}
                                                            selected={field.value}
                                                            onSelect={field.onChange}
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
                                                            captionLayout="dropdown"
                                                            startMonth={new Date(1900, 0)}
                                                            endMonth={new Date(2100, 11)}
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

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="experience_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Experience</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="bg-white">
                                                            <SelectValue placeholder="Select experience..." />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {experiences.map(exp => (
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
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="bg-white">
                                                            <SelectValue placeholder="Select stage..." />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {salesStages.map(stage => (
                                                            <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="amount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Value ($)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} className="bg-white" />
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
                                                <FormLabel>Nights</FormLabel>
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
                                    name="destination_ids"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Destinations</FormLabel>
                                            <FormControl>
                                                <div className="border rounded-md p-3 bg-white max-h-[150px] overflow-y-auto space-y-2">
                                                    {availableDestinations.map((dest) => (
                                                        <div key={dest.id} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                checked={field.value?.includes(dest.id)}
                                                                onCheckedChange={(checked) => {
                                                                    const current = field.value || [];
                                                                    if (checked) {
                                                                        field.onChange([...current, dest.id]);
                                                                    } else {
                                                                        field.onChange(current.filter(id => id !== dest.id));
                                                                    }
                                                                }}
                                                            />
                                                            <label className="text-sm font-medium cursor-pointer">
                                                                {dest.name}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-4 gap-3 border p-4 rounded-lg bg-white shadow-sm">
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
                                                    <Input type="number" {...field} disabled className="h-8 text-xs bg-blue-50 font-bold" />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description / Notes</FormLabel>
                                            <FormControl>
                                                <Textarea {...field} className="bg-white" placeholder="Add any specific requirements..." />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[200px]">
                        {isLoading ? "Creating..." : "Create Opportunity"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
