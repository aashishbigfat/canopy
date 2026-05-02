"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Label } from "@/components/ui/label";
import { useCreateTask, useUpdateTask } from "@/features/tasks/api/use-tasks";
import { Task } from "@/features/tasks/types";
import { useGetUsers } from "@/features/admin/api/use-users";
import { User } from "@/features/admin/types";
import { accountsService } from "@/lib/api/services/accounts.service";
import { contactsService } from "@/lib/api/services/contacts.service";
import { opportunitiesService } from "@/lib/api/services/opportunities.service";
import { ErrorHandler, ErrorType } from "@/lib/error-handler";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

// ── Schema ──────────────────────────────────────────
const taskFormSchema = z.object({
    name: z.string().min(2, "Subject is required"),
    due_date: z.string().optional(),
    status: z
        .enum(["Not Started", "In Progress", "Completed", "Deferred"])
        .default("Not Started"),
    priority: z.enum(["Low", "Normal", "High"]).default("Normal"),
    assigned_user_id: z.string().min(1, "Assignee is required"),
    description: z.string().optional(),

    // Related To
    related_to_type: z.enum(["Account", "PersonAccount", "Opportunity"]).default("Account"),
    account_id: z.string().optional(),
    contact_id: z.string().optional(),
    opportunity_id: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

// ── Props ──────────────────────────────────────────
interface TaskFormProps {
    initialData?: Task;
    onSuccess?: () => void;
    /** When true the form renders compactly inside a modal (hides outer buttons etc.) */
    embedded?: boolean;
    /** Reports mutation loading state so parent (e.g. modal footer) can show a spinner */
    onLoadingChange?: (loading: boolean) => void;
}

export function TaskForm({ initialData, onSuccess, embedded, onLoadingChange }: TaskFormProps) {
    const createTask = useCreateTask();
    const updateTask = useUpdateTask();
    const { data: usersData } = useGetUsers();
    const users = (usersData as any)?.users || usersData?.data || [];

    // ── Dynamic search state ──
    const [accountOptions, setAccountOptions] = React.useState<
        { label: string; value: string }[]
    >([]);
    const [accountLoading, setAccountLoading] = React.useState(false);

    const [personAccountOptions, setPersonAccountOptions] = React.useState<
        { label: string; value: string }[]
    >([]);
    const [personAccountLoading, setPersonAccountLoading] = React.useState(false);

    const [contactOptions, setContactOptions] = React.useState<
        { label: string; value: string }[]
    >([]);
    const [contactLoading, setContactLoading] = React.useState(false);

    const [opportunityOptions, setOpportunityOptions] = React.useState<
        { label: string; value: string }[]
    >([]);
    const [opportunityLoading, setOpportunityLoading] = React.useState(false);

    // ── Derive initial "related" state from initialData ──
    const deriveRelatedType = (): "Account" | "PersonAccount" | "Opportunity" => {
        if (!initialData) return "Account";
        if (initialData.taskable_type === "Opportunity") return "Opportunity";
        // For person accounts, taskable_type is still "Account" but the backend
        // distinguishes via the is_person_account flag. We default to Account.
        return "Account";
    };

    const form = useForm<TaskFormValues>({
        resolver: zodResolver(taskFormSchema),
        defaultValues: {
            name: initialData?.name || "",
            due_date: initialData?.due_date || "",
            status: (initialData?.status as any) || "Not Started",
            priority: (initialData?.priority as any) || "Normal",
            assigned_user_id: initialData?.assigned_user_id || "",
            description: initialData?.description || "",
            related_to_type: deriveRelatedType(),
            account_id: initialData?.account_id || initialData?.taskable_id || "",
            contact_id: initialData?.contact_id || "",
            opportunity_id:
                initialData?.taskable_type === "Opportunity"
                    ? initialData.taskable_id
                    : "",
        },
    });

    const relatedType = form.watch("related_to_type");
    const selectedAccountId = form.watch("account_id");

    // ── Auto-load contacts when an account is selected ──
    React.useEffect(() => {
        if (relatedType !== "Account" || !selectedAccountId) {
            setContactOptions([]);
            return;
        }
        let cancelled = false;
        setContactLoading(true);
        contactsService
            .getContactsByAccount(selectedAccountId)
            .then((contacts) => {
                if (cancelled) return;
                setContactOptions(
                    contacts.map((c: any) => ({
                        label: c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim(),
                        value: c.id,
                    }))
                );
            })
            .finally(() => !cancelled && setContactLoading(false));
        return () => {
            cancelled = true;
        };
    }, [selectedAccountId, relatedType]);

    // ── Reset dependent fields when related type toggles (skip initial mount for edit mode) ──
    const isFirstRender = React.useRef(true);
    React.useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        form.setValue("account_id", "");
        form.setValue("contact_id", "");
        form.setValue("opportunity_id", "");
        setContactOptions([]);
    }, [relatedType]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Search callbacks ──
    const handleAccountSearch = React.useCallback(
        async (query: string, signal?: AbortSignal) => {
            setAccountLoading(true);
            try {
                const results = await accountsService.searchAccountAutocomplete(
                    query,
                    false,
                    signal
                );
                setAccountOptions(
                    results.map((a) => ({ label: a.name, value: a.id }))
                );
            } catch {
                /* aborted */
            } finally {
                setAccountLoading(false);
            }
        },
        []
    );

    const handlePersonAccountSearch = React.useCallback(
        async (query: string, signal?: AbortSignal) => {
            setPersonAccountLoading(true);
            try {
                const results = await accountsService.searchAccountAutocomplete(
                    query,
                    true,
                    signal
                );
                setPersonAccountOptions(
                    results.map((a) => ({ label: a.name, value: a.id }))
                );
            } catch {
                /* aborted */
            } finally {
                setPersonAccountLoading(false);
            }
        },
        []
    );

    const handleOpportunitySearch = React.useCallback(
        async (query: string, signal?: AbortSignal) => {
            setOpportunityLoading(true);
            try {
                const res = await opportunitiesService.getOpportunities(
                    { search: query, page: 1, per_page: 20 },
                    { signal }
                );
                setOpportunityOptions(
                    (res.opportunities || []).map((o: any) => ({
                        label: o.name,
                        value: o.id,
                    }))
                );
            } catch {
                /* aborted */
            } finally {
                setOpportunityLoading(false);
            }
        },
        []
    );

    // ── Submit ────────────────────────────────────────
    const handleBackendErrors = (error: any) => {
        if (error.type === ErrorType.VALIDATION && error.details?.detail) {
            const details = error.details.detail;
            if (Array.isArray(details)) {
                details.forEach((err: any) => {
                    const field = err.loc?.[err.loc.length - 1];
                    if (field) {
                        form.setError(field as any, {
                            type: "manual",
                            message: err.msg,
                        });
                    }
                });
            } else if (typeof details === "string") {
                toast.error(details);
            }
            return true;
        }
        return false;
    };

    const onSubmit = async (data: TaskFormValues) => {
        // Map related-to fields → polymorphic backend fields
        const payload: any = {
            name: data.name,
            due_date: data.due_date || undefined,
            status: data.status,
            priority: data.priority,
            assigned_user_id: data.assigned_user_id || undefined,
            description: data.description || undefined,
        };

        if (data.related_to_type === "Account" && data.account_id) {
            payload.taskable_type = "Account";
            payload.taskable_id = data.account_id;
            payload.account_id = data.account_id;
            if (data.contact_id) payload.contact_id = data.contact_id;
        } else if (data.related_to_type === "PersonAccount" && data.account_id) {
            payload.taskable_type = "Account";
            payload.taskable_id = data.account_id;
            payload.account_id = data.account_id;
        } else if (data.related_to_type === "Opportunity" && data.opportunity_id) {
            payload.taskable_type = "Opportunity";
            payload.taskable_id = data.opportunity_id;
        }

        try {
            await ErrorHandler.withErrorHandling(async () => {
                try {
                    if (initialData) {
                        await updateTask.mutateAsync({ id: initialData.id, data: payload });
                        toast.success("Task updated");
                    } else {
                        await createTask.mutateAsync(payload);
                        toast.success("Task created");
                    }
                    onSuccess?.();
                } catch (error: any) {
                    const mapped = handleBackendErrors(
                        ErrorHandler.parseError(error, "Failed to save task")
                    );
                    if (!mapped) throw error;
                }
            }, "Failed to save task");
        } catch {
            // handled
        }
    };

    const isSubmitting = createTask.isPending || updateTask.isPending;

    // Report loading state to parent (modal footer)
    React.useEffect(() => {
        onLoadingChange?.(isSubmitting);
    }, [isSubmitting, onLoadingChange]);

    // ──────────────────────────────────────────
    //  RENDER
    // ──────────────────────────────────────────
    return (
        <Form {...form}>
            <form
                id="task-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
            >
                {/* ── Row 1: Subject ── */}
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Subject <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                                <Input
                                    id="task-subject"
                                    placeholder="e.g. Follow up with client"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* ── Row 2: Due Date & Assigned To ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="due_date"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Due Date</FormLabel>
                                <FormControl>
                                    <DateTimePicker
                                        value={field.value || undefined}
                                        onChange={(v) => field.onChange(v || "")}
                                        placeholder="Select due date & time"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="assigned_user_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Assigned To <span className="text-destructive">*</span></FormLabel>
                                <FormControl>
                                    <SearchableSelect
                                        options={users.map((u: any) => ({
                                            label: u.name,
                                            value: u.id || u._id,
                                        }))}
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        placeholder="Select assignee"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* ── Row 3: Status & Priority ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger id="task-status">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Not Started">Not Started</SelectItem>
                                        <SelectItem value="In Progress">In Progress</SelectItem>
                                        <SelectItem value="Deferred">Deferred</SelectItem>
                                        <SelectItem value="Completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Priority</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger id="task-priority">
                                            <SelectValue placeholder="Priority" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Low">Low</SelectItem>
                                        <SelectItem value="Normal">Normal</SelectItem>
                                        <SelectItem value="High">High</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* ── Related To Section ── */}
                <div className="space-y-3">
                    <Label className="text-sm font-medium">Related To</Label>
                    <FormField
                        control={form.control}
                        name="related_to_type"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <RadioGroup
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        className="flex flex-wrap gap-4"
                                    >
                                        <div className="flex items-center gap-2">
                                            <RadioGroupItem value="Account" id="related-account" />
                                            <Label htmlFor="related-account" className="cursor-pointer text-sm font-normal">
                                                Account
                                            </Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <RadioGroupItem value="PersonAccount" id="related-person-account" />
                                            <Label htmlFor="related-person-account" className="cursor-pointer text-sm font-normal">
                                                Person Account
                                            </Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <RadioGroupItem value="Opportunity" id="related-opportunity" />
                                            <Label htmlFor="related-opportunity" className="cursor-pointer text-sm font-normal">
                                                Opportunity
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* ── Conditional fields based on Related To ── */}
                    {relatedType === "Account" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="account_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Account</FormLabel>
                                        <FormControl>
                                            <SearchableSelect
                                                options={accountOptions}
                                                value={field.value || ""}
                                                onValueChange={field.onChange}
                                                onSearch={handleAccountSearch}
                                                isLoading={accountLoading}
                                                placeholder="Search accounts..."
                                                searchPlaceholder="Type to search..."
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="contact_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contact</FormLabel>
                                        <FormControl>
                                            <SearchableSelect
                                                options={contactOptions}
                                                value={field.value || ""}
                                                onValueChange={field.onChange}
                                                isLoading={contactLoading}
                                                placeholder={
                                                    selectedAccountId
                                                        ? "Select contact"
                                                        : "Select account first"
                                                }
                                                disabled={!selectedAccountId}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}

                    {relatedType === "PersonAccount" && (
                        <FormField
                            control={form.control}
                            name="account_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Person Account</FormLabel>
                                    <FormControl>
                                        <SearchableSelect
                                            options={personAccountOptions}
                                            value={field.value || ""}
                                            onValueChange={field.onChange}
                                            onSearch={handlePersonAccountSearch}
                                            isLoading={personAccountLoading}
                                            placeholder="Search person accounts..."
                                            searchPlaceholder="Type to search..."
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    {relatedType === "Opportunity" && (
                        <FormField
                            control={form.control}
                            name="opportunity_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Opportunity</FormLabel>
                                    <FormControl>
                                        <SearchableSelect
                                            options={opportunityOptions}
                                            value={field.value || ""}
                                            onValueChange={field.onChange}
                                            onSearch={handleOpportunitySearch}
                                            isLoading={opportunityLoading}
                                            placeholder="Search opportunities..."
                                            searchPlaceholder="Type to search..."
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </div>

                {/* ── Comments ── */}
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Comments</FormLabel>
                            <FormControl>
                                <Textarea
                                    id="task-comments"
                                    placeholder="Add notes or context..."
                                    rows={3}
                                    className="resize-none"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* ── Submit (hidden when embedded — modal renders its own footer) ── */}
                {!embedded && (
                    <Button
                        id="task-submit-btn"
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full sm:w-auto"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving…
                            </>
                        ) : initialData ? (
                            "Update Task"
                        ) : (
                            "Create Task"
                        )}
                    </Button>
                )}
            </form>
        </Form>
    );
}
