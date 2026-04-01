"use client";

import { useGetTasks } from "@/features/tasks/api/use-tasks";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TaskActions } from "./task-actions";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export function TaskList() {
    // Basic pagination or filter can be added later
    const { data, isLoading, isError } = useGetTasks({ page: 1, per_page: 50 });

    if (isLoading) return <div>Loading tasks...</div>;
    if (isError) return <div>Error loading tasks</div>;

    const tasks = data?.tasks || [];

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tasks.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24">No tasks found</TableCell>
                        </TableRow>
                    ) : (
                        tasks.map((task) => (
                            <TableRow key={task.id}>
                                <TableCell className="font-medium">{task.name}</TableCell>
                                <TableCell>{task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : '-'}</TableCell>
                                <TableCell>
                                    <Badge variant={task.status === 'Completed' ? 'default' : 'secondary'}>{task.status}</Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">{task.priority}</Badge>
                                </TableCell>
                                <TableCell>{task.assigned_user_id || 'Unassigned'}</TableCell>
                                <TableCell className="text-right">
                                    <TaskActions task={task} />
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
