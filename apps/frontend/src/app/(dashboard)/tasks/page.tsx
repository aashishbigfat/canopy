import { TaskList } from "@/features/tasks/components/task-list";

export const dynamic = "force-dynamic";

export default function TasksPage() {
    return (
        <div className="crm-page">
            <div className="crm-surface flex items-center justify-between px-4 py-3">
                <div>
                    <h1>Tasks</h1>
                    <p className="text-sm text-muted-foreground">Track activities, follow-ups, and ownership priorities.</p>
                </div>
            </div>
            {/* TaskList renders its own New button and filter toolbar */}
            <TaskList />
        </div>
    );
}
