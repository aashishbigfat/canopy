"use client";

import { useParams } from "next/navigation";
import { useGetRole } from "@/features/admin/api/use-roles";
import { ProfileFormPage } from "@/features/admin/components/roles/role-form-page";
import { Loader2 } from "lucide-react";

export default function EditRolePage() {
    const params = useParams();
    const id = params.id as string;
    const { data: role, isLoading, isError } = useGetRole(id);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <p className="text-muted-foreground">Loading profile...</p>
            </div>
        );
    }

    if (isError || !role) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-destructive">Failed to load profile. Please go back and try again.</p>
            </div>
        );
    }

    return <ProfileFormPage initialData={role} />;
}
