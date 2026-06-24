import Link from "next/link";
import { SearchX, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Dashboard-level not-found boundary.
 *
 * Detail pages (account / contact / person-account / opportunity …) call
 * notFound() when a record is missing or not visible to the user. Without a
 * boundary here that rendered Next's bare root 404 (no app chrome). This keeps
 * the user inside the dashboard with a styled, navigable message.
 */
export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchX className="h-7 w-7" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold">Record not found</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          The item you&apos;re looking for doesn&apos;t exist, was deleted, or
          you don&apos;t have access to it.
        </p>
      </div>
      <Button variant="outline" asChild className="gap-2">
        <Link href="/dashboard">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
      </Button>
    </div>
  );
}
