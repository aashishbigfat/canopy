"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TaskForm } from "./task-form";
import { Task } from "@/features/tasks/types";
import { Plus, Loader2 } from "lucide-react";

interface TaskModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    initialData?: Task;
    parentTaskId?: string;
}

export function TaskModal({
    open,
    onOpenChange,
    title,
    initialData,
    parentTaskId,
}: TaskModalProps) {
    const [formLoading, setFormLoading] = React.useState(false);

    const modalTitle =
        title ??
        (parentTaskId
            ? "Create Follow Up Task"
            : initialData
                ? "Edit Task"
                : "Add New Task");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-[620px] p-0 gap-0 overflow-hidden"
                showCloseButton={false}
            >
                <div className="flex items-center justify-between border-b bg-card px-6 py-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md crm-icon-primary">
                            <Plus className="h-4 w-4 text-primary" />
                        </div>
                        <DialogTitle className="text-[15px] font-semibold tracking-tight text-foreground">
                            {modalTitle}
                        </DialogTitle>
                    </div>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-xl font-light leading-none text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                {/* Hidden description for a11y */}
                <DialogDescription className="sr-only">
                    {initialData
                        ? "Edit the details of the selected task."
                        : "Fill in the details to create a new task."}
                </DialogDescription>

                {/* ── Form body with scrollable area ── */}
                <div className="px-6 py-5 max-h-[calc(100vh-240px)] overflow-y-auto">
                    <TaskForm
                        initialData={initialData}
                        onSuccess={() => onOpenChange(false)}
                        onLoadingChange={setFormLoading}
                        embedded
                    />
                </div>

                {/* ── Footer ── */}
                <DialogFooter className="crm-dialog-footer px-6 py-3">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form="task-form"
                        size="sm"
                        disabled={formLoading}
                    >
                        {formLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                        {initialData ? "Update Task" : "Create Task"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
