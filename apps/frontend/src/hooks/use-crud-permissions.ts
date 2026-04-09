"use client";

import { useSession } from "next-auth/react";
import {
    getCrudPermissions,
    type CrudResource,
} from "@/lib/crud-permissions";

export function useCrudPermissions(resource: CrudResource) {
    const { data: session } = useSession();
    const permissions = session?.user?.permissions ?? [];
    return getCrudPermissions(permissions, resource);
}
