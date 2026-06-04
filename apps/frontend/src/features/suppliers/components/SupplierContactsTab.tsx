"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    UserPlus,
    Mail,
    Phone,
    Smartphone,
    Star,
    Trash2,
    Edit2,
    X,
    Briefcase,
    Building2,
    Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/ui/phone-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { suppliersService } from "@/lib/api/services/suppliers.service";
import type { Supplier, SupplierContact, SupplierContactCreateData } from "../types";

// ── Zod Schema (matches system-wide pattern from ContactForm, SupplierForm) ──

const leadPhoneRegex = /^\+?\d{1,4}\s\d{10}$/;

const supplierContactFormSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    designation: z.string().optional().or(z.literal("")),
    department: z.string().optional().or(z.literal("")),
    email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal(""))
        .refine(val => !val || leadPhoneRegex.test(val), {
            message: "Please select a country code and enter exactly a 10-digit number.",
        }),
    mobile: z.string().optional().or(z.literal(""))
        .refine(val => !val || leadPhoneRegex.test(val), {
            message: "Please select a country code and enter exactly a 10-digit number.",
        }),
    is_primary: z.boolean().optional(),
    notes: z.string().optional().or(z.literal("")),
});

type SupplierContactFormValues = z.infer<typeof supplierContactFormSchema>;

interface SupplierContactsTabProps {
    supplier: Supplier;
}

export function SupplierContactsTab({ supplier }: SupplierContactsTabProps) {
    const supplierId = supplier.id;
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [editingContact, setEditingContact] = useState<SupplierContact | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<SupplierContact | null>(null);

    // Contacts are embedded on the supplier — already loaded, no extra request.
    const contacts = [...(supplier.contacts ?? [])].sort(
        (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.name.localeCompare(b.name)
    );

    // Refreshing the supplier query reloads the embedded contacts.
    const refreshSupplier = () =>
        queryClient.invalidateQueries({ queryKey: ["suppliers", supplierId] });

    const createMutation = useMutation({
        mutationFn: (formData: SupplierContactCreateData) =>
            suppliersService.createSupplierContact(supplierId, formData),
        onSuccess: () => {
            toast.success("Contact added successfully");
            refreshSupplier();
            setShowForm(false);
        },
        onError: () => toast.error("Failed to add contact"),
    });

    const updateMutation = useMutation({
        mutationFn: ({ contactId, data }: { contactId: string; data: Partial<SupplierContactCreateData> }) =>
            suppliersService.updateSupplierContact(supplierId, contactId, data),
        onSuccess: () => {
            toast.success("Contact updated");
            refreshSupplier();
            setEditingContact(null);
        },
        onError: () => toast.error("Failed to update contact"),
    });

    const deleteMutation = useMutation({
        mutationFn: (contactId: string) =>
            suppliersService.deleteSupplierContact(supplierId, contactId),
        onSuccess: () => {
            toast.success("Contact removed");
            refreshSupplier();
            setDeleteTarget(null);
        },
        onError: () => toast.error("Failed to delete contact"),
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">
                        Contacts <span className="text-muted-foreground text-sm font-normal">({contacts.length})</span>
                    </h3>
                </div>
                {!showForm && !editingContact && (
                    <Button
                        onClick={() => setShowForm(true)}
                        size="sm"
                        className="gap-1.5"
                    >
                        <UserPlus className="h-4 w-4" /> Add Contact
                    </Button>
                )}
            </div>

            {/* Add/Edit Form */}
            {(showForm || editingContact) && (
                <ContactForm
                    initial={editingContact}
                    isSubmitting={createMutation.isPending || updateMutation.isPending}
                    onSubmit={(formData) => {
                        if (editingContact) {
                            updateMutation.mutate({ contactId: editingContact.id, data: formData });
                        } else {
                            createMutation.mutate(formData);
                        }
                    }}
                    onCancel={() => {
                        setShowForm(false);
                        setEditingContact(null);
                    }}
                />
            )}

            {/* Contacts list */}
            {contacts.length === 0 && !showForm ? (
                <div className="crm-empty-state">
                    <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground text-sm">No contacts added yet.</p>
                    <p className="text-muted-foreground text-xs mt-1">Add contacts to manage all people associated with this supplier.</p>
                    <Button
                        onClick={() => setShowForm(true)}
                        variant="outline"
                        size="sm"
                        className="mt-4 gap-1.5"
                    >
                        <UserPlus className="h-4 w-4" /> Add First Contact
                    </Button>
                </div>
            ) : (
                <div className="grid gap-3">
                    {contacts.map((contact) => (
                        <ContactCard
                            key={contact.id}
                            contact={contact}
                            onEdit={() => {
                                setShowForm(false);
                                setEditingContact(contact);
                            }}
                            onDelete={() => setDeleteTarget(contact)}
                        />
                    ))}
                </div>
            )}

            {/* Delete confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Contact?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove <strong>{deleteTarget?.name}</strong> from this supplier?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                            disabled={deleteMutation.isPending}
                            className="text-white"
                        >
                            {deleteMutation.isPending ? "Removing..." : "Remove"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}


// ── Contact Card ────────────────────────────────────────────────

function ContactCard({
    contact,
    onEdit,
    onDelete,
}: {
    contact: SupplierContact;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <div className="group relative flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all">
            {/* Avatar */}
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {contact.name.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">{contact.name}</span>
                    {contact.is_primary && (
                        <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40 text-[10px] px-1.5 py-0 font-semibold gap-0.5">
                            <Star className="h-2.5 w-2.5" /> Primary
                        </Badge>
                    )}
                </div>
                {(contact.designation || contact.department) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {contact.designation && <><Briefcase className="h-3 w-3" />{contact.designation}</>}
                        {contact.designation && contact.department && <span className="text-muted-foreground">•</span>}
                        {contact.department && <><Building2 className="h-3 w-3" />{contact.department}</>}
                    </p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                    {contact.email && (
                        <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-primary">
                            <Mail className="h-3 w-3" />{contact.email}
                        </a>
                    )}
                    {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:text-primary">
                            <Phone className="h-3 w-3" />{contact.phone}
                        </a>
                    )}
                    {contact.mobile && (
                        <a href={`tel:${contact.mobile}`} className="flex items-center gap-1 hover:text-primary">
                            <Smartphone className="h-3 w-3" />{contact.mobile}
                        </a>
                    )}
                </div>
                {contact.notes && (
                    <p className="text-xs text-muted-foreground italic mt-1">{contact.notes}</p>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={onEdit}>
                    <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400" onClick={onDelete}>
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}


// ── Contact Form (uses react-hook-form + zod like all other forms) ──────────

function ContactForm({
    initial,
    isSubmitting,
    onSubmit,
    onCancel,
}: {
    initial: SupplierContact | null;
    isSubmitting: boolean;
    onSubmit: (data: SupplierContactCreateData) => void;
    onCancel: () => void;
}) {
    const form = useForm<SupplierContactFormValues>({
        resolver: zodResolver(supplierContactFormSchema),
        defaultValues: {
            name: initial?.name ?? "",
            designation: initial?.designation ?? "",
            department: initial?.department ?? "",
            email: initial?.email ?? "",
            phone: initial?.phone ?? "",
            mobile: initial?.mobile ?? "",
            is_primary: initial?.is_primary ?? false,
            notes: initial?.notes ?? "",
        },
    });

    const handleSubmit = (values: SupplierContactFormValues) => {
        onSubmit({
            name: values.name.trim(),
            designation: values.designation?.trim() || undefined,
            department: values.department?.trim() || undefined,
            email: values.email?.trim() || undefined,
            phone: values.phone?.trim() || undefined,
            mobile: values.mobile?.trim() || undefined,
            is_primary: values.is_primary,
            notes: values.notes?.trim() || undefined,
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="border border-primary/40 bg-primary/5 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground">
                        {initial ? "Edit Contact" : "New Contact"}
                    </h4>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Name <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                    <Input placeholder="Full name" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="designation"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Designation</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Sales Manager" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Department</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Reservations" {...field} />
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
                                    <Input placeholder="email@example.com" {...field} />
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
                                    <PhoneInput placeholder="Phone number" {...field} />
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
                                    <PhoneInput placeholder="Mobile number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Any notes about this contact..." {...field} className="min-h-[60px]" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex items-center justify-between pt-1">
                    <FormField
                        control={form.control}
                        name="is_primary"
                        render={({ field }) => (
                            <FormItem className="flex items-center gap-2 space-y-0">
                                <FormControl>
                                    <Checkbox
                                        id="primary"
                                        checked={field.value}
                                        onCheckedChange={(checked) => field.onChange(checked === true)}
                                    />
                                </FormControl>
                                <Label htmlFor="primary" className="text-xs text-muted-foreground cursor-pointer">
                                    Mark as Primary Contact
                                </Label>
                            </FormItem>
                        )}
                    />
                    <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" className="text-white" disabled={isSubmitting}>
                            {isSubmitting ? (initial ? "Updating..." : "Creating...") : (initial ? "Update" : "Add Contact")}
                        </Button>
                    </div>
                </div>
            </form>
        </Form>
    );
}
