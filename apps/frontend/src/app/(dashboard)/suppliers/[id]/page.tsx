"use client";

import { use } from "react";
import { SupplierForm } from "@/features/suppliers/components/supplier-form";
import { useSupplier } from "@/features/suppliers/api/use-suppliers";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface EditSupplierPageProps {
    params: Promise<{ id: string }>;
}

export default function EditSupplierPage({ params }: EditSupplierPageProps) {
    const { id } = use(params);
    const { data: supplier, isLoading, isError } = useSupplier(id);

    if (isLoading) {
        return <div className="p-8">Loading supplier details...</div>;
    }

    if (isError || !supplier) {
        return <div className="p-8 text-red-500">Error loading supplier or supplier not found.</div>;
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center space-x-2">
                <Link href="/suppliers">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h2 className="text-3xl font-bold tracking-tight">Edit Supplier</h2>
            </div>
            <div className="rounded-md border p-4 max-w-2xl">
                <SupplierForm initialData={supplier} onSuccess={() => {
                    // Can add more logic here if needed
                }} />
            </div>
        </div>
    );
}
