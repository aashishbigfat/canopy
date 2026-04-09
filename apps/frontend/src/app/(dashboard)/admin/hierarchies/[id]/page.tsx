"use client";

import { use } from "react";
import { HierarchyForm } from "@/features/admin/components/hierarchies/hierarchy-form";
import { useGetHierarchy } from "@/features/admin/api/use-hierarchies";

interface EditHierarchyPageProps {
    params: Promise<{ id: string }>;
}

export default function EditHierarchyPage({ params }: EditHierarchyPageProps) {
    const { id } = use(params);
    const { data: hierarchy, isLoading, isError } = useGetHierarchy(id);

    if (isLoading) {
        return <div className="p-8">Loading hierarchy details...</div>;
    }

    if (isError || !hierarchy) {
        return <div className="p-8 text-red-500">Error loading hierarchy or hierarchy not found.</div>;
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Edit Hierarchy</h2>
            </div>
            <div className="rounded-md border p-4">
                <HierarchyForm initialData={hierarchy} />
            </div>
        </div>
    );
}
