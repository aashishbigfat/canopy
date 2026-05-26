"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useGetUsers, useUpdateUser } from "@/features/admin/api/use-users";
import { UserActions } from "./user-actions";
import { Switch } from "@/components/ui/switch";
import { User } from "@/features/admin/types";
import { UserFormSheet } from "./user-form";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil } from "lucide-react";

export function UserList() {
    const { data, isLoading, isError } = useGetUsers();
    const updateUser = useUpdateUser();

    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | undefined>(undefined);

    const handleAddUser = () => {
        setEditingUser(undefined);
        setSheetOpen(true);
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setSheetOpen(true);
    };

    const users = useMemo(() => {
        const list = data?.users || [];
        return [...list].sort((a, b) =>
            (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
        );
    }, [data]);

    if (isLoading) {
        return <div className="p-4 text-center">Loading users...</div>;
    }

    if (isError) {
        return <div className="p-4 text-center text-red-500">Error loading users</div>;
    }

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">Users</h2>
                    <Badge variant="secondary" className="tabular-nums">
                        {users.length} {users.length === 1 ? "user" : "users"}
                    </Badge>
                </div>
                <Button size="sm" onClick={handleAddUser}>
                    <Plus className="mr-1 h-4 w-4" /> Add User
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60px] text-center">S.No</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">
                                    No users found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user: User, index: number) => {
                                return (
                                    <TableRow key={user.id || user._id}>
                                        <TableCell className="text-center text-muted-foreground tabular-nums">{index + 1}</TableCell>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {user.phone || "—"}
                                        </TableCell>
                                        <TableCell className="text-foreground">
                                            {user.role_hierarchy_name || "—"}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {user.title || "—"}
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={user.is_active}
                                                onCheckedChange={async (checked) => {
                                                    try {
                                                        await updateUser.mutateAsync({
                                                            id: user.id || user._id,
                                                            data: { is_active: checked }
                                                        });
                                                        toast.success(`User ${checked ? 'activated' : 'deactivated'} successfully`);
                                                    } catch (err: any) {
                                                        toast.error(err?.message || "Failed to update user status");
                                                    }
                                                }}
                                                disabled={updateUser.isPending}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEditUser(user)}
                                                    title="Edit user"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <UserActions user={user} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Sheet slide-over form */}
            <UserFormSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                initialData={editingUser}
            />
        </>
    );
}
