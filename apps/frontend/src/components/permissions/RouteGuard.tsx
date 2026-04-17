"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { canAccessPath } from "@/lib/rbac";
import { useEffect, useRef } from "react";
import { filterNavItemsForPermissions } from "@/lib/rbac";
import { navItems } from "@/components/layout/nav-items";
import { toast } from "sonner";

interface RouteGuardProps {
    children: React.ReactNode;
}

/**
 * Route-level permission guard for the dashboard layout.
 * If the authenticated user navigates to a route they don't have permission for,
 * they are silently redirected to /dashboard with an error toast.
 * 
 * This prevents the "403 Forbidden" problem by blocking access BEFORE
 * the page component renders or makes API calls.
 */
export function RouteGuard({ children }: RouteGuardProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session, status } = useSession();
    const hasRedirected = useRef(false);

    const isLoading = status === "loading";
    const isAuthenticated = status === "authenticated";
    const userPermissions = (session?.user as any)?.permissions as string[] | undefined;
    const allowed = !isAuthenticated || canAccessPath(pathname, userPermissions);

    useEffect(() => {
        // Reset redirect flag when pathname changes
        hasRedirected.current = false;
    }, [pathname]);



    useEffect(() => {
        if (isAuthenticated && !allowed && !hasRedirected.current) {
            hasRedirected.current = true;
            
            // Find the first accessible route
            const visibleItems = filterNavItemsForPermissions(navItems, userPermissions);
            let targetRoute = "/";
            
            if (visibleItems.length > 0) {
                targetRoute = visibleItems[0].href;
                toast.error("Access Denied", {
                    description: "You've been redirected to an accessible page.",
                    duration: 4000,
                });
            } else {
                toast.error("Account Restricted", {
                    description: "You have no permissions assigned.",
                    duration: 6000,
                });
                targetRoute = "/login"; // Or some safe fallback
            }
            
            // Prevent infinite loop if somehow the target route itself isn't allowed
            if (pathname !== targetRoute) {
                router.replace(targetRoute);
            }
        }
    }, [pathname, allowed, isAuthenticated, router, userPermissions]);

    // Show nothing while auth is loading
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    // Don't render the page if user lacks permission (redirect is happening)
    if (!allowed) return null;

    return <>{children}</>;
}
