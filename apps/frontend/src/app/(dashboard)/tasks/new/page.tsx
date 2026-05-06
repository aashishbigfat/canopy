"use client";

import { TaskForm } from "@/features/tasks/components/task-form";

export default function NewTaskPage() {
    return (
        <div className="crm-page">
            <div className="crm-surface flex items-center justify-between px-4 py-3">
                <h1>Create Task</h1>
            </div>
            <div className="crm-surface p-4">
                <TaskForm />
            </div>
        </div>
    );
}
