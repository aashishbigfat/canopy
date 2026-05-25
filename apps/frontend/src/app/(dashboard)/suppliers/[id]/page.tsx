"use client";

import { use, useEffect, useState } from "react";
import { SupplierDetails } from "@/features/suppliers/components/SupplierDetails";
import { useSupplier } from "@/features/suppliers/api/use-suppliers";
import { suppliersService } from "@/lib/api/services/suppliers.service";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface SupplierDetailsPageProps {
    params: Promise<{ id: string }>;
}

export default function SupplierDetailsPage({ params }: SupplierDetailsPageProps) {
    const { id } = use(params);
    const router = useRouter();
    
    const { data: supplier, isLoading, isError } = useSupplier(id);
    const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
    const [loadingMeta, setLoadingMeta] = useState(true);

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const data = await suppliersService.getFormData();
                if (data && data.users) {
                    setUsers(data.users);
                }
            } catch (err) {
                console.error("Failed to fetch metadata", err);
            } finally {
                setLoadingMeta(false);
            }
        };
        fetchMeta();
    }, []);

    if (isLoading || loadingMeta) {
        return (
            <div className="flex h-[600px] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
        );
    }

    if (isError || !supplier) {
        return (
            <div className="flex h-[600px] w-full flex-col items-center justify-center gap-4">
                <p className="text-xl font-semibold text-slate-100">Supplier not found</p>
                <Button variant="outline" onClick={() => router.push("/suppliers")}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Suppliers
                </Button>
            </div>
        );
    }

    return <SupplierDetails supplier={supplier} users={users} />;
}
