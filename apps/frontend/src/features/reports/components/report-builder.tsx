"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateReport } from "@/features/reports/api/use-reports";
import { ErrorHandler, ErrorType } from "@/lib/error-handler";

const reportFormSchema = z.object({
    name: z.string().min(2, "Name is required"),
    entity_type: z.string().min(1, "Entity type is required"),
    // Simplified for mvp
    columns: z.array(z.string()).min(1, "Select at least one column"),
});

type ReportFormValues = z.infer<typeof reportFormSchema>;

export function ReportBuilder() {
    const router = useRouter();
    const createReport = useCreateReport();

    const form = useForm<ReportFormValues>({
        resolver: zodResolver(reportFormSchema),
        defaultValues: {
            name: "",
            entity_type: "leads",
            columns: ["name", "email"], // Default columns
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

    const onSubmit = async (data: ReportFormValues) => {
        try {
            await ErrorHandler.withErrorHandling(async () => {
                try {
                    // Construct full payload with defaults
                    const payload = {
                        ...data,
                        report_type: 'custom',
                        filters: {},
                        order_direction: 'desc' as const,
                        chart_config: {},
                        is_public: false
                    };
                    await createReport.mutateAsync(payload);
                    router.push("/reports");
                    router.refresh();
                } catch (error: any) {
                    const mapped = handleBackendErrors(ErrorHandler.parseError(error, "Failed to save report"));
                    if (!mapped) throw error;
                }
            }, "Failed to save report");
        } catch (error) {
            // Error handled
        }
    };

    // Mock columns based on entity (In real app, fetch schema)
    const availableColumns = {
        leads: ["name", "email", "phone", "status", "source"],
        opportunities: ["name", "amount", "stage", "close_date"],
        accounts: ["name", "industry", "website", "phone"]
    };

    const entityType = form.watch("entity_type") as keyof typeof availableColumns;
    const currentColumns = availableColumns[entityType] || [];

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Report Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Q1 Sales" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="entity_type"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Module</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select module" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="leads">Leads</SelectItem>
                                    <SelectItem value="opportunities">Opportunities</SelectItem>
                                    <SelectItem value="accounts">Accounts</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="columns"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Columns</FormLabel>
                            <div className="grid grid-cols-2 gap-4 border p-4 rounded-md">
                                {currentColumns.map((col) => (
                                    <div key={col} className="flex items-center space-x-2">
                                        <Checkbox
                                            checked={field.value.includes(col)}
                                            onCheckedChange={(checked) => {
                                                return checked
                                                    ? field.onChange([...field.value, col])
                                                    : field.onChange(field.value.filter((value) => value !== col))
                                            }}
                                        />
                                        <label className="text-sm font-medium leading-none capitalize">
                                            {col}
                                        </label>
                                    </div>
                                ))}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={createReport.isPending}>
                    {createReport.isPending ? "Creating..." : "Create Report"}
                </Button>
            </form>
        </Form>
    );
}
