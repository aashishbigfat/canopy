"use client";

import { useState } from "react";
import { Search, Plus, Pencil } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGetRoles } from "@/features/admin/api/use-roles";
import { RoleActions } from "./role-actions";
import { Badge } from "@/components/ui/badge";
import { Role, getRoleId } from "@/features/admin/types/roles";
import { ProfileFormSheet } from "./role-form";

export function RoleList() {
    const { data: roles = [], isLoading, isError } = useGetRoles();
    const [searchQuery, setSearchQuery] = useState("");
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | undefined>(undefined);

    const handleAddProfile = () => {
        setEditingRole(undefined);
        setSheetOpen(true);
    };

    const handleEditProfile = (role: Role) => {
        setEditingRole(role);
        setSheetOpen(true);
    };

    // Client-side filter
    const filtered = searchQuery.trim()
        ? roles.filter(
              (r) =>
                  r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (r.display_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (r.description || "").toLowerCase().includes(searchQuery.toLowerCase())
          )
        : roles;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                <span className="ml-3 text-muted-foreground">Loading profiles...</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-8 text-center">
                <p className="text-destructive font-medium">Failed to load profiles</p>
                <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page.</p>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-4">
                {/* Toolbar */}
                <div className="flex items-center justify-between gap-4">
                    <div className="relative max-w-sm flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search profiles..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Button size="sm" onClick={handleAddProfile}>
                        <Plus className="mr-1 h-4 w-4" /> Create Profile
                    </Button>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Display Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Permissions</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        {searchQuery
                                            ? "No profiles match your search."
                                            : "No profiles found."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((role: Role) => (
                                    <TableRow key={getRoleId(role)}>
                                        <TableCell className="font-medium">{role.name}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {role.display_name || "—"}
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate text-muted-foreground" title={role.description || ""}>
                                            {role.description || "—"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{role.permissions.length}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {role.is_admin ? (
                                                <Badge>Admin</Badge>
                                            ) : (
                                                <Badge variant="secondary">Standard</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEditProfile(role)}
                                                    title="Edit profile"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <RoleActions role={role} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Sheet slide-over form */}
            <ProfileFormSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                initialData={editingRole}
            />
        </>
    );
}
