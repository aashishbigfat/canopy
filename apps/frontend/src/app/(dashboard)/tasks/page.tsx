import { TaskList } from "@/features/tasks/components/task-list";

export const dynamic = "force-dynamic";

export default function TasksPage() {
    return (
        <div className="flex-1 min-w-0 w-full space-y-4 p-3 sm:p-6 pt-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Tasks</h2>
            </div>
            {/* TaskList renders its own New button and filter toolbar */}
            <TaskList />
        </div>
    );
}
