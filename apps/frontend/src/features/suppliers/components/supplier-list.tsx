"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useSuppliers } from "@/features/suppliers/api/use-suppliers";
import { SupplierActions } from "./supplier-actions";
import { Badge } from "@/components/ui/badge";
import { Supplier } from "@/features/suppliers/types";

export function SupplierList() {
    const { data: response, isLoading, isError } = useSuppliers();

    if (isLoading) {
        return <div className="p-4 text-center">Loading suppliers...</div>;
    }

    if (isError) {
        return <div className="p-4 text-center text-red-500">Error loading suppliers</div>;
    }

    const suppliers = response?.data || [];

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Contact Person</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {suppliers.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No suppliers found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        suppliers.map((supplier: Supplier) => (
                            <TableRow key={supplier.id}>
                                <TableCell className="font-medium">{supplier.name}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{supplier.supplier_type}</Badge>
                                </TableCell>
                                <TableCell>{supplier.contact_person_name || '-'}</TableCell>
                                <TableCell>{supplier.email || '-'}</TableCell>
                                <TableCell>
                                    <Badge variant={supplier.is_active ? "default" : "secondary"}>
                                        {supplier.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <SupplierActions supplier={supplier} />
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
