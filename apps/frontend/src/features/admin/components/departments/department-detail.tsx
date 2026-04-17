"use client";

import { ArrowLeft, Building2, Users, Calendar, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useGetDepartment, useGetDepartmentUsers } from "@/features/admin/api/use-departments";

interface DepartmentDetailProps {
    departmentId: string;
}

export function DepartmentDetail({ departmentId }: DepartmentDetailProps) {
    const router = useRouter();
    const { data: department, isLoading, isError } = useGetDepartment(departmentId);
    const { data: usersData, isLoading: isLoadingUsers } = useGetDepartmentUsers(departmentId);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                <span className="ml-3 text-muted-foreground">Loading department details...</span>
            </div>
        );
    }

    if (isError || !department) {
        return (
            <div className="p-8 text-center space-y-4">
                <p className="text-destructive font-medium">Department not found</p>
                <p className="text-sm text-muted-foreground">
                    The department may have been deleted or you don't have permission to view it.
                </p>
                <Button variant="outline" onClick={() => router.push("/admin/departments")}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Departments
                </Button>
            </div>
        );
    }

    const users = usersData?.users ?? [];

    return (
        <div className="space-y-6">
            {/* Back button */}
            <Button variant="ghost" onClick={() => router.push("/admin/departments")} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Departments
            </Button>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{department.name}</h2>
                    {department.description && (
                        <p className="text-muted-foreground mt-1">{department.description}</p>
                    )}
                </div>
                <div>
                    {department.is_active ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15">
                            Active
                        </Badge>
                    ) : (
                        <Badge variant="secondary">Inactive</Badge>
                    )}
                </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{department.user_count ?? 0}</div>
                        <p className="text-xs text-muted-foreground">assigned to this department</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sub-departments</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{department.child_count ?? 0}</div>
                        <p className="text-xs text-muted-foreground">child departments</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Manager</CardTitle>
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{department.manager_name || "—"}</div>
                        <p className="text-xs text-muted-foreground">department head</p>
                    </CardContent>
                </Card>
            </div>

            {/* Department info */}
            <Card>
                <CardHeader>
                    <CardTitle>Department Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="font-medium text-muted-foreground">Name</span>
                            <p>{department.name}</p>
                        </div>
                        <div>
                            <span className="font-medium text-muted-foreground">Description</span>
                            <p>{department.description || "No description provided"}</p>
                        </div>
                        <div>
                            <span className="font-medium text-muted-foreground">Created</span>
                            <p>
                                {department.created_at
                                    ? new Date(department.created_at).toLocaleString(undefined, {
                                          year: "numeric",
                                          month: "long",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                      })
                                    : "—"}
                            </p>
                        </div>
                        <div>
                            <span className="font-medium text-muted-foreground">Last Updated</span>
                            <p>
                                {department.updated_at
                                    ? new Date(department.updated_at).toLocaleString(undefined, {
                                          year: "numeric",
                                          month: "long",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                      })
                                    : "—"}
                            </p>
                        </div>
                        <div>
                            <span className="font-medium text-muted-foreground">Status</span>
                            <p>{department.is_active ? "Active" : "Inactive"}</p>
                        </div>
                        <div>
                            <span className="font-medium text-muted-foreground">Level</span>
                            <p>{department.level ?? 0}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Separator />

            {/* Users in department */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                        Users in Department ({users.length})
                    </h3>
                </div>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingUsers ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        Loading users...
                                    </TableCell>
                                </TableRow>
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                        No users assigned to this department.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user: any) => {
                                    const userId = user.id || user._id || "";
                                    return (
                                        <TableRow key={userId}>
                                            <TableCell className="font-medium">{user.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                            <TableCell>
                                                {user.is_active ? (
                                                    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15">
                                                        Active
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary">Inactive</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
