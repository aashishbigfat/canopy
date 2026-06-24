import Link from "next/link";

/**
 * Root not-found — shown for unmatched URLs and any notFound() that bubbles to
 * the app root. Replaces Next's bare "This page could not be found" default
 * with a styled page that offers a way back into the app.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center text-foreground">
      <div className="flex items-center gap-4">
        <span className="text-5xl font-bold text-primary">404</span>
        <span className="h-12 w-px bg-border" />
        <p className="max-w-xs text-left text-sm text-muted-foreground">
          This page could not be found. It may have been moved or never existed.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
