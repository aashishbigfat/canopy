"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Dashboard-level error boundary.
 *
 * Without this, any error thrown while server-rendering a dashboard page
 * (e.g. the backend/DB being momentarily unreachable, a failed data fetch,
 * or a thrown getServerSession) bubbles past every layout and Next falls
 * through to its bare, unstyled root 404 — exactly the "This page could not
 * be found" screen users were hitting on a transient Atlas blip.
 *
 * This boundary keeps the user inside the app with a styled message and a
 * Retry that re-runs the failed render.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for debugging; the digest links to the server-side stack.
    console.error("Dashboard render error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          We couldn&apos;t load this page. This usually means the server or
          database was briefly unreachable. Please try again in a moment.
        </p>
        {error?.digest && (
          <p className="text-xs text-muted-foreground/70">Ref: {error.digest}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()} className="gap-2">
          <RotateCw className="h-4 w-4" /> Try again
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
