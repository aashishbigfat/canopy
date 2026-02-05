"use client";

import { SupplierForm } from "@/features/suppliers/components/supplier-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewSupplierPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center space-x-2">
                <Link href="/suppliers">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h2 className="text-3xl font-bold tracking-tight">Create Supplier</h2>
            </div>
            <div className="rounded-md border p-4 max-w-2xl">
                <SupplierForm onSuccess={() => {
                    // Can add more logic here if needed
                }} />
            </div>
        </div>
    );
}
