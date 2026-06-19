"use client";

import * as React from "react";
import { usePicklist } from "@/hooks/use-picklist";
import Link from "next/link";
import { formatDateTimeBar, formatDate } from "@/lib/format";
import { MoreHorizontal, Edit, Trash2, CheckCircle, Plus, Pencil, Check, Loader2 } from "lucide-react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useGetTasks, useDeleteTask, useCompleteTask, useUpdateTask } from "@/features/tasks/api/use-tasks";
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
        return <span className="text-xs text-muted-foreground font-medium">{status}</span>;
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

function toDateTimeLocal(iso?: string) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Inline-editable task cell — text (subject), datetime (due date) or select (status).
function EditableTaskCell({
    task,
    field,
    kind,
    options,
    linkHref,
    renderDisplay,
}: {
    task: Task;
    field: "name" | "due_date" | "status";
    kind: "text" | "datetime" | "select";
    options?: { id: string; name: string }[];
    linkHref?: string;
    renderDisplay?: (val: string) => React.ReactNode;
}) {
    const updateTask = useUpdateTask();
    const initial = ((task as any)[field] as string) || "";
    const [editing, setEditing] = React.useState(false);
    const [value, setValue] = React.useState(kind === "datetime" ? toDateTimeLocal(initial) : initial);

    React.useEffect(() => {
        setValue(kind === "datetime" ? toDateTimeLocal(initial) : initial);
    }, [initial, kind]);

    const commit = async (raw: string) => {
        let payloadVal: string | undefined = raw;
        if (kind === "datetime") {
            payloadVal = raw ? new Date(raw).toISOString() : undefined;
            if ((payloadVal || "") === (initial || "")) { setEditing(false); return; }
        } else if (raw === initial) {
            setEditing(false);
            return;
        }
        try {
            await updateTask.mutateAsync({ id: task.id, data: { [field]: payloadVal } as any });
            toast.success("Updated");
            setEditing(false);
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || "Failed to update");
        }
    };

    if (editing && kind === "select") {
        return (
            <Select
                defaultOpen
                defaultValue={initial || undefined}
                onValueChange={(v) => commit(v)}
                onOpenChange={(o) => { if (!o) setEditing(false); }}
            >
                <SelectTrigger className="h-7 w-36 text-xs">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    {options?.map((o) => (
                        <SelectItem key={o.id} value={o.name}>{o.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }

    if (editing) {
        return (
            <div className="flex items-center gap-1">
                <Input
                    autoFocus
                    type={kind === "datetime" ? "datetime-local" : "text"}
                    value={value}
                    disabled={updateTask.isPending}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") commit(value);
                        if (e.key === "Escape") setEditing(false);
                    }}
                    className="h-7 w-44 text-xs"
                />
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => commit(value)} disabled={updateTask.isPending}>
                    {updateTask.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-green-500" />}
                </Button>
            </div>
        );
    }

    return (
        <div className="group/edit flex items-center gap-1.5">
            {linkHref ? (
                <Link href={linkHref} className="block truncate text-primary hover:underline">
                    {renderDisplay ? renderDisplay(initial) : (initial || "—")}
                </Link>
            ) : (
                <span className="min-w-0 truncate">{renderDisplay ? renderDisplay(initial) : (initial || "—")}</span>
            )}
            <button
                type="button"
                onClick={() => setEditing(true)}
                className="shrink-0 opacity-0 transition-opacity group-hover/edit:opacity-100"
                title="Edit"
            >
                <Pencil className="h-3 w-3 text-primary" />
            </button>
        </div>
    );
}

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
                                {/* Subject — clickable link + inline edit */}
                                <TableCell className="py-2 font-medium max-w-[200px]">
                                    <EditableTaskCell
                                        task={task}
                                        field="name"
                                        kind="text"
                                        linkHref={`/tasks/${task.id}`}
                                    />
                                </TableCell>

                                {/* Due Date — inline edit */}
                                <TableCell className="py-2 text-xs text-muted-foreground whitespace-nowrap">
                                    <EditableTaskCell
                                        task={task}
                                        field="due_date"
                                        kind="datetime"
                                        renderDisplay={(v) => (v ? formatDateTimeBar(v) : "—")}
                                    />
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

                                {/* Status — inline edit */}
                                <TableCell className="py-2">
                                    <EditableTaskCell
                                        task={task}
                                        field="status"
                                        kind="select"
                                        options={taskStatuses}
                                        renderDisplay={(v) => statusBadge(v)}
                                    />
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
                                        ? formatDate(task.created_at)
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
