"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { useCreateEvent, useUpdateEvent } from "@/features/events/api/use-events";
import { useGetUsers } from "@/features/admin/api/use-users";
import { Event } from "@/features/events/types";
import { User } from "@/features/admin/types";
import { ErrorHandler, ErrorType } from "@/lib/error-handler";

const eventFormSchema = z.object({
    name: z.string().min(2, "Subject is required."),
    description: z.string().optional(),
    location: z.string().optional(),
    start_datetime: z.date(),
    end_datetime: z.date(),
    all_day: z.boolean().default(false),
    event_type: z.string().min(1, "Type is required."),
    status: z.enum(["Planned", "Held", "Not Held", "Cancelled"]).default("Planned"),
    eventable_type: z.enum(["Account", "Contact", "Lead", "Opportunity"]).optional(),
    eventable_id: z.string().optional(),
    assigned_user_ids: z.array(z.string()).default([]),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

interface EventFormProps {
    initialData?: Event;
}

export function EventForm({ initialData }: EventFormProps) {
    const router = useRouter();
    const createEvent = useCreateEvent();
    const updateEvent = useUpdateEvent();
    const { data: usersData } = useGetUsers({ page: 1, limit: 100 });
    const users = usersData?.data || [];

    const form = useForm({
        resolver: zodResolver(eventFormSchema),
        defaultValues: {
            name: initialData?.name || "",
            description: initialData?.description || "",
            location: initialData?.location || "",
            start_datetime: initialData?.start_datetime ? new Date(initialData.start_datetime) : undefined,
            end_datetime: initialData?.end_datetime ? new Date(initialData.end_datetime) : undefined,
            all_day: initialData?.all_day || false,
            event_type: initialData?.event_type || "Meeting",
            status: initialData?.status || "Planned",
            eventable_type: initialData?.eventable_type,
            eventable_id: initialData?.eventable_id || "",
            assigned_user_ids: initialData?.assigned_user_ids || [],
        },
    });

    const handleBackendErrors = (error: any) => {
        if (error.type === ErrorType.VALIDATION && error.details?.detail) {
            const details = error.details.detail;
            details.forEach((err: any) => {
                const field = err.loc[err.loc.length - 1];
                form.setError(field as any, {
                    type: "manual",
                    message: err.msg,
                });
            });
            return true;
        }
        return false;
    };

    const onSubmit = async (data: EventFormValues) => {
        try {
            await ErrorHandler.withErrorHandling(async () => {
                try {
                    const formattedData = {
                        ...data,
                        start_datetime: data.start_datetime.toISOString(),
                        end_datetime: data.end_datetime.toISOString(),
                    };

                    if (initialData) {
                        await updateEvent.mutateAsync({ id: initialData.id, data: formattedData });
                    } else {
                        await createEvent.mutateAsync(formattedData);
                    }
                    router.push("/events");
                    router.refresh();
                } catch (error: any) {
                    const mapped = handleBackendErrors(ErrorHandler.parseError(error, "Failed to save event"));
                    if (!mapped) throw error;
                }
            }, "Failed to save event");
        } catch (error) {
            // Handled
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Subject</FormLabel>
                                <FormControl>
                                    <Input placeholder="Client Meeting" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="event_type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Meeting">Meeting</SelectItem>
                                        <SelectItem value="Call">Call</SelectItem>
                                        <SelectItem value="Email">Email</SelectItem>
                                        <SelectItem value="Task">Task</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="start_datetime"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Start Date & Time</FormLabel>
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
                                                    format(field.value, "PPP p")
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
                                        <div className="p-3 border-t">
                                            <Input
                                                type="time"
                                                onChange={(e) => {
                                                    const date = field.value || new Date();
                                                    const [hours, minutes] = e.target.value.split(':');
                                                    date.setHours(parseInt(hours), parseInt(minutes));
                                                    field.onChange(date);
                                                }}
                                            />
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="end_datetime"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>End Date & Time</FormLabel>
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
                                                    format(field.value, "PPP p")
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
                                        <div className="p-3 border-t">
                                            <Input
                                                type="time"
                                                onChange={(e) => {
                                                    const date = field.value || new Date();
                                                    const [hours, minutes] = e.target.value.split(':');
                                                    date.setHours(parseInt(hours), parseInt(minutes));
                                                    field.onChange(date);
                                                }}
                                            />
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                                <Input placeholder="Conference Room A" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Agenda and notes..."
                                    className="resize-none"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Planned">Planned</SelectItem>
                                        <SelectItem value="Held">Held</SelectItem>
                                        <SelectItem value="Not Held">Not Held</SelectItem>
                                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="assigned_user_ids"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Assigned To</FormLabel>
                                <FormControl>
                                    <SearchableSelect
                                        options={users.map((user: User) => ({
                                            label: user.name,
                                            value: user._id
                                        }))}
                                        onValueChange={(value) => {
                                            if (value && !field.value?.includes(value)) {
                                                field.onChange([...(field.value || []), value]);
                                            }
                                        }}
                                        placeholder="Select users"
                                    />
                                </FormControl>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {(field.value || []).map((userId: string) => {
                                        const user = users.find((u: User) => u._id === userId);
                                        return user ? (
                                            <div key={userId} className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs flex items-center gap-1">
                                                {user.name}
                                                <button
                                                    type="button"
                                                    onClick={() => field.onChange((field.value || []).filter((id: string) => id !== userId))}
                                                    className="hover:text-destructive"
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        ) : null;
                                    })}
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-2 border p-4 rounded-md">
                    <div className="col-span-2 font-medium">Related Entity (Optional)</div>
                    <FormField
                        control={form.control}
                        name="eventable_type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Entity Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select entity type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Account">Account</SelectItem>
                                        <SelectItem value="Contact">Contact</SelectItem>
                                        <SelectItem value="Lead">Lead</SelectItem>
                                        <SelectItem value="Opportunity">Opportunity</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="eventable_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Entity ID</FormLabel>
                                <FormControl>
                                    <Input placeholder="ID of the related entity" {...field} />
                                </FormControl>
                                <FormDescription>
                                    Enter the ID of the related record (e.g., Contact ID). Future versions will have a lookup.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Button type="submit" disabled={createEvent.isPending || updateEvent.isPending}>
                    {createEvent.isPending || updateEvent.isPending ? "Saving..." : "Save Event"}
                </Button>
            </form>
        </Form>
    );
}
