"use client";

import { useState } from "react";
import {
    Mail,
    Phone,
    Globe,
    MapPin,
    Building2,
    Calendar,
    User as UserIcon,
    Edit,
    CheckCircle2,
    Briefcase,
    ChevronLeft,
    TrendingUp,
    DollarSign,
    Target,
    Map,
    MessageSquare,
    PhoneCall,
    Trash2,
    RefreshCw,
    Paperclip,
    Users,
    Package,
    Receipt
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Opportunity } from "../types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { UpdateStageDialog } from "./UpdateStageDialog";
import { SalesStage } from "@/lib/api/services/opportunities.service";
import { useOpportunityHistory, useOpportunityTasks, useCreateOpportunityTask, useUpdateOpportunityStage, useDeleteOpportunity } from "../api/useOpportunities";
import { ChangeOwnerDialog } from "@/components/shared/ChangeOwnerDialog";
import { accountService } from "@/features/accounts/services/accountService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { opportunitiesService } from "@/lib/api/services/opportunities.service";

interface OpportunityDetailsProps {
    opportunity: Opportunity;
    stages?: SalesStage[];
}

export function OpportunityDetails({
    opportunity,
    stages = []
}: OpportunityDetailsProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isOwnerDialogOpen, setIsOwnerDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const stage = stages.find(s => s.id === opportunity.sales_stage_id);

    // Sort stages strictly by sorting number to represent pipeline order
    const orderedStages = [...stages].sort((a, b) => (a.sorting || 0) - (b.sorting || 0));
    const currentStageIndex = orderedStages.findIndex(s => s.id === opportunity.sales_stage_id);

    const { data: history = [] } = useOpportunityHistory(opportunity.id);
    const { data: tasks = [] } = useOpportunityTasks(opportunity.id);
    const { mutate: updateStage } = useUpdateOpportunityStage();

    const changeOwnerMutation = useMutation({
        mutationFn: async (newOwnerId: string) => {
            const response = await opportunitiesService.updateOpportunity(opportunity.id, { owner_id: newOwnerId } as any);
            return response;
        },
        onSuccess: () => {
            toast.success("Owner changed successfully");
            queryClient.invalidateQueries({ queryKey: ["opportunities"] });
            router.refresh();
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.detail || "Failed to change owner");
        }
    });

    const handleStageClick = (targetStageId: string, _index: number) => {
        updateStage({ id: opportunity.id, stageId: targetStageId });
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await opportunitiesService.deleteOpportunity(opportunity.id);
            toast.success("Opportunity deleted successfully");
            router.push("/opportunities");
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Failed to delete opportunity");
            setIsDeleting(false);
            setIsDeleteOpen(false);
        }
    };

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto">
            <UpdateStageDialog
                opportunityId={opportunity.id}
                currentStageId={opportunity.sales_stage_id}
                stages={stages}
                isOpen={isStageDialogOpen}
                onClose={() => setIsStageDialogOpen(false)}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Opportunity?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{opportunity.name}</strong>? This action cannot be undone and will remove all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-red-500 hover:bg-red-600 text-white"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Owner Change Dialog */}
            <ChangeOwnerDialog
                isOpen={isOwnerDialogOpen}
                onClose={() => setIsOwnerDialogOpen(false)}
                onConfirm={(newOwnerId) => {
                    changeOwnerMutation.mutate(newOwnerId);
                    setIsOwnerDialogOpen(false);
                }}
                type="Opportunity"
                isLoading={changeOwnerMutation.isPending}
            />

            {/* Header / Actions - Styled like reference UI */}
            <div className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                    <div className="flex gap-4">
                        <div className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                            <Briefcase className="h-6 w-6 text-white" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-semibold text-blue-600">
                                    Opportunity <span className="text-muted-foreground font-normal">({opportunity.account_name || "Personal Account"})</span>
                                </h1>
                                {opportunity.creation_type && (
                                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 font-normal">
                                        {opportunity.creation_type === "Auto" ? "Lead Converted" : opportunity.creation_type}
                                    </Badge>
                                )}
                            </div>
                            <h2 className="text-lg font-medium">{opportunity.name}</h2>
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600 pt-1">
                                <div className="space-y-1">
                                    <p className="text-xs text-slate-400">Name</p>
                                    <p className="font-medium text-blue-500">
                                        {opportunity.contact_name || opportunity.account_name || "-"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-slate-400">Email | Mobile</p>
                                    <p className="font-medium text-blue-500 text-xs">
                                        {opportunity.contact_email || "-"} | {opportunity.contact_phone || "-"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-slate-400">Travel Date | No of Pax</p>
                                    <p className="font-medium text-slate-700">
                                        {opportunity.travel_date
                                            ? new Date(opportunity.travel_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
                                            : "-"} | {opportunity.no_of_pax || "-"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end justify-between min-w-[250px]">
                        <div className="flex items-center gap-2">
                            <div className="text-right text-xs space-y-1 mr-4">
                                <div className="flex items-center justify-end gap-2">
                                    <span className="text-slate-500">Key Deal</span>
                                    <input type="checkbox" checked={opportunity.key_deal} readOnly className="rounded border-slate-300" />
                                </div>
                                <div className="flex items-center justify-end gap-2">
                                    <span className="text-slate-500">Verified by Account</span>
                                    <input type="checkbox" readOnly className="rounded border-slate-300" />
                                </div>
                            </div>
                            <Button className="bg-blue-500 hover:bg-blue-600 h-8" size="sm" asChild>
                                <Link href={`/opportunities/${opportunity.id}/edit`}>Edit</Link>
                            </Button>
                            <Button
                                variant="destructive"
                                className="h-8 bg-red-400 hover:bg-red-500"
                                size="sm"
                                onClick={() => setIsDeleteOpen(true)}
                            >
                                Delete
                            </Button>
                        </div>

                        <div className="w-full mt-4 space-y-2 text-xs text-right">
                            <div className="flex justify-between border-b pb-1">
                                <span className="text-slate-500">Opportunity Owner</span>
                                <button
                                    onClick={() => setIsOwnerDialogOpen(true)}
                                    className="font-medium text-blue-500 flex items-center gap-1 hover:text-blue-700 transition-colors"
                                >
                                    {opportunity.owner_name} <UserIcon className="h-3 w-3" />
                                </button>
                            </div>
                            <div className="flex justify-between border-b pb-1">
                                <span className="text-slate-500">Operation Owner</span>
                                <span className="font-medium">-</span>
                            </div>
                            <div className="flex justify-between pb-1">
                                <span className="text-slate-500">Territory Manger</span>
                                <span className="font-medium text-blue-500">System</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sales Stage Stepper */}
            <div className="bg-white p-4 rounded-lg border shadow-sm">
                <h3 className="text-sm font-semibold mb-3">Sales stages</h3>
                <div className="flex items-center justify-between">
                    <div className="flex flex-1 items-center relative z-10">
                        {orderedStages.map((s, index) => {
                            const isCurrent = index === currentStageIndex;
                            const isPast = index < currentStageIndex;

                            return (
                                <div
                                    key={s.id}
                                    onClick={() => handleStageClick(s.id, index)}
                                    className={cn(
                                        "relative flex-1 py-2 px-4 text-center text-xs font-medium cursor-pointer transition-colors border-y border-r first:border-l first:rounded-l-full last:rounded-r-full group",
                                        isCurrent ? "bg-slate-900 border-slate-900 text-white" :
                                            isPast ? "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200" :
                                                "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                    )}
                                    style={{
                                        clipPath: index < orderedStages.length - 1 ?
                                            'polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%, 10px 50%)' :
                                            index === 0 ?
                                                'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' :
                                                'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 10px 50%)',
                                        marginLeft: index > 0 ? '-10px' : '0',
                                        paddingLeft: index > 0 ? '1.5rem' : '1rem'
                                    }}
                                >
                                    {s.name}
                                </div>
                            );
                        })}
                    </div>
                    <Button
                        className="ml-4 bg-blue-500 hover:bg-blue-600 rounded-full text-xs h-8 px-6 whitespace-nowrap"
                        onClick={() => setIsStageDialogOpen(true)}
                    >
                        Mark as Current Stage
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* Main Content Area - Tabs */}
                <div className="lg:col-span-2">
                    <Tabs defaultValue="activity" className="w-full bg-white rounded-lg border shadow-sm">
                        <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 overflow-x-auto">
                            <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 px-6 py-3 font-medium text-sm">Activity</TabsTrigger>
                            <TabsTrigger value="departures" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 px-6 py-3 font-medium text-sm">Departures</TabsTrigger>
                            <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 px-6 py-3 font-medium text-sm">Details</TabsTrigger>
                            <TabsTrigger value="itineraries" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 px-6 py-3 font-medium text-sm">Itineraries</TabsTrigger>
                            <TabsTrigger value="financial" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 px-6 py-3 font-medium text-sm">Financial</TabsTrigger>
                            <TabsTrigger value="supplier" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 px-6 py-3 font-medium text-sm">Supplier</TabsTrigger>
                            <TabsTrigger value="attachments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 px-6 py-3 font-medium text-sm">Attachments</TabsTrigger>
                            <span className="flex items-center px-4 py-3">
                                <Link href={`/opportunities/${opportunity.id}/edit`} className="text-sm font-medium text-slate-500 hover:text-blue-600 flex items-center gap-1">
                                    <Edit className="h-3.5 w-3.5" /> Edit
                                </Link>
                            </span>
                        </TabsList>

                        {/* ── ACTIVITY TAB ── */}
                        <TabsContent value="activity" className="p-6 focus-visible:outline-none focus-visible:ring-0">
                            <div className="flex gap-4 border-b pb-4 mb-4">
                                <Button className="bg-blue-600 hover:bg-blue-700 h-8 text-xs font-semibold rounded-sm">Task</Button>
                                <Button variant="ghost" className="h-8 text-xs font-semibold text-slate-500 hover:text-slate-900"><PhoneCall className="h-3 w-3 mr-2" /> Log a Call</Button>
                                <Button variant="ghost" className="h-8 text-xs font-semibold text-slate-500 hover:text-slate-900"><Mail className="h-3 w-3 mr-2" /> Email</Button>
                                <Button variant="ghost" className="h-8 text-xs font-semibold text-slate-500 hover:text-slate-900"><MessageSquare className="h-3 w-3 mr-2" /> Whatsapp</Button>
                            </div>

                            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs text-slate-500 font-medium">Subject</label>
                                    <input type="text" className="w-full border rounded text-sm px-3 py-1.5 focus:outline-none focus:border-blue-500" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-slate-500 font-medium">Assigned To</label>
                                    <select className="w-full border rounded text-sm px-3 py-1.5 focus:outline-none focus:border-blue-500 bg-white">
                                        <option>{opportunity.owner_name}</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-slate-500 font-medium">Select Due Date</label>
                                    <input type="datetime-local" className="w-full border rounded text-sm px-3 py-1.5 focus:outline-none focus:border-blue-500 text-slate-400" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-slate-500 font-medium">Name</label>
                                    <input type="text" value={opportunity.owner_name || ""} readOnly className="w-full border rounded text-sm px-3 py-1.5 bg-slate-50 text-slate-600 outline-none" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-slate-500 font-medium">Related to</label>
                                    <p className="text-sm text-slate-700 pt-1.5">{opportunity.name}</p>
                                </div>
                                <div className="space-y-1.5 mt-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" className="rounded border-slate-300" />
                                        <span className="text-xs text-slate-600 font-medium">Add Reminder</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end border-b pb-6 mb-6">
                                <Button className="bg-blue-500 hover:bg-blue-600 px-8">Save</Button>
                            </div>

                            {/* Task List */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 text-sm font-semibold text-slate-700">
                                    <span className="w-24">Next Task</span>
                                    <div className="flex-1 border-b border-dashed border-slate-300"></div>
                                </div>
                                <ul className="space-y-2">
                                    {tasks.filter(t => t.status !== "Completed").length === 0 ? (
                                        <li className="text-sm text-slate-500 italic py-2 pl-28">No open tasks</li>
                                    ) : (
                                        tasks.filter(t => t.status !== "Completed").map(task => (
                                            <li key={task.id} className="flex items-center gap-3 pl-28 py-1 group">
                                                <div className="h-5 w-5 rounded border border-slate-300 flex items-center justify-center cursor-pointer hover:border-blue-500">
                                                    <CheckCircle2 className="h-3 w-3 text-transparent group-hover:text-blue-200" />
                                                </div>
                                                <a href="#" className="text-sm text-blue-600 hover:underline">{task.name}</a>
                                                {task.due_date && <span className="text-xs text-slate-500">({format(new Date(task.due_date), "dd MMM yyyy HH:mm")})</span>}
                                                {task.priority === "High" && <Badge variant="secondary" className="bg-red-50 text-red-600 px-1.5 py-0 text-[10px] h-4">high</Badge>}
                                            </li>
                                        ))
                                    )}
                                </ul>

                                <div className="flex items-center gap-4 text-sm font-semibold text-slate-700 mt-8">
                                    <span className="w-24">Previous Task</span>
                                    <div className="flex-1 border-b border-dashed border-slate-300"></div>
                                </div>
                                <ul className="space-y-2">
                                    {tasks.filter(t => t.status === "Completed").map(task => (
                                        <li key={task.id} className="flex items-center gap-3 pl-28 py-1">
                                            <div className="h-5 w-5 rounded bg-blue-50 text-blue-500 flex items-center justify-center">
                                                <CheckCircle2 className="h-3 w-3" />
                                            </div>
                                            <span className="text-sm text-slate-500 line-through">{task.name}</span>
                                            {task.completed_at && <span className="text-xs text-slate-400">({format(new Date(task.completed_at), "dd MMM yyyy")})</span>}
                                        </li>
                                    ))}
                                </ul>

                                <div className="flex items-center gap-4 text-sm font-semibold text-slate-700 mt-8">
                                    <span className="w-24 border border-orange-200 bg-orange-50 text-orange-600 px-2 rounded-sm inline-flex justify-between items-center h-6">
                                        Email <RefreshCw className="h-3 w-3" />
                                    </span>
                                    <div className="flex-1 border-b border-dashed border-slate-300"></div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* ── DEPARTURES TAB ── */}
                        <TabsContent value="departures" className="p-6 focus-visible:outline-none focus-visible:ring-0">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-blue-500" />
                                    Departures
                                </h3>
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-8 text-xs">
                                    + Add Departure
                                </Button>
                            </div>
                            <div className="text-center py-16 border-2 border-dashed rounded-lg bg-slate-50/50">
                                <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                                <p className="text-slate-500 font-medium">No departures added</p>
                                <p className="text-slate-400 text-sm mt-1">Add departure dates and details for this opportunity.</p>
                            </div>
                        </TabsContent>

                        {/* ── DETAILS TAB ── */}
                        <TabsContent value="details" className="p-6">
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-4">
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</p>
                                    <p className="text-lg font-bold text-slate-900">
                                        {opportunity.amount ? `$${opportunity.amount.toLocaleString()}` : "$0"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Probability</p>
                                    <div className="flex items-center gap-3">
                                        <span className="text-base font-semibold">{opportunity.probability || 0}%</span>
                                        <div className="flex-1 max-w-[100px] h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${opportunity.probability || 0}%` }} />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Segment</p>
                                    <Badge variant="secondary" className={cn("uppercase font-bold mt-1", opportunity.segment === "B2B" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700")}>
                                        {opportunity.segment || "B2C"}
                                    </Badge>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expected Close Date</p>
                                    <span className="text-sm font-medium pt-1 block">
                                        {opportunity.close_date ? format(new Date(opportunity.close_date), "PPP") : "Not Set"}
                                    </span>
                                </div>
                                {(opportunity as any).no_of_nights && (
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">No. of Nights</p>
                                        <p className="text-sm font-semibold pt-1">{(opportunity as any).no_of_nights}</p>
                                    </div>
                                )}
                                <div className="space-y-2 col-span-full mt-4">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Destinations</p>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {opportunity.destination_names && opportunity.destination_names.length > 0 ? (
                                            opportunity.destination_names.map((dest, i) => (
                                                <Badge key={i} variant="outline" className="bg-slate-50 px-3 py-1 font-medium border-slate-200">
                                                    <MapPin className="h-3 w-3 mr-1.5 text-blue-500" />
                                                    {dest}
                                                </Badge>
                                            ))
                                        ) : (
                                            <p className="text-sm text-slate-400">No destinations specified</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* ── ITINERARIES TAB ── */}
                        <TabsContent value="itineraries" className="p-6 focus-visible:outline-none focus-visible:ring-0">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Map className="h-4 w-4 text-blue-500" />
                                    Itineraries
                                </h3>
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-8 text-xs">
                                    + Add Itinerary
                                </Button>
                            </div>
                            <div className="text-center py-16 border-2 border-dashed rounded-lg bg-slate-50/50">
                                <Map className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                                <p className="text-slate-500 font-medium">No itineraries yet</p>
                                <p className="text-slate-400 text-sm mt-1">Create travel itineraries to plan the trip details.</p>
                            </div>
                        </TabsContent>

                        {/* ── FINANCIAL TAB ── */}
                        <TabsContent value="financial" className="p-6 focus-visible:outline-none focus-visible:ring-0">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Receipt className="h-4 w-4 text-blue-500" />
                                    Financial Summary
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <Card className="border-slate-200">
                                    <CardContent className="p-4">
                                        <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Deal Amount</p>
                                        <p className="text-2xl font-bold text-slate-900">
                                            ₹{(opportunity.amount || 0).toLocaleString()}
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card className="border-slate-200">
                                    <CardContent className="p-4">
                                        <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Probability</p>
                                        <p className="text-2xl font-bold text-blue-600">{opportunity.probability || 0}%</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-slate-200">
                                    <CardContent className="p-4">
                                        <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Expected Revenue</p>
                                        <p className="text-2xl font-bold text-emerald-600">
                                            ₹{(((opportunity.amount || 0) * (opportunity.probability || 0)) / 100).toLocaleString()}
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="text-center py-10 border-2 border-dashed rounded-lg bg-slate-50/50">
                                <Receipt className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                                <p className="text-slate-500 font-medium">No financial details yet</p>
                                <p className="text-slate-400 text-sm mt-1">Add invoices or payment details to track financials.</p>
                            </div>
                        </TabsContent>

                        {/* ── SUPPLIER TAB ── */}
                        <TabsContent value="supplier" className="p-6 focus-visible:outline-none focus-visible:ring-0">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Package className="h-4 w-4 text-blue-500" />
                                    Suppliers
                                </h3>
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-8 text-xs">
                                    + Link Supplier
                                </Button>
                            </div>
                            <div className="text-center py-16 border-2 border-dashed rounded-lg bg-slate-50/50">
                                <Package className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                                <p className="text-slate-500 font-medium">No suppliers linked</p>
                                <p className="text-slate-400 text-sm mt-1">Link suppliers to manage costs and vendor details.</p>
                            </div>
                        </TabsContent>

                        {/* ── ATTACHMENTS TAB ── */}
                        <TabsContent value="attachments" className="p-6 focus-visible:outline-none focus-visible:ring-0">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Paperclip className="h-4 w-4 text-blue-500" />
                                    Attachments
                                </h3>
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-8 text-xs">
                                    + Upload File
                                </Button>
                            </div>
                            <div className="text-center py-16 border-2 border-dashed rounded-lg bg-slate-50/50">
                                <Paperclip className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                                <p className="text-slate-500 font-medium">No attachments found</p>
                                <p className="text-slate-400 text-sm mt-1">Upload documents, images, or files related to this opportunity.</p>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Sidebar - Stage History */}
                <div className="space-y-6">
                    <Card className="border shadow-sm rounded-lg overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b py-3 px-4">
                            <CardTitle className="text-base font-semibold text-slate-700">Stage History</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {/* Current stats summary grid like reference */}
                            <div className="grid grid-cols-2 gap-px bg-slate-100 border-b">
                                <div className="bg-white p-3 space-y-1">
                                    <p className="text-xs font-semibold text-slate-900">Stage:</p>
                                    <p className="text-xs text-slate-600">{stage?.name}</p>
                                </div>
                                <div className="bg-white p-3 space-y-1">
                                    <p className="text-xs font-semibold text-slate-900">Amount:</p>
                                    <p className="text-xs text-slate-600">₹ {opportunity.amount?.toLocaleString() || "0"}</p>
                                </div>
                                <div className="bg-white p-3 space-y-1">
                                    <p className="text-xs font-semibold text-slate-900">Probability (%):</p>
                                    <p className="text-xs text-slate-600">{opportunity.probability || "0"}</p>
                                </div>
                                <div className="bg-white p-3 space-y-1">
                                    <p className="text-xs font-semibold text-slate-900">Expected Revenue:</p>
                                    <p className="text-xs text-slate-600">₹ {((opportunity.amount || 0) * (opportunity.probability || 0) / 100).toLocaleString()}</p>
                                </div>
                                <div className="bg-white p-3 space-y-1 col-span-2">
                                    <p className="text-xs font-semibold text-slate-900">Close Date:</p>
                                    <p className="text-xs text-slate-600">{opportunity.close_date ? format(new Date(opportunity.close_date), "dd MMM yyyy") : "-"}</p>
                                </div>
                                <div className="bg-white p-3 space-y-1 col-span-2">
                                    <p className="text-xs font-semibold text-slate-900">Last Modified By:</p>
                                    <p className="text-xs text-slate-600">{opportunity.owner_name}</p>
                                </div>
                                <div className="bg-white p-3 space-y-1 col-span-2">
                                    <p className="text-xs font-semibold text-slate-900">Last Modified:</p>
                                    <p className="text-xs text-slate-600">{format(new Date(opportunity.updated_at), "dd MMM yyyy | hh:mm a")}</p>
                                </div>
                            </div>

                            {/* Historical Records */}
                            {history.filter(h => h.field_name === "sales_stage_id").map((record, i) => (
                                <div key={record.id} className="grid grid-cols-2 gap-px bg-slate-100 border-b last:border-0 border-t-8 border-t-slate-100">
                                    <div className="bg-white p-3 space-y-1">
                                        <p className="text-xs font-semibold text-slate-900">Stage:</p>
                                        <p className="text-xs text-slate-600">{record.new_stage_name || record.new_value}</p>
                                    </div>
                                    <div className="bg-white p-3 space-y-1">
                                        <p className="text-xs font-semibold text-slate-900">Amount:</p>
                                        <p className="text-xs text-slate-600">₹ {opportunity.amount?.toLocaleString() || "0"}</p>
                                    </div>
                                    <div className="bg-white p-3 space-y-1">
                                        <p className="text-xs font-semibold text-slate-900">Probability (%):</p>
                                        <p className="text-xs text-slate-600">-</p>
                                    </div>
                                    <div className="bg-white p-3 space-y-1">
                                        <p className="text-xs font-semibold text-slate-900">Expected Revenue:</p>
                                        <p className="text-xs text-slate-600">-</p>
                                    </div>
                                    <div className="bg-white p-3 space-y-1 col-span-2">
                                        <p className="text-xs font-semibold text-slate-900">Close Date:</p>
                                        <p className="text-xs text-slate-600">{opportunity.close_date ? format(new Date(opportunity.close_date), "dd MMM yyyy") : "-"}</p>
                                    </div>
                                    <div className="bg-white p-3 space-y-1 col-span-2">
                                        <p className="text-xs font-semibold text-slate-900">Last Modified By:</p>
                                        <p className="text-xs text-slate-600">{record.user_name}</p>
                                    </div>
                                    <div className="bg-white p-3 space-y-1 col-span-2">
                                        <p className="text-xs font-semibold text-slate-900">Last Modified:</p>
                                        <p className="text-xs text-slate-600">{format(new Date(record.changed_at), "dd MMM yyyy | hh:mm a")}</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
