import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getRoutePermission } from "@/lib/rbac";
import { getRouteModule } from "@/lib/rbac-modules";
import { decompressPermissions } from "@/lib/permissions-compression";

/**
 * Protects routes that require auth (session from backend /api/v1/auth/login).
 * All API calls from the app already use NEXT_PUBLIC_API_URL (env) which includes /api/v1.
 *
 * SECURITY: this middleware enforces BOTH auth and permission/module checks
 * server-side. Doing the check only on the client (component code) is
 * bypassable by direct URL navigation — a user with `view_lead` could
 * navigate to `/admin/users` and see the page render until API calls fail.
 * Catching it here means unauthorized requests never even render the page.
 */
const PUBLIC_PATHS = ["/login", "/forgot-password", "/register", "/coming-soon", "/unauthorized"];
const AUTH_API = "/api/auth";

function isOpenRedirectSafe(callbackUrl: string): boolean {
    // Only same-origin relative paths are accepted as callbackUrl. Blocks
    // open-redirect attacks via `?callbackUrl=https://evil.com`.
    return callbackUrl.startsWith("/") && !callbackUrl.startsWith("//");
}

function withCookieCleanup(req: NextRequest, res: NextResponse): NextResponse {
    req.cookies.getAll().forEach((c) => {
        if (c.name.includes("session-token.")) {
            res.cookies.set(c.name, "", { maxAge: 0, path: "/" });
        }
    });
    return res;
}

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Allow NextAuth API and static/Next internals
    if (pathname.startsWith(AUTH_API) || pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
        return withCookieCleanup(req, NextResponse.next());
    }

    // Allow public pages
    if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
        return withCookieCleanup(req, NextResponse.next());
    }

    // Root "/" can show login or dashboard; let the page decide (it uses getServerSession)
    if (pathname === "/") {
        return withCookieCleanup(req, NextResponse.next());
    }

    // All other routes require a valid session
    const secret = process.env.NEXTAUTH_SECRET;
    const token = await getToken({ req, secret });

    if (!token) {
        const loginUrl = new URL("/login", req.url);
        const safeCallback = isOpenRedirectSafe(pathname) ? pathname : "/dashboard";
        loginUrl.searchParams.set("callbackUrl", safeCallback);
        return withCookieCleanup(req, NextResponse.redirect(loginUrl));
    }

    // Permission gate — server-side RBAC enforcement
    const requiredPerm = getRoutePermission(pathname);
    if (requiredPerm) {
        const userPerms = decompressPermissions((token as any).permissions);
        if (!userPerms.includes(requiredPerm)) {
            return withCookieCleanup(req, NextResponse.redirect(new URL("/unauthorized", req.url)));
        }
    }

    // Module gate — industry-vertical pages (e.g. /patients) require the
    // tenant to have that module enabled. A travel tenant trying to navigate
    // to /patients is bounced to /unauthorized rather than rendering the page
    // and then hitting a 403 on the data fetch.
    const requiredModule = getRouteModule(pathname);
    if (requiredModule) {
        const modules = (token.modules as Record<string, boolean>) || {};
        if (!modules[requiredModule]) {
            return withCookieCleanup(req, NextResponse.redirect(new URL("/unauthorized", req.url)));
        }
    }

    return withCookieCleanup(req, NextResponse.next());
}

export const config = {
    matcher: [
        /*
         * Match all paths except static files and images.
         * Dashboard and app routes are protected above.
         */
        "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    ],
};
