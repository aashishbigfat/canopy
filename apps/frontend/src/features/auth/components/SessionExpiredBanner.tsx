"use client";

import { useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";

export function SessionExpiredBanner() {
    const params = useSearchParams();
    if (params.get("reason") !== "expired") return null;

    return (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Your session has expired. Please sign in again to continue.</span>
        </div>
    );
}
