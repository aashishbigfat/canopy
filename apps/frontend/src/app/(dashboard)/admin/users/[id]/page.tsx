"use client";

import { use } from "react";
import { UserForm } from "@/features/admin/components/users/user-form";
import { useGetUser } from "@/features/admin/api/use-users";

interface EditUserPageProps {
    params: Promise<{ id: string }>;
}

export default function EditUserPage({ params }: EditUserPageProps) {
    const { id } = use(params);
    const { data: user, isLoading, isError } = useGetUser(id);

    if (isLoading) {
        return <div className="p-8">Loading user details...</div>;
    }

    if (isError || !user) {
        return <div className="p-8 text-red-500">Error loading user or user not found.</div>;
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Edit User</h2>
            </div>
            <div className="rounded-md border p-4">
                <UserForm initialData={user} />
            </div>
        </div>
    );
}
