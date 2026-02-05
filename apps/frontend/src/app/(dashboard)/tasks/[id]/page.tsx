"use client";

import { use } from "react";
import { TaskForm } from "@/features/tasks/components/task-form";
import { useGetTask } from "@/features/tasks/api/use-tasks";

interface EditTaskPageProps {
    params: Promise<{ id: string }>;
}

export default function EditTaskPage({ params }: EditTaskPageProps) {
    const { id } = use(params);
    const { data: task, isLoading, isError } = useGetTask(id);

    if (isLoading) {
        return <div className="p-8">Loading task details...</div>;
    }

    if (isError || !task) {
        return <div className="p-8 text-red-500">Error loading task or task not found.</div>;
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Edit Task</h2>
            </div>
            <div className="rounded-md border p-4 bg-background">
                <TaskForm initialData={task} />
            </div>
        </div>
    );
}
