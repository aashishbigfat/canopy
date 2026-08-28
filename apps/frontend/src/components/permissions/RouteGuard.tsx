"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { canAccessPath } from "@/lib/rbac";
import { useEffect, useRef } from "react";
import { filterNavItemsForPermissions } from "@/lib/rbac";
import { getNavItems } from "@/components/layout/nav-items";
import { useIndustry, useModules } from "@/lib/industry-labels";
import { toast } from "sonner";

interface RouteGuardProps {
    children: React.ReactNode;
}

/**
 * Travel-only routes — if the tenant is NOT travel, accessing these
 * should redirect immediately (prevents 403s from underlying API calls).
 */
const TRAVEL_ONLY_ROUTES = ["/destinations", "/itineraries", "/departure"];

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
    const industry = useIndustry();
    const modules = useModules();

    const isLoading = status === "loading";
    const isAuthenticated = status === "authenticated";
    const userPermissions = (session?.user as any)?.permissions as string[] | undefined;
    const allowed = !isAuthenticated || canAccessPath(pathname, userPermissions);

    // Block travel-only routes for non-travel tenants
    const isBlockedByIndustry =
        industry !== "travel" &&
        TRAVEL_ONLY_ROUTES.some((route) => pathname.startsWith(route));

    useEffect(() => {
        // Reset redirect flag when pathname changes
        hasRedirected.current = false;
    }, [pathname]);

    useEffect(() => {
        if (isAuthenticated && (isBlockedByIndustry || !allowed) && !hasRedirected.current) {
            hasRedirected.current = true;
            
            // Find the first accessible route using industry-aware nav items
            const dynamicNavItems = getNavItems(industry, modules);
            const visibleItems = filterNavItemsForPermissions(dynamicNavItems, userPermissions);
            let targetRoute = "/";
            
            if (visibleItems.length > 0) {
                targetRoute = visibleItems[0].href;
                toast.error("Access Denied", {
                    description: isBlockedByIndustry
                        ? "This section is not available for your industry."
                        : "You've been redirected to an accessible page.",
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
    }, [pathname, allowed, isBlockedByIndustry, isAuthenticated, router, userPermissions, industry, modules]);

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
    if (!allowed || isBlockedByIndustry) return null;

    return <>{children}</>;
}

