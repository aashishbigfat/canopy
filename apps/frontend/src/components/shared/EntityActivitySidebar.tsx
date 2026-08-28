"use client";

import { useState } from "react";
import {
    Activity,
    Calendar,
    Phone,
    Mail,
    MessageSquare,
    CheckCircle2,
    Plus,
    Clock,
    History
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";

import { toast } from "sonner";
import { tasksService } from "@/lib/api/services/activities.service";
import { useGetUsers } from "@/features/admin/api/use-users";

interface OpportunitySummaryMetric {
    count: number;
    pax: number;
    value: number;
}

export interface OpportunitySummary {
    total: OpportunitySummaryMetric;
    won: OpportunitySummaryMetric;
    open: OpportunitySummaryMetric;
    lost: OpportunitySummaryMetric;
    won_percent: OpportunitySummaryMetric;
}

interface EntityActivitySidebarProps {
    entityType: "Contact" | "Account" | "Lead" | "Supplier";
    entityId: string;
    entityName?: string;
    relatedTo?: string;
    opportunitySummary?: OpportunitySummary | null;
}

export function EntityActivitySidebar({
    entityType,
    entityId,
    entityName,
    relatedTo,
    opportunitySummary
}: EntityActivitySidebarProps) {
    const { data: session } = useSession();
    const { data: usersData } = useGetUsers();
    const users = (usersData as any)?.users || usersData?.data || [];
    
    const [taskSubject, setTaskSubject] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [assignedTo, setAssignedTo] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveTask = async () => {
        if (!taskSubject) {
            toast.error("Please enter a subject");
            return;
        }

        if (!session?.user?.id) {
            toast.error("You must be logged in to create a task");
            return;
        }

        try {
            setIsSaving(true);
            await tasksService.createTask({
                name: taskSubject,
                assigned_user_id: assignedTo || session.user.id,
                due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
                status: "Not Started",
                priority: "Normal",
                taskable_type: entityType,
                taskable_id: entityId,
                description: `Created from ${entityType} sidebar`
            });

            toast.success("Task created successfully");
            setTaskSubject("");
            setDueDate("");
        } catch (error) {
            console.error("Error saving task:", error);
            toast.error("Failed to create task");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="glass border-border/70">
                <Tabs defaultValue={opportunitySummary ? "summary" : "activity"} className="w-full">
                    <CardHeader className="border-b pb-0 bg-muted/30">
                        <div className="flex items-center justify-between mb-4">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Activity className="h-4 w-4 text-primary" />
                                Activity
                            </CardTitle>
                        </div>
                        <TabsList className="w-full justify-start gap-2 rounded-md bg-muted/40 p-1">
                            {opportunitySummary && (
                                <TabsTrigger
                                    value="summary"
                                    className="relative h-8 rounded-md bg-transparent px-4 font-semibold text-muted-foreground shadow-none transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm hover:text-foreground"
                                >
                                    Summary
                                </TabsTrigger>
                            )}
                            <TabsTrigger
                                value="activity"
                                className="relative h-8 rounded-md bg-transparent px-4 font-semibold text-muted-foreground shadow-none transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm hover:text-foreground"
                            >
                                Activity
                            </TabsTrigger>
                            <TabsTrigger
                                value="history"
                                className="relative h-8 rounded-md bg-transparent px-4 font-semibold text-muted-foreground shadow-none transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm hover:text-foreground"
                            >
                                Activities Log
                            </TabsTrigger>
                        </TabsList>
                    </CardHeader>
                    <CardContent className="p-0">
                        {opportunitySummary && (
                            <TabsContent value="summary" className="m-0">
                                <OpportunitySummaryTable summary={opportunitySummary} />
                            </TabsContent>
                        )}
                        <TabsContent value="activity" className="m-0">
                            <Tabs defaultValue="task" className="w-full">
                                <div className="border-b px-4">
                                    <TabsList className="bg-transparent h-12 w-full grid grid-cols-4 p-1 gap-1">
                                        <TabsTrigger
                                            value="task"
                                            className="relative h-10 rounded-md bg-transparent px-2 text-xs font-semibold text-muted-foreground shadow-none transition-all data-[state=active]:bg-primary/10 data-[state=active]:text-primary hover:text-foreground focus-visible:ring-0"
                                        >
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                            Task
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="call"
                                            className="relative h-10 rounded-md bg-transparent px-2 text-xs font-semibold text-muted-foreground shadow-none transition-all data-[state=active]:bg-primary/10 data-[state=active]:text-primary hover:text-foreground focus-visible:ring-0"
                                        >
                                            <Phone className="h-4 w-4 mr-2" />
                                            Log a Call
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="email"
                                            className="relative h-10 rounded-md bg-transparent px-2 text-xs font-semibold text-muted-foreground shadow-none transition-all data-[state=active]:bg-primary/10 data-[state=active]:text-primary hover:text-foreground focus-visible:ring-0"
                                        >
                                            <Mail className="h-4 w-4 mr-2" />
                                            Email
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="whatsapp"
                                            className="relative h-10 rounded-md bg-transparent px-2 text-xs font-semibold text-muted-foreground shadow-none transition-all data-[state=active]:bg-primary/10 data-[state=active]:text-primary hover:text-foreground focus-visible:ring-0"
                                        >
                                            <MessageSquare className="h-4 w-4 mr-2" />
                                            Whatsapp
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                <div className="p-4">
                                    <TabsContent value="task" className="mt-0 space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">Subject</label>
                                            <Input
                                                placeholder="Subject"
                                                value={taskSubject}
                                                onChange={(e) => setTaskSubject(e.target.value)}
                                                className="h-9"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground">Assigned To</label>
                                                <Select value={assignedTo || session?.user?.id || ""} onValueChange={setAssignedTo}>
                                                    <SelectTrigger className="h-9">
                                                        <SelectValue placeholder="Assign To" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {users.map((u: any) => (
                                                            <SelectItem key={u.id || u._id} value={u.id || u._id}>
                                                                {u.name}
                                                            </SelectItem>
                                                        ))}
                                                        {!users.length && session?.user && (
                                                            <SelectItem value={session.user.id}>{session.user.name || "Me"}</SelectItem>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground">Select Due Date</label>
                                                <div className="relative">
                                                    <Input
                                                        type="datetime-local"
                                                        className="h-9 pr-8"
                                                        value={dueDate}
                                                        onChange={(e) => setDueDate(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">Name</label>
                                            <Input disabled value={entityName || "None"} className="h-9 bg-muted/40 font-medium text-foreground" />
                                        </div>
                                        <div className="flex justify-end pt-2">
                                            <Button
                                                onClick={handleSaveTask}
                                                disabled={isSaving}
                                                className="h-9 px-6 text-xs font-semibold"
                                            >
                                                {isSaving ? "Saving..." : "Save"}
                                            </Button>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="call" className="mt-0 py-8 text-center text-muted-foreground">
                                        <Phone className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">Call logging functionality coming soon</p>
                                    </TabsContent>
                                    <TabsContent value="email" className="mt-0 py-8 text-center text-muted-foreground">
                                        <Mail className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">Email integration coming soon</p>
                                    </TabsContent>
                                    <TabsContent value="whatsapp" className="mt-0 py-8 text-center text-muted-foreground">
                                        <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">WhatsApp integration coming soon</p>
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </TabsContent>

                        <TabsContent value="history" className="m-0">
                            <div className="p-4 max-h-[600px] overflow-y-auto">
                                <ActivityTimeline entityType={entityType.toLowerCase()} entityId={entityId} />
                            </div>
                        </TabsContent>
                    </CardContent>
                </Tabs>
            </Card>
        </div>
    );
}

function OpportunitySummaryTable({ summary }: { summary: OpportunitySummary }) {
    const fmtNum = (n: number) => Math.round(n).toLocaleString();
    const fmtPct = (n: number) => `${Number(n).toFixed(2)}%`;

    const rows: { label: string; metric: OpportunitySummaryMetric; isPercent?: boolean }[] = [
        { label: "Total", metric: summary.total },
        { label: "Won", metric: summary.won },
        { label: "Open", metric: summary.open },
        { label: "Lost", metric: summary.lost },
        { label: "Won %", metric: summary.won_percent, isPercent: true },
    ];

    return (
        <div className="p-4">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b text-xs font-semibold text-muted-foreground">
                        <th className="py-2 text-left"></th>
                        <th className="py-2 text-right">#</th>
                        <th className="py-2 text-right">PAX</th>
                        <th className="py-2 text-right">Value</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(({ label, metric, isPercent }) => (
                        <tr
                            key={label}
                            className={`border-b last:border-0 ${isPercent ? "font-semibold text-primary" : "text-foreground"}`}
                        >
                            <td className="py-3 text-left text-muted-foreground">{label}</td>
                            <td className="py-3 text-right tabular-nums">
                                {isPercent ? fmtPct(metric.count) : fmtNum(metric.count)}
                            </td>
                            <td className="py-3 text-right tabular-nums">
                                {isPercent ? fmtPct(metric.pax) : fmtNum(metric.pax)}
                            </td>
                            <td className="py-3 text-right tabular-nums">
                                {isPercent ? fmtPct(metric.value) : fmtNum(metric.value)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
