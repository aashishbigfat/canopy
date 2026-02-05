"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTask, useUpdateTask } from "@/features/tasks/api/use-tasks";
import { Task } from "@/features/tasks/types";
import { useGetUsers } from "@/features/admin/api/use-users";
import { User } from "@/features/admin/types";

const taskFormSchema = z.object({
    name: z.string().min(2, "Subject is required"),
    due_date: z.string().optional(), // Inputs return string, even date inputs often
    status: z.enum(["Not Started", "In Progress", "Completed", "Deferred"]).default("Not Started"),
    priority: z.enum(["Low", "Normal", "High"]).default("Normal"),
    assigned_user_id: z.string().min(1, "Assignee is required"),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
    initialData?: Task;
}

export function TaskForm({ initialData }: TaskFormProps) {
    const router = useRouter();
    const createTask = useCreateTask();
    const updateTask = useUpdateTask();
    const { data: usersData } = useGetUsers();
    // Fix: access .data instead of .users based on UserResponse type
    const users = usersData?.data || [];

    const form = useForm({
        resolver: zodResolver(taskFormSchema),
        defaultValues: {
            name: initialData?.name || "",
            due_date: initialData?.due_date ? initialData.due_date.split('T')[0] : "",
            status: initialData?.status || "Not Started",
            priority: initialData?.priority || "Normal",
            assigned_user_id: initialData?.assigned_user_id || "",
        },
    });

    const onSubmit = async (data: TaskFormValues) => {
        try {
            if (initialData) {
                await updateTask.mutateAsync({ id: initialData.id, data });
            } else {
                await createTask.mutateAsync(data);
            }
            router.push("/tasks");
            router.refresh();
        } catch (error) {
            console.error("Failed to save task", error);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Subject</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Call Client X" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="due_date"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Due Date</FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="assigned_user_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Assigned To</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select User" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {users.map((u: User) => (
                                            <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Not Started">Not Started</SelectItem>
                                        <SelectItem value="In Progress">In Progress</SelectItem>
                                        <SelectItem value="Deferred">Deferred</SelectItem>
                                        <SelectItem value="Completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Priority</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Priority" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Low">Low</SelectItem>
                                        <SelectItem value="Normal">Normal</SelectItem>
                                        <SelectItem value="High">High</SelectItem>
                                        <SelectItem value="Urgent">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Button type="submit" disabled={createTask.isPending || updateTask.isPending}>
                    {createTask.isPending || updateTask.isPending ? "Saving..." : "Save Task"}
                </Button>
            </form>
        </Form>
    );
}
