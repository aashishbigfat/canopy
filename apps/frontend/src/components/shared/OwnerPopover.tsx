"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface OwnerPopoverProps {
    ownerId?: string | null;
    ownerName?: string | null;
    className?: string;
}

/**
 * Click an owner's name to open their full user profile page.
 * Used in list tables and detail headers. Falls back to plain text when the
 * owner is unassigned.
 */
export function OwnerPopover({ ownerId, ownerName, className }: OwnerPopoverProps) {
    const label = ownerName || "Unassigned";

    if (!ownerId) {
        return <span className={cn("text-muted-foreground", className)}>{label}</span>;
    }

    return (
        <Link
            href={`/users/${ownerId}`}
            onClick={(e) => e.stopPropagation()}
            className={cn("text-primary hover:underline text-left", className)}
            title="View profile"
        >
            {label}
        </Link>
    );
}
