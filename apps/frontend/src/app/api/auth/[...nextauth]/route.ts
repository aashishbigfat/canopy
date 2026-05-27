import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import type { NextRequest } from "next/server";

const handler = NextAuth(authOptions);

// Next.js 16 requires explicit async route exports with awaitable params.
// The shorthand `export { handler as GET }` no longer satisfies the runtime
// contract, causing all /api/auth/* requests to return 404.
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ nextauth: string[] }> }
) {
    return handler(req as any, context as any);
}

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ nextauth: string[] }> }
) {
    return handler(req as any, context as any);
}
