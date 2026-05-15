"use client";

import * as React from "react";
import { usePicklist } from "@/hooks/use-picklist";
import Link from "next/link";
import { format } from "date-fns";
import { MoreHorizontal, Edit, Trash2, CheckCircle, Plus } from "lucide-react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useGetTasks, useDeleteTask, useCompleteTask } from "@/features/tasks/api/use-tasks";
import { Task } from "@/features/tasks/types";
import { TaskModal } from "./task-modal";
import { toast } from "sonner";
import { PermissionGate } from "@/components/permissions/PermissionGate";

function statusBadge(status: string) {
    const lower = status?.toLowerCase();
    if (lower === "completed")
        return <span className="text-xs font-medium text-emerald-600">{status}</span>;
    if (lower === "open" || lower === "not started")
        return <span className="text-xs font-medium text-primary">{status}</span>;
    if (lower === "in progress")
        return <span className="text-xs font-medium text-amber-600">{status}</span>;
    if (lower === "deferred")
        return <span className="text-xs text-gray-500 font-medium">{status}</span>;
    return <span className="text-xs text-muted-foreground">{status || "—"}</span>;
}

function priorityBadge(priority: string) {
    if (!priority) return <span className="text-xs text-muted-foreground">—</span>;
    const lower = priority?.toLowerCase();
    if (lower === "high" || lower === "urgent")
        return <span className="text-xs font-medium text-red-600">{priority}</span>;
    if (lower === "normal")
        return <span className="text-xs text-muted-foreground">{priority}</span>;
    return <span className="text-xs text-muted-foreground">{priority}</span>;
}

import { useSession } from "next-auth/react";

export function TaskList() {
    const { data: session } = useSession();
    const [page, setPage] = React.useState(1);
    const [statusFilter, setStatusFilter] = React.useState<string>("__all__");
    const [priorityFilter, setPriorityFilter] = React.useState<string>("__all__");
    const [assigneeFilter, setAssigneeFilter] = React.useState<string>("__my_tasks__");
    const [editTask, setEditTask] = React.useState<Task | null>(null);
    const [addOpen, setAddOpen] = React.useState(false);
    const { items: taskStatuses } = usePicklist("task_status");
    const { items: taskPriorities } = usePicklist("task_priority");

    const { data, isLoading, isError } = useGetTasks({
        page,
        per_page: 20,
        status: statusFilter === "__all__" ? undefined : statusFilter,
        priority: priorityFilter === "__all__" ? undefined : priorityFilter,
        assigned_user_id: assigneeFilter === "__my_tasks__" ? (session?.user as any)?.id : (assigneeFilter === "__all__" ? undefined : assigneeFilter),
    });

    const deleteTask = useDeleteTask();
    const completeTask = useCompleteTask();

    const tasks: Task[] = data?.tasks || [];
    const pagination = data?.pagination;
    const totalPages = pagination?.pages || 1;

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this task?")) return;
        try {
            await deleteTask.mutateAsync(id);
            toast.success("Task deleted");
        } catch {
            toast.error("Failed to delete task");
        }
    };

    const handleComplete = async (id: string) => {
        try {
            await completeTask.mutateAsync(id);
            toast.success("Task marked complete");
        } catch {
            toast.error("Failed to complete task");
        }
    };

    return (
        <div>
            {/* Toolbar */}
            <div className="crm-toolbar mb-4 justify-between gap-3 flex-wrap">
                <div className="flex gap-2 flex-wrap">
                    <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                        <SelectTrigger className="h-8 text-xs w-36">
                            <SelectValue placeholder="Assignee" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__my_tasks__">My Tasks</SelectItem>
                            <SelectItem value="__all__">All Tasks</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-8 text-xs w-36">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">All Status</SelectItem>
                            {taskStatuses.map((s) => (
                                <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                        <SelectTrigger className="h-8 text-xs w-36">
                            <SelectValue placeholder="All Priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">All Priority</SelectItem>
                            {taskPriorities.map((p) => (
                                <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <PermissionGate permission="create_task">
                    <Button
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setAddOpen(true)}
                    >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        New
                    </Button>
                </PermissionGate>
            </div>

            {/* Table */}
            <div className="crm-surface overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="py-2">Subject</TableHead>
                            <TableHead className="py-2">Due Date</TableHead>
                            <TableHead className="py-2">Task Type</TableHead>
                            <TableHead className="py-2">Related To</TableHead>
                            <TableHead className="py-2">Priority</TableHead>
                            <TableHead className="py-2">Status</TableHead>
                            <TableHead className="py-2">Concerned Contact</TableHead>
                            <TableHead className="py-2">Assigned To</TableHead>
                            <TableHead className="py-2">Created By</TableHead>
                            <TableHead className="py-2">Create Date</TableHead>
                            <TableHead className="py-2 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow>
                                <TableCell colSpan={11} className="text-center py-8 text-sm text-muted-foreground">
                                    Loading tasks...
                                </TableCell>
                            </TableRow>
                        )}
                        {isError && (
                            <TableRow>
                                <TableCell colSpan={11} className="text-center py-8 text-sm text-red-500">
                                    Error loading tasks
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading && !isError && tasks.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={11} className="text-center py-12 text-sm text-muted-foreground">
                                    No tasks found
                                </TableCell>
                            </TableRow>
                        )}
                        {tasks.map((task) => (
                            <TableRow key={task.id} className="hover:bg-muted/30 text-sm">
                                {/* Subject — clickable link */}
                                <TableCell className="py-2 font-medium max-w-[180px]">
                                    <Link
                                        href={`/tasks/${task.id}`}
                                        className="block truncate text-primary hover:underline"
                                    >
                                        {task.name}
                                    </Link>
                                </TableCell>

                                {/* Due Date */}
                                <TableCell className="py-2 text-xs text-muted-foreground whitespace-nowrap">
                                    {task.due_date
                                        ? format(new Date(task.due_date), "d MMM yyyy | hh:mm aa")
                                        : "—"}
                                </TableCell>

                                {/* Task Type (taskable_type) */}
                                <TableCell className="py-2 text-xs">
                                    {task.taskable_type || "—"}
                                </TableCell>

                                {/* Related To (resolved entity name) */}
                                <TableCell className="py-2 text-xs text-primary">
                                    {task.taskable_name || "—"}
                                </TableCell>

                                {/* Priority */}
                                <TableCell className="py-2">
                                    {priorityBadge(task.priority)}
                                </TableCell>

                                {/* Status */}
                                <TableCell className="py-2">
                                    {statusBadge(task.status)}
                                </TableCell>

                                {/* Concerned Contact (contact_id resolved — stored as name in future) */}
                                <TableCell className="py-2 text-xs text-muted-foreground">
                                    —
                                </TableCell>

                                {/* Assigned To */}
                                <TableCell className="py-2 text-xs text-primary">
                                    {task.assigned_user_name || "—"}
                                </TableCell>

                                {/* Created By */}
                                <TableCell className="py-2 text-xs text-primary">
                                    {task.created_by_name || "—"}
                                </TableCell>

                                {/* Create Date */}
                                <TableCell className="py-2 text-xs text-muted-foreground whitespace-nowrap">
                                    {task.created_at
                                        ? format(new Date(task.created_at), "dd MMM yyyy")
                                        : "—"}
                                </TableCell>

                                {/* Actions */}
                                <TableCell className="py-2 text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-7 w-7 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => setEditTask(task)}>
                                                <Edit className="mr-2 h-3.5 w-3.5" /> Edit
                                            </DropdownMenuItem>
                                            {task.status?.toLowerCase() !== "completed" && (
                                                <DropdownMenuItem onClick={() => handleComplete(task.id)}>
                                                    <CheckCircle className="mr-2 h-3.5 w-3.5 text-green-600" />
                                                    Mark Complete
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => handleDelete(task.id)}
                                                className="text-red-600"
                                            >
                                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-3">
                    <p className="text-xs text-muted-foreground">
                        Page {pagination?.current_page} of {totalPages} ({pagination?.total} tasks)
                    </p>
                    <div className="flex gap-1">
                        <Button
                            variant="outline" size="sm"
                            className="h-7 text-xs"
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline" size="sm"
                            className="h-7 text-xs"
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            {/* Add New Task Modal */}
            <TaskModal
                open={addOpen}
                onOpenChange={setAddOpen}
            />

            {/* Edit Task Modal */}
            {editTask && (
                <TaskModal
                    open={!!editTask}
                    onOpenChange={(o) => { if (!o) setEditTask(null); }}
                    initialData={editTask}
                />
            )}
        </div>
    );
}
