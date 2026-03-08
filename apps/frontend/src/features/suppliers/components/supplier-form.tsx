"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateSupplier, useUpdateSupplier } from "@/features/suppliers/api/use-suppliers";
import { Supplier } from "@/features/suppliers/types";

const supplierFormSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    supplier_type: z.string().min(1, "Supplier type is required."),
    email: z.string().email("Invalid email address.").optional().or(z.literal("")),
    phone: z.string()
        .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/, {
            message: "Please enter a valid phone number (e.g. +91 9876543210).",
        }).optional().or(z.literal("")),
    company_name: z.string().optional(),
    contact_person_name: z.string().optional(),
    contact_person_email: z.string().email("Invalid email address.").optional().or(z.literal("")),
    contact_person_phone: z.string()
        .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/, {
            message: "Please enter a valid phone number (e.g. +91 9876543210).",
        }).optional().or(z.literal("")),
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
    website: z.string().optional(),
    payment_terms: z.string().optional(),
    credit_limit: z.number().optional(),
    notes: z.string().optional(),
    is_preferred: z.boolean().optional(),
    is_active: z.boolean().optional(),
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

interface SupplierFormProps {
    initialData?: Supplier;
    onSuccess?: () => void;
}

export function SupplierForm({ initialData, onSuccess }: SupplierFormProps) {
    const router = useRouter();
    const createSupplier = useCreateSupplier();
    const updateSupplier = useUpdateSupplier();

    const form = useForm<SupplierFormValues>({
        resolver: zodResolver(supplierFormSchema),
        defaultValues: {
            name: initialData?.name || "",
            supplier_type: initialData?.supplier_type || "Hotel",
            email: initialData?.email || "",
            phone: initialData?.phone || "",
            company_name: initialData?.company_name || "",
            contact_person_name: initialData?.contact_person_name || "",
            contact_person_email: initialData?.contact_person_email || "",
            contact_person_phone: initialData?.contact_person_phone || "",
            street: initialData?.street || "",
            city: initialData?.city || "",
            state: initialData?.state || "",
            zip: initialData?.zip || "",
            country: initialData?.country || "",
            website: initialData?.website || "",
            payment_terms: initialData?.payment_terms || "",
            credit_limit: initialData?.credit_limit,
            notes: initialData?.notes || "",
            is_preferred: initialData?.is_preferred || false,
            is_active: initialData?.is_active ?? true,
        },
    });

    const onSubmit = async (data: SupplierFormValues) => {
        try {
            if (initialData) {
                await updateSupplier.mutateAsync({ id: initialData.id, data });
            } else {
                await createSupplier.mutateAsync(data);
            }
            form.reset();
            router.refresh();
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error("Failed to save supplier", error);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Supplier Name" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="supplier_type"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Supplier Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Hotel">Hotel</SelectItem>
                                    <SelectItem value="Transport">Transport</SelectItem>
                                    <SelectItem value="Guide">Guide</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="company_name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Company Name" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={createSupplier.isPending || updateSupplier.isPending}>
                    {createSupplier.isPending || updateSupplier.isPending ? "Saving..." : "Save Supplier"}
                </Button>
            </form>
        </Form>
    );
}
