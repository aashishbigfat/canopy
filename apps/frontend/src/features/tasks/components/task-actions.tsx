"use client";

import { MoreHorizontal, Edit, Trash, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Task } from "@/features/tasks/types";
import { useDeleteTask, useCompleteTask } from "@/features/tasks/api/use-tasks";

interface TaskActionsProps {
    task: Task;
}

export function TaskActions({ task }: TaskActionsProps) {
    const router = useRouter();
    const deleteTask = useDeleteTask();
    const completeTask = useCompleteTask();

    const handleEdit = () => {
        router.push(`/tasks/${task.id}`);
    };

    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete this task?")) {
            await deleteTask.mutateAsync(task.id);
        }
    };

    const handleComplete = async () => {
        await completeTask.mutateAsync(task.id);
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                </DropdownMenuItem>
                {task.status !== 'Completed' && (
                    <DropdownMenuItem onClick={handleComplete}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark Complete
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
