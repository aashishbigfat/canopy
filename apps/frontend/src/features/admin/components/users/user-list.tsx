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
import { useGetRoles } from "@/features/admin/api/use-roles";
import { useGetHierarchies } from "@/features/admin/api/use-hierarchies";
import { UserActions } from "./user-actions";
import { Badge } from "@/components/ui/badge";
import { User } from "@/features/admin/types";
import { UserFormSheet } from "./user-form";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil } from "lucide-react";
import { getRoleId } from "@/features/admin/types/roles";

export function UserList() {
    const { data, isLoading, isError } = useGetUsers();
    const { data: roles = [], isLoading: isLoadingRoles } = useGetRoles();
    const { data: hierarchiesData, isLoading: isLoadingHierarchies } = useGetHierarchies();
    const hierarchies = hierarchiesData?.hierarchies || hierarchiesData?.data || [];

    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | undefined>(undefined);

    // Build lookup maps for resolving IDs → names
    const roleMap = useMemo(() => {
        const map = new Map<string, string>();
        roles.forEach((r: any) => {
            const id = getRoleId(r);
            map.set(id, r.display_name || r.name);
        });
        return map;
    }, [roles]);

    const hierarchyMap = useMemo(() => {
        const map = new Map<string, string>();
        hierarchies.forEach((h: any) => {
            const id = h._id || h.id;
            map.set(id, h.name);
        });
        return map;
    }, [hierarchies]);

    const handleAddUser = () => {
        setEditingUser(undefined);
        setSheetOpen(true);
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setSheetOpen(true);
    };

    /** Resolve role_hierarchy_id → hierarchy name (instant fallback) */
    const getHierarchyName = (user: User): string => {
        if (!user.role_hierarchy_id) return "—";
        // Show resolved name if map is ready, otherwise show the raw id as placeholder
        if (hierarchyMap.size > 0) {
            return hierarchyMap.get(user.role_hierarchy_id) || "—";
        }
        return "…"; // loading indicator
    };

    /** Resolve role_ids → profile display names */
    const getProfileNames = (user: User): string => {
        if (!user.role_ids || user.role_ids.length === 0) return "";
        if (roleMap.size > 0) {
            return user.role_ids
                .map((id) => roleMap.get(id) || id)
                .join(", ");
        }
        return "…"; // loading indicator
    };

    if (isLoading) {
        return <div className="p-4 text-center">Loading users...</div>;
    }

    if (isError) {
        return <div className="p-4 text-center text-red-500">Error loading users</div>;
    }

    const users = data?.users || [];

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Users</h2>
                <Button size="sm" onClick={handleAddUser}>
                    <Plus className="mr-1 h-4 w-4" /> Add User
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Profile</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    No users found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user: User) => {
                                const roleName = getHierarchyName(user);
                                const profileName = getProfileNames(user);
                                return (
                                    <TableRow key={user.id || user._id}>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {user.phone || "—"}
                                        </TableCell>
                                        <TableCell>
                                            {roleName !== "—" && roleName !== "…" ? (
                                                <span>{roleName}</span>
                                            ) : (
                                                <span className="text-muted-foreground">{roleName}</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {user.role_ids.length > 0 ? (
                                                <Badge variant="secondary">
                                                    {profileName}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">No profile</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={user.is_active ? "default" : "secondary"}>
                                                {user.is_active ? "Active" : "Inactive"}
                                            </Badge>
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
