"use client";

import { UserForm } from "@/features/admin/components/users/user-form";

export default function NewUserPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Create User</h2>
            </div>
            <div className="rounded-md border p-4">
                <UserForm />
            </div>
        </div>
    );
}
