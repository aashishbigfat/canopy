"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy route — profile editing now happens via the Sheet slide-over
 * on the main /admin/role-management page.
 */
export default function EditRolePage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/admin/role-management");
    }, [router]);

    return (
        <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Redirecting to Profiles &amp; Permissions...</p>
        </div>
    );
}
