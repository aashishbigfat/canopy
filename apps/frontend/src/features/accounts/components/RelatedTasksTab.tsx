import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, ExternalLink, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import Link from "next/link";

interface RelatedTasksTabProps {
    accountId: string;
    tasks: any[];
}

function getStatusBadge(status: string) {
    const statusConfig: Record<string, { variant: any; icon: any }> = {
        completed: { variant: "default", icon: CheckCircle2 },
        in_progress: { variant: "secondary", icon: Circle },
        pending: { variant: "outline", icon: Circle },
        overdue: { variant: "destructive", icon: AlertCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
        <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
            <Icon className="h-3 w-3" />
            {status.replace("_", " ")}
        </Badge>
    );
}

function getPriorityBadge(priority: string) {
    const priorityConfig: Record<string, { variant: any }> = {
        high: { variant: "destructive" },
        medium: { variant: "secondary" },
        low: { variant: "outline" },
    };

    const config = priorityConfig[priority] || priorityConfig.medium;

    return <Badge variant={config.variant}>{priority}</Badge>;
}

export function RelatedTasksTab({ accountId, tasks }: RelatedTasksTabProps) {
    const openTasks = tasks.filter((t) => t.status !== "completed").length;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Related Tasks</CardTitle>
                        <CardDescription>
                            Tasks for this account • {openTasks} open task{openTasks !== 1 ? "s" : ""}
                        </CardDescription>
                    </div>
                    <Link href={`/tasks/create?account_id=${accountId}`}>
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Task
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent>
                {tasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>No tasks for this account</p>
                        <Link href={`/tasks/create?account_id=${accountId}`}>
                            <Button variant="outline" size="sm" className="mt-4">
                                <Plus className="mr-2 h-4 w-4" />
                                Create First Task
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Subject</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Assigned To</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tasks.map((task) => (
                                <TableRow key={task.id}>
                                    <TableCell className="font-medium">
                                        <Link
                                            href={`/tasks/${task.id}`}
                                            className="hover:underline flex items-center gap-1"
                                        >
                                            {task.subject}
                                            <ExternalLink className="h-3 w-3" />
                                        </Link>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                                    <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                                    <TableCell>{task.assigned_user_name || "-"}</TableCell>
                                    <TableCell>
                                        {task.due_date
                                            ? new Date(task.due_date).toLocaleDateString()
                                            : "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {task.status !== "completed" && (
                                            <Button variant="ghost" size="sm">
                                                Mark Complete
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
