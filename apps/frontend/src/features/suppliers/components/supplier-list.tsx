"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
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
import { Supplier } from "@/features/suppliers/types";
import { suppliersService } from "@/lib/api/services/suppliers.service";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SupplierList() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    
    const page = parseInt(searchParams.get("page") || "1");
    const per_page = parseInt(searchParams.get("per_page") || "10");

    const { data: response, isLoading, isError } = useSuppliers({ page, per_page });
    const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const data = await suppliersService.getFormData();
                if (data && data.users) {
                    setUsers(data.users);
                }
            } catch (err) {
                console.error("Failed to fetch users", err);
            }
        };
        fetchUsers();
    }, []);

    if (isLoading) {
        return <div className="p-4 text-center">Loading suppliers...</div>;
    }

    if (isError) {
        return <div className="p-4 text-center text-red-500">Error loading suppliers</div>;
    }

    const suppliers = response?.suppliers || [];

    return (
        <div className={`rounded-md border transition-opacity duration-200 ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Supplier Name</TableHead>
                        <TableHead>Supplier Type</TableHead>
                        <TableHead>Destination(s)</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {suppliers.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No suppliers found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        suppliers.map((supplier: Supplier) => (
                            <TableRow key={supplier.id}>
                                <TableCell className="font-medium">
                                    <Link 
                                        href={`/suppliers/${supplier.id}`}
                                        className="text-blue-600 hover:underline cursor-pointer"
                                    >
                                        {supplier.name}
                                    </Link>
                                </TableCell>
                                <TableCell>{supplier.supplier_type}</TableCell>
                                <TableCell className="text-blue-600">
                                    {supplier.destinations && supplier.destinations.length > 0
                                        ? supplier.destinations.join(", ")
                                        : "-"}
                                </TableCell>
                                <TableCell className="text-blue-600">
                                    {users.find((u) => u.id === supplier.owner_id)?.name || "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                    <SupplierActions supplier={supplier} />
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            
            <div className="flex items-center justify-between space-x-2 py-4 px-4 bg-white border-t rounded-b-md">
                <div className="text-sm text-gray-500">
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
