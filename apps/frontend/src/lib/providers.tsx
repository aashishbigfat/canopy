"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { Session } from "next-auth";
import { useState } from "react";
import { ThemeProvider } from "next-themes";
import { ApiTokenSync } from "@/lib/api/ApiTokenSync";

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
            <ApiTokenSync />
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
                <QueryClientProvider client={queryClient}>
                    {children}
                </QueryClientProvider>
            </ThemeProvider>
        </SessionProvider>
    );
}
