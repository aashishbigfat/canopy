"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useGetUsers } from "@/features/admin/api/use-users";
import { UserActions } from "./user-actions";
import { Badge } from "@/components/ui/badge";
import { User } from "@/features/admin/types";

export function UserList() {
    const { data, isLoading, isError } = useGetUsers();

    if (isLoading) {
        return <div className="p-4 text-center">Loading users...</div>;
    }

    if (isError) {
        return <div className="p-4 text-center text-red-500">Error loading users</div>;
    }

    const users = data?.data || [];

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No users found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        users.map((user: User) => (
                            <TableRow key={user._id}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    {/* Assuming we might want to map role IDs to names later, for now just length or badge */}
                                    {user.role_ids.length > 0 ? (
                                        <Badge variant="outline">{user.role_ids.length} Roles</Badge>
                                    ) : (
                                        <span className="text-muted-foreground">No roles</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={user.is_active ? "default" : "secondary"}>
                                        {user.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <UserActions user={user} />
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
