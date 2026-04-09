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
                {/* ── Branded blue gradient header matching CRM design system ── */}
                <div className="bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-md bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Plus className="h-4 w-4 text-white" />
                        </div>
                        <DialogTitle className="text-white text-[15px] font-semibold tracking-tight">
                            {modalTitle}
                        </DialogTitle>
                    </div>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="text-white/70 hover:text-white transition-colors text-xl leading-none font-light rounded-md hover:bg-white/10 h-7 w-7 flex items-center justify-center"
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
                <DialogFooter className="border-t border-border/50 px-6 py-3 bg-muted/30">
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
                        className="bg-blue-600 hover:bg-blue-700 text-white"
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
