"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy route — user creation now happens via the Sheet slide-over
 * on the main /admin/users page. Redirect there automatically.
 */
export default function NewUserPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/admin/users");
    }, [router]);

    return (
        <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Redirecting to User Management...</p>
        </div>
    );
}
