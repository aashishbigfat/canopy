"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useSuppliers, useUpdateSupplier } from "@/features/suppliers/api/use-suppliers";
import { SupplierActions } from "./supplier-actions";
import { Supplier } from "@/features/suppliers/types";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIndustryLabels } from "@/lib/industry-labels";

// Inline-editable text cell. Renders the value (optionally as a link to the
// supplier detail) with a hover pencil; clicking it edits the single field.
function EditableSupplierCell({
    supplier,
    field,
    asLink = false,
    placeholder = "-",
}: {
    supplier: Supplier;
    field: "name" | "phone" | "email";
    asLink?: boolean;
    placeholder?: string;
}) {
    const updateSupplier = useUpdateSupplier();
    const initial = (supplier[field] as string) || "";
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(initial);

    useEffect(() => setValue(initial), [initial]);

    const save = async () => {
        if (value === initial) {
            setEditing(false);
            return;
        }
        try {
            await updateSupplier.mutateAsync({ id: supplier.id, data: { [field]: value } });
            toast.success("Updated");
            setEditing(false);
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || "Failed to update");
        }
    };

    if (editing) {
        return (
            <div className="flex items-center gap-1">
                <Input
                    autoFocus
                    value={value}
                    disabled={updateSupplier.isPending}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") save();
                        if (e.key === "Escape") { setValue(initial); setEditing(false); }
                    }}
                    className="h-7 w-44 text-sm"
                />
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={save} disabled={updateSupplier.isPending}>
                    {updateSupplier.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-green-500" />}
                </Button>
            </div>
        );
    }

    return (
        <div className="group/edit flex items-center gap-1.5">
            {asLink ? (
                <Link href={`/suppliers/${supplier.id}`} className="cursor-pointer font-medium text-primary hover:underline">
                    {initial || placeholder}
                </Link>
            ) : (
                <span>{initial || placeholder}</span>
            )}
            <button
                type="button"
                onClick={() => setEditing(true)}
                className="opacity-0 transition-opacity group-hover/edit:opacity-100"
                title="Edit"
            >
                <Pencil className="h-3 w-3 text-primary" />
            </button>
        </div>
    );
}

export function SupplierList() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const labels = useIndustryLabels();

    const page = parseInt(searchParams.get("page") || "1");
    const per_page = parseInt(searchParams.get("per_page") || "10");

    const { data: response, isLoading, isError } = useSuppliers({ page, per_page });

    if (isLoading) {
        return <div className="p-4 text-center">Loading {labels.suppliers.toLowerCase()}...</div>;
    }

    if (isError) {
        return <div className="p-4 text-center text-red-500">Error loading {labels.suppliers.toLowerCase()}</div>;
    }

    const suppliers = response?.suppliers || [];

    return (
        <div className={`rounded-md border transition-opacity duration-200 ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{labels.supplier} Name</TableHead>
                        <TableHead>{labels.supplier} Type</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {suppliers.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No {labels.suppliers.toLowerCase()} found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        suppliers.map((supplier: Supplier) => (
                            <TableRow key={supplier.id}>
                                <TableCell className="font-medium">
                                    <EditableSupplierCell supplier={supplier} field="name" asLink />
                                </TableCell>
                                <TableCell>{supplier.supplier_type || "-"}</TableCell>
                                <TableCell>
                                    <EditableSupplierCell supplier={supplier} field="phone" />
                                </TableCell>
                                <TableCell>
                                    <EditableSupplierCell supplier={supplier} field="email" />
                                </TableCell>
                                <TableCell className="text-right">
                                    <SupplierActions supplier={supplier} />
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <div className="flex items-center justify-between space-x-2 border-t bg-card px-4 py-4">
                <div className="text-sm text-muted-foreground">
                    Showing {suppliers.length} of {response?.total || 0} records
                </div>
                <div className="space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const params = new URLSearchParams(searchParams.toString());
                            params.set("page", (page - 1).toString());
                            startTransition(() => {
                                router.push(`${pathname}?${params.toString()}`);
                            });
                        }}
                        disabled={page <= 1}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const params = new URLSearchParams(searchParams.toString());
                            params.set("page", (page + 1).toString());
                            startTransition(() => {
                                router.push(`${pathname}?${params.toString()}`);
                            });
                        }}
                        disabled={!response || page >= response.pages}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
}
