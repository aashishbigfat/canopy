"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { Session } from "next-auth";
import { useState } from "react";

export function Providers({ children, session }: { children: React.ReactNode, session: Session | null }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60000,
                refetchOnWindowFocus: false,
            },
        },
    }));

    return (
        <SessionProvider session={session} refetchOnWindowFocus={false} refetchInterval={0}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </SessionProvider>
    );
}
