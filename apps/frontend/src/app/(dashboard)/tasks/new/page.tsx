"use client";

import { TaskForm } from "@/features/tasks/components/task-form";

export default function NewTaskPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Create Task</h2>
            </div>
            <div className="rounded-md border p-4 bg-background">
                <TaskForm />
            </div>
        </div>
    );
}
