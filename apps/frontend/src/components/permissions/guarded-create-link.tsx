"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCrudPermissions } from "@/hooks/use-crud-permissions";
import type { CrudResource } from "@/lib/crud-permissions";

/** Hides “create” navigation when the role lacks `create_*` for this resource. */
export function GuardedCreateLink({
    resource,
    href,
    label,
}: {
    resource: CrudResource;
    href: string;
    label: string;
}) {
    const { canCreate } = useCrudPermissions(resource);
    if (!canCreate) return null;
    return (
        <Link href={href}>
            <Button>
                <Plus className="mr-2 h-4 w-4" />
                {label}
            </Button>
        </Link>
    );
}
