"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useGetRoles } from "@/features/admin/api/use-roles";
import { RoleActions } from "./role-actions";
import { Badge } from "@/components/ui/badge";
import { Role } from "@/features/admin/types/roles";

export function RoleList() {
    const { data: roles = [], isLoading, isError } = useGetRoles();

    if (isLoading) {
        return <div className="p-4 text-center">Loading roles...</div>;
    }

    if (isError) {
        return <div className="p-4 text-center text-red-500">Error loading roles</div>;
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Namxe</TableHead>
                        <TableHead>Permissions Count</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {roles.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                No roles found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        roles.map((role: Role) => (
                            <TableRow key={role.id || role._id}>
                                <TableCell className="font-medium">{role.name}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{role.permissions.length}</Badge>
                                </TableCell>
                                <TableCell>
                                    {role.is_system ? <Badge>System</Badge> : <Badge variant="secondary">Custom</Badge>}
                                </TableCell>
                                <TableCell className="text-right">
                                    <RoleActions role={role} />
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
