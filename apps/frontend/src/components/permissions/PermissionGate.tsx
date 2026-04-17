"use client";

import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/rbac";

interface PermissionGateProps {
    /** Single permission string required, e.g. "create_account" */
    permission: string;
    /** Content to render when user HAS the permission */
    children: React.ReactNode;
    /** Optional fallback when user LACKS the permission (defaults to nothing) */
    fallback?: React.ReactNode;
}

/**
 * Conditionally renders children based on user permissions.
 * 
 * Usage:
 *   <PermissionGate permission="create_account">
 *       <Button>Create Account</Button>
 *   </PermissionGate>
 */
export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
    const { data: session } = useSession();

    if (!hasPermission((session?.user as any)?.permissions, permission)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
