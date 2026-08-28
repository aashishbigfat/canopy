import { NextRequest, NextResponse } from "next/server";

import { getApiBaseUrlNoSlash } from "@/lib/env";

const HOP_BY_HOP_HEADERS = new Set([
    "connection",
    "content-length",
    "host",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
]);

async function proxyRequest(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) {
    const { path } = await context.params;
    const target = new URL(`${getApiBaseUrlNoSlash()}/${path.join("/")}`);
    request.nextUrl.searchParams.forEach((value, key) => {
        target.searchParams.append(key, value);
    });

    const headers = new Headers();
    request.headers.forEach((value, key) => {
        if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
            headers.set(key, value);
        }
    });

    const init: RequestInit = {
        method: request.method,
        headers,
        cache: "no-store",
    };

    if (!["GET", "HEAD"].includes(request.method)) {
        init.body = await request.arrayBuffer();
    }

    const response = await fetch(target, init);
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
        if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
            responseHeaders.set(key, value);
        }
    });

    return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
    });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
