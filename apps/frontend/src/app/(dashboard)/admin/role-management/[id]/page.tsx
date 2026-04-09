"use client";

import { use } from "react";
import { RoleForm } from "@/features/admin/components/roles/role-form";
import { useGetRole } from "@/features/admin/api/use-roles";

interface EditRolePageProps {
    params: Promise<{ id: string }>;
}

export default function EditRolePage({ params }: EditRolePageProps) {
    const { id } = use(params);
    const { data: role, isLoading, isError } = useGetRole(id);

    if (isLoading) {
        return <div className="p-8">Loading role details...</div>;
    }

    if (isError || !role) {
        return <div className="p-8 text-red-500">Error loading role or role not found.</div>;
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Edit Role</h2>
            </div>
            <div className="rounded-md border p-4">
                <RoleForm initialData={role} />
            </div>
        </div>
    );
}
