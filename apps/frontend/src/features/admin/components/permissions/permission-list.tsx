"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { PermissionDef } from "@/features/admin/types/permissions";
import { useGetPermissionCatalog } from "@/features/admin/api/use-permissions";
import { PermissionActions } from "./permission-actions";

export function PermissionList() {
    const { data: permissions = [], isLoading, isError } = useGetPermissionCatalog();

    if (isLoading) {
        return <div className="p-4 text-center">Loading permissions...</div>;
    }

    if (isError) {
        return <div className="p-4 text-center text-red-500">Error loading permissions</div>;
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Key</TableHead>
                        <TableHead>Display name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {permissions.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No permissions found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        permissions.map((perm: PermissionDef) => (
                            <TableRow key={perm.id}>
                                <TableCell className="font-mono text-sm">{perm.name}</TableCell>
                                <TableCell className="font-medium">{perm.display_name}</TableCell>
                                <TableCell className="max-w-md truncate text-muted-foreground text-sm">
                                    {perm.description || "—"}
                                </TableCell>
                                <TableCell>
                                    {perm.is_system ? (
                                        <Badge>System</Badge>
                                    ) : (
                                        <Badge variant="secondary">Custom</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <PermissionActions permission={perm} />
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

