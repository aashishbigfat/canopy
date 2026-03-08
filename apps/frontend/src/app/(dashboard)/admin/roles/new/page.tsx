"use client";

import { RoleForm } from "@/features/admin/components/roles/role-form";

export default function NewRolePage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Create Role</h2>
            </div>
            <div className="rounded-md border p-4">
                <RoleForm />
            </div>
        </div>
    );
}
