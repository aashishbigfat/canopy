"use client";

import * as React from "react";
import { use } from "react";
import { format } from "date-fns";
import { ClipboardList, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useGetTask } from "@/features/tasks/api/use-tasks";
import { TaskModal } from "@/features/tasks/components/task-modal";

interface EditTaskPageProps {
    params: Promise<{ id: string }>;
}

function SectionHeader({ title }: { title: string }) {
    return (
        <div className="flex items-center gap-2 bg-blue-50 border-l-4 border-blue-400 px-4 py-2 mb-4 rounded-r-sm">
            <div className="h-5 w-5 rounded-full bg-orange-400 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">!</span>
            </div>
            <span className="text-sm font-semibold text-gray-700">{title}</span>
        </div>
    );
}

function FieldRow({ label, value, isLink }: { label: string; value?: string | null; isLink?: boolean }) {
    return (
        <div className="grid grid-cols-2 gap-4 py-3 border-b border-gray-100 last:border-b-0">
            <span className="text-sm text-gray-500">{label}</span>
            {isLink && value ? (
                <span className="text-sm text-blue-600 font-medium">{value}</span>
            ) : (
                <span className="text-sm text-gray-800">{value || "—"}</span>
            )}
        </div>
    );
}

export default function TaskDetailPage({ params }: EditTaskPageProps) {
    const { id } = use(params);
    const { data: task, isLoading, isError } = useGetTask(id);
    const [editOpen, setEditOpen] = React.useState(false);
    const [followUpOpen, setFollowUpOpen] = React.useState(false);

    if (isLoading) {
        return (
            <div className="p-8 text-sm text-muted-foreground animate-pulse">
                Loading task details...
            </div>
        );
    }

    if (isError || !task) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
                <p className="text-red-500 text-sm">Task not found or failed to load.</p>
                <Link href="/tasks">
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Tasks
                    </Button>
                </Link>
            </div>
        );
    }

    const dueFormatted = task.due_date
        ? format(new Date(task.due_date), "d MMM yyyy | hh:mm aa")
        : undefined;

    const createdFormatted = task.created_at
        ? format(new Date(task.created_at), "dd MMM yyyy | hh:mm aa")
        : undefined;

    const updatedFormatted = task.updated_at
        ? format(new Date(task.updated_at), "dd MMM yyyy | hh:mm aa")
        : undefined;

    return (
        <div className="flex-1 space-y-4 p-4 sm:p-6 min-w-0 w-full">
            {/* Breadcrumb / page header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-md bg-blue-100 flex items-center justify-center">
                        <ClipboardList className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-xs text-blue-600 font-medium">Task Follow Up</p>
                        {task.taskable_name && (
                            <p className="text-xs text-muted-foreground">
                                Related To{" "}
                                <span className="text-blue-600">{task.taskable_name}</span>
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                        onClick={() => setFollowUpOpen(true)}
                    >
                        Create Follow-Up Task
                    </Button>
                    <Button
                        size="sm"
                        className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => setEditOpen(true)}
                    >
                        Edit
                    </Button>
                </div>
            </div>

            {/* Task Information */}
            <div className="bg-white rounded-md border shadow-sm overflow-hidden">
                <SectionHeader title="Task Information" />
                <div className="px-5 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                        <div>
                            <FieldRow label="Subject" value={task.name} />
                            <FieldRow label="Comments" value={task.description} />
                            <FieldRow label="Due Date" value={dueFormatted} />
                        </div>
                        <div>
                            <FieldRow label="Assigned To" value={task.assigned_user_name} isLink />
                            <FieldRow label="Status" value={task.status} />
                            <FieldRow label="Priority" value={task.priority} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Related To */}
            <div className="bg-white rounded-md border shadow-sm overflow-hidden">
                <SectionHeader title="Related To" />
                <div className="px-5 pb-4">
                    <div className="grid grid-cols-2 gap-x-8 border-b border-gray-100 pb-2 mb-2">
                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Name</span>
                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Related To</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 py-2">
                        <span className="text-sm text-muted-foreground">{task.taskable_type || "—"}</span>
                        <Link
                            href={
                                task.taskable_type === "Opportunity" && task.taskable_id
                                    ? `/opportunities/${task.taskable_id}`
                                    : task.taskable_type === "Account" && task.taskable_id
                                    ? `/accounts/${task.taskable_id}`
                                    : "#"
                            }
                            className="text-sm text-blue-600 hover:underline"
                        >
                            {task.taskable_name || "—"}
                        </Link>
                    </div>
                </div>
            </div>

            {/* System Information */}
            <div className="bg-white rounded-md border shadow-sm overflow-hidden">
                <SectionHeader title="System information" />
                <div className="px-5 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                        <div>
                            <FieldRow
                                label="Created by"
                                value={
                                    task.created_by_name
                                        ? `${task.created_by_name}${createdFormatted ? `, ${createdFormatted}` : ""}`
                                        : createdFormatted
                                }
                                isLink
                            />
                        </div>
                        <div>
                            <FieldRow
                                label="Last Modified By"
                                value={
                                    task.last_modified_by_name
                                        ? `${task.last_modified_by_name}${updatedFormatted ? `, ${updatedFormatted}` : ""}`
                                        : updatedFormatted
                                }
                                isLink
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            <TaskModal
                open={editOpen}
                onOpenChange={setEditOpen}
                initialData={task as any}
            />

            {/* Follow-Up Modal */}
            <TaskModal
                open={followUpOpen}
                onOpenChange={setFollowUpOpen}
                parentTaskId={task.id}
                initialData={task as any}
            />
        </div>
    );
}
