import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Protects routes that require auth (session from backend /api/v1/auth/login).
 * All API calls from the app already use NEXT_PUBLIC_API_URL (env) which includes /api/v1.
 */
const PUBLIC_PATHS = ["/login", "/forgot-password", "/register", "/coming-soon"];
const AUTH_API = "/api/auth";

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Allow NextAuth API and static/Next internals
    if (pathname.startsWith(AUTH_API) || pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
        return NextResponse.next();
    }

    // Allow public pages
    if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
        return NextResponse.next();
    }

    // Root "/" can show login or dashboard; let the page decide (it uses getServerSession)
    if (pathname === "/") {
        return NextResponse.next();
    }

    // All other routes (dashboard, accounts, contacts, etc.) require a valid session
    const secret = process.env.NEXTAUTH_SECRET;
    const token = await getToken({ req, secret });

    if (!token) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
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
