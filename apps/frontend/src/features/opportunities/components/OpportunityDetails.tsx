"use client";

import { useState, useEffect } from "react";
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
    Lock,
    Target,
    Map,
    MessageSquare,
    PhoneCall,
    Trash2,
    RefreshCw,
    Paperclip,
    Users,
    Package,
    Receipt,
    Copy,
    Check
} from "lucide-react";
import Link from "next/link";
import { copyToClipboard } from "@/lib/clipboard";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { CollapsibleDetailSection } from "@/components/shared/CollapsibleDetailSection";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Opportunity } from "../types";
import { formatDateLong, formatDateTime24h, formatDateTimeBar } from "@/lib/format";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { UpdateStageDialog } from "./UpdateStageDialog";
import { FinancialTab } from "./financial/FinancialTab";
import { OpportunityItinerariesTab } from "@/features/itineraries/components/OpportunityItinerariesTab";
import { SalesStage } from "@/lib/api/services/opportunities.service";
import { useSession } from "next-auth/react";
import {
    useOpportunity,
    useOpportunityHistory,
    useOpportunityTasks,
    useCreateOpportunityTask,
    useUpdateOpportunityStage,
    useDeleteOpportunity,
    useChangeOpportunityOwner,
    useUnlockOpportunity,
    useLockOpportunity,
    useUpdateOpportunity,
} from "../api/useOpportunities";
import { ChangeOwnerDialog } from "@/components/shared/ChangeOwnerDialog";
import { useGetUsers } from "@/features/admin/api/use-users";
import { FileUploader } from "@/features/files/components/file-uploader";
import { FileList } from "@/features/files/components/file-list";
import { OpportunityFormDrawer } from "./OpportunityFormDrawer";
import { VisitsByParentSection } from "@/features/bd/visits/components/VisitsByParentSection";
import { accountService } from "@/features/accounts/services/accountService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { opportunitiesService } from "@/lib/api/services/opportunities.service";
import { suppliersService } from "@/lib/api/services/suppliers.service";
import { templatesService, Template } from "@/lib/api/services/templates.service";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { EmailEditor } from "@/components/shared/EmailEditor";
import { Input } from "@/components/ui/input";
import { useIndustry } from "@/lib/industry-labels";
import { getSegmentBadgeClass, getSegmentLabel } from "@/lib/segments";

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
    const industry = useIndustry();
    const { data: session } = useSession();
    const sessionPermissions: string[] = (session?.user as any)?.permissions ?? [];
    const canUnlock = sessionPermissions.includes("unlock_opportunity");
    const [isCloseLostDialogOpen, setIsCloseLostDialogOpen] = useState(false);
    const [pendingCloseLostStageId, setPendingCloseLostStageId] = useState<string>("");
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isOwnerDialogOpen, setIsOwnerDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const { data: reactiveOpportunity } = useOpportunity(opportunity.id);
    // Use reactive data if available, fallback to initial prop
    const record = reactiveOpportunity || opportunity;

    const [selectedStageId, setSelectedStageId] = useState<string>(record.sales_stage_id);

    // Sync selectedStageId when record.sales_stage_id changes (e.g. after update)
    useEffect(() => {
        if (record.sales_stage_id) {
            setSelectedStageId(record.sales_stage_id);
        }
    }, [record.sales_stage_id]);


    const stage = stages.find(s => s.id === record.sales_stage_id);

    // Sort stages strictly by sorting number to represent pipeline order
    const orderedStages = [...stages].sort((a, b) => (a.sorting || 0) - (b.sorting || 0));
    const currentStageIndex = orderedStages.findIndex(s => s.id === record.sales_stage_id);

    const { data: history = [] } = useOpportunityHistory(record.id);
    const { data: tasks = [] } = useOpportunityTasks(record.id);
    const { mutate: updateStage } = useUpdateOpportunityStage();
    const { mutate: changeOwner } = useChangeOpportunityOwner();
    const { mutate: lockOpportunity, isPending: isLocking } = useLockOpportunity();
    const { mutate: unlockOpportunity, isPending: isUnlocking } = useUnlockOpportunity();
    const { mutate: updateOpportunity } = useUpdateOpportunity();

    // Toggle a boolean flag (key_deal / verified_by_account) inline from the view.
    const handleToggleFlag = (field: "key_deal" | "verified_by_account", value: boolean) => {
        if (record.is_locked) return;
        updateOpportunity(
            { id: record.id, data: { [field]: value } },
            {
                onSuccess: () => {
                    toast.success(
                        field === "key_deal"
                            ? `Key Deal ${value ? "marked" : "unmarked"}`
                            : `Verified by Account ${value ? "enabled" : "disabled"}`
                    );
                },
                onError: () => toast.error("Failed to update opportunity"),
            }
        );
    };

    // Supplier & Email Template state
    const [suppliers, setSuppliers] = useState<{ label: string; value: string }[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
    const [emailSubject, setEmailSubject] = useState<string>("");
    const [emailBody, setEmailBody] = useState<string>("");
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Inline Task Form State
    const { data: usersData } = useGetUsers();
    const users = (usersData as any)?.users || usersData?.data || [];
    const { mutate: createOpportunityTask, isPending: isCreatingTask } = useCreateOpportunityTask(record.id);
    
    const [taskSubject, setTaskSubject] = useState("");
    const [taskAssignedTo, setTaskAssignedTo] = useState(record.owner_id || "");
    const [taskDueDate, setTaskDueDate] = useState("");
    const [taskAddReminder, setTaskAddReminder] = useState(false);

    const handleCreateTask = () => {
        if (!taskSubject.trim()) {
            toast.error("Subject is required");
            return;
        }
        createOpportunityTask(
            {
                name: taskSubject,
                due_date: taskDueDate ? new Date(taskDueDate).toISOString() : undefined,
                assigned_user_id: taskAssignedTo || record.owner_id,
            },
            {
                onSuccess: () => {
                    toast.success("Task created successfully");
                    setTaskSubject("");
                    setTaskDueDate("");
                    setTaskAddReminder(false);
                },
                onError: () => {
                    toast.error("Failed to create task");
                }
            }
        );
    };

    useEffect(() => {
        const fetchData = async () => {
            setIsLoadingData(true);
            try {
                const [suppliersRes, templatesRes, linkedSuppliersRes] = await Promise.all([
                    suppliersService.getSuppliers({}),
                    templatesService.getTemplates({ type: "email" }),
                    suppliersService.getOpportunitySuppliers(opportunity.id)
                ]);
                
                setSuppliers(suppliersRes.suppliers.map(s => ({ 
                    label: s.name, 
                    value: s.id 
                })));
                setTemplates(templatesRes.templates);

                // Set linked supplier if exists
                if (linkedSuppliersRes.suppliers && linkedSuppliersRes.suppliers.length > 0) {
                    const firstLinked = linkedSuppliersRes.suppliers[0];
                    setSelectedSupplierId(firstLinked.supplier.id);
                    setEmailSubject(firstLinked.email_subject || "");
                    setEmailBody(firstLinked.email_body || "");
                }
            } catch (error: unknown) {
                console.error("Failed to fetch supplier data:", error);
            } finally {
                setIsLoadingData(false);
            }
        };
        fetchData();
    }, []);

    const handleTemplateChange = (templateId: string) => {
        setSelectedTemplateId(templateId);
        const template = templates.find(t => t.id === templateId);
        if (template) {
            setEmailSubject(template.subject || "");
            setEmailBody(template.body || "");
        }
    };

    const handleSaveEmail = async () => {
        if (!selectedSupplierId) {
            toast.error("Please select a supplier");
            return;
        }

        try {
            await suppliersService.linkToOpportunity(opportunity.id, {
                supplierId: selectedSupplierId,
                emailSubject: emailSubject,
                emailBody: emailBody
            });
            toast.success("Supplier details saved successfully");
        } catch (error: unknown) {
            console.error("Failed to save supplier details:", error);
            toast.error("Failed to save supplier details");
        }
    };

    // removed local changeOwnerMutation as we use useChangeOpportunityOwner hook now

    const handleStageClick = (targetStageId: string) => {
        const targetStage = orderedStages.find(s => s.id === targetStageId);
        const isLostStage = !!(targetStage as any)?.is_lost;

        if (isLostStage) {
            // Always show the Close Lost reason dialog when clicking a lost stage
            setPendingCloseLostStageId(targetStageId);
            setIsCloseLostDialogOpen(true);
            return;
        }

        setSelectedStageId(targetStageId);
    };

    const handleMarkAsCurrentStage = () => {
        if (!selectedStageId || selectedStageId === record.sales_stage_id) return;

        const targetStage = orderedStages.find(s => s.id === selectedStageId);
        const isLostStage = !!(targetStage as any)?.is_lost;

        if (isLostStage) {
            // Show Close Lost reason dialog instead of updating directly
            setPendingCloseLostStageId(selectedStageId);
            setIsCloseLostDialogOpen(true);
            return;
        }

        updateStage({ id: record.id, stageId: selectedStageId });
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await opportunitiesService.deleteOpportunity(record.id);
            toast.success("Opportunity deleted successfully");
            router.push("/opportunities");
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Failed to delete opportunity");
            setIsDeleting(false);
            setIsDeleteOpen(false);
        }
    };

    return (
        <div className="mx-auto max-w-[1400px] space-y-6 [&_.bg-white]:!bg-card [&_.bg-slate-50]:!bg-muted [&_.bg-slate-100]:!bg-muted [&_.border-slate-100]:!border-border [&_.border-slate-200]:!border-border [&_.border-slate-300]:!border-border [&_.text-slate-900]:!text-foreground [&_.text-slate-800]:!text-foreground [&_.text-slate-700]:!text-foreground [&_.text-slate-600]:!text-foreground [&_.text-slate-500]:!text-muted-foreground [&_.text-slate-400]:!text-muted-foreground [&_.text-slate-300]:!text-muted-foreground">
            <UpdateStageDialog
                opportunityId={record.id}
                currentStageId={record.sales_stage_id}
                stages={stages}
                isOpen={isCloseLostDialogOpen}
                targetStageId={pendingCloseLostStageId}
                currentReason={record.close_lost_reason}
                onClose={() => {
                    setIsCloseLostDialogOpen(false);
                    setPendingCloseLostStageId("");
                }}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Opportunity?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{record.name}</strong>? This action cannot be undone and will remove all associated data.
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
                onConfirm={(newOwnerId, newOwnerName) => {
                    changeOwner({ id: record.id, newOwnerId, newOwnerName });
                    setIsOwnerDialogOpen(false);
                }}
                type="Opportunity"
                currentOwnerId={record.owner_id}
            />

            {/* Header / Actions - Styled like reference UI */}
            <div className="crm-surface rounded-lg border p-4 shadow-sm">
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                    <div className="flex gap-4">
                        <div className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                            <Briefcase className="h-6 w-6 text-white" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-semibold text-blue-600">
                                    Opportunity <span className="text-muted-foreground font-normal">({record.is_person_account ? "Person Account" : "Account"})</span>
                                </h1>
                                {record.creation_type && (
                                    <Badge variant="secondary" className="bg-orange-500/20 text-orange-300 font-normal">
                                        {record.creation_type}
                                    </Badge>
                                )}
                                {record.is_locked ? (
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1 font-normal">
                                            <Lock className="h-3 w-3" /> Locked
                                        </Badge>
                                        {canUnlock && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-6 px-2 text-xs border-red-500/40 text-red-300 hover:bg-red-500/20 hover:text-red-200"
                                                onClick={() => unlockOpportunity(record.id)}
                                                disabled={isUnlocking}
                                                title="Unlock this opportunity"
                                            >
                                                {isUnlocking ? "Unlocking..." : "Unlock"}
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 px-2 text-xs border-slate-500/40 text-slate-400 hover:bg-slate-500/20 hover:text-slate-200 flex items-center gap-1"
                                        onClick={() => lockOpportunity(record.id)}
                                        disabled={isLocking}
                                        title="Lock this opportunity"
                                    >
                                        <Lock className="h-3 w-3" />
                                        {isLocking ? "Locking..." : "Lock"}
                                    </Button>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-medium">{record.name}</h2>
                                {record.opportunity_number != null && (
                                    <div className="flex items-center gap-1 text-slate-400">
                                        <span className="text-sm font-mono">
                                            / {String(record.opportunity_number).padStart(10, '0')}
                                        </span>
                                        <button
                                            type="button"
                                            title="Copy opportunity ID"
                                            onClick={() => {
                                                copyToClipboard(String(record.opportunity_number).padStart(10, '0'), "Opportunity ID");
                                                setIsCopied(true);
                                                setTimeout(() => setIsCopied(false), 1500);
                                            }}
                                            className="p-0.5 rounded hover:text-slate-200 transition-colors"
                                        >
                                            {isCopied
                                                ? <Check className="h-3 w-3 text-green-400" />
                                                : <Copy className="h-3 w-3" />
                                            }
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-300 pt-1">
                                <div className="space-y-1">
                                    {!record.is_person_account && record.account_name && (
                                        <div className="mb-2">
                                            <Link href={`/accounts/${record.account_id}`} className="font-medium text-blue-500 hover:underline cursor-pointer">
                                                {record.account_name}
                                            </Link>
                                        </div>
                                    )}
                                    <p className="text-xs text-slate-400">Name</p>
                                    {record.is_person_account ? (
                                        <p className="font-medium text-blue-500 hover:underline cursor-pointer mt-0.5">
                                            <Link href={`/person-accounts/${record.account_id}`}>
                                                {record.contact_name || record.account_name || "-"}
                                            </Link>
                                        </p>
                                    ) : (
                                        <div className="flex flex-col items-start leading-tight mt-0.5">
                                            {record.contact_name ? (
                                                <Link
                                                    href={record.contact_id ? `/contacts/${record.contact_id}` : "#"}
                                                    className="font-medium text-blue-500 hover:underline cursor-pointer"
                                                >
                                                    {record.contact_name}
                                                </Link>
                                            ) : (
                                                <span className="font-medium text-slate-200">-</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-slate-400">Email | Mobile</p>
                                    <p className="font-medium text-blue-500 text-xs">
                                        {record.contact_email || "-"} | {record.contact_phone || "-"}
                                    </p>
                                </div>
                                {industry === "travel" ? (
                                    <div className="space-y-1">
                                        <p className="text-xs text-slate-400">Travel Date | No of Pax</p>
                                        <p className="font-medium text-slate-200">
                                            {record.industry_data?.travel_date
                                                ? formatDate(record.industry_data.travel_date)
                                                : "-"} | {record.industry_data?.no_of_pax || "-"}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <p className="text-xs text-slate-400">Close Date | Amount</p>
                                        <p className="font-medium text-slate-200">
                                            {record.close_date
                                                ? formatDate(record.close_date)
                                                : "-"} | {record.amount ? formatCurrency(record.amount) : "-"}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end justify-between min-w-[250px]">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className={cn("flex items-center justify-end gap-2 text-xs font-medium text-slate-300", record.is_locked ? "cursor-not-allowed opacity-60" : "cursor-pointer")}>
                                    Key Deal
                                    <Checkbox
                                        checked={!!record.key_deal}
                                        disabled={record.is_locked}
                                        onCheckedChange={(v) => handleToggleFlag("key_deal", v === true)}
                                    />
                                </label>
                                <label className={cn("flex items-center justify-end gap-2 text-xs font-medium text-slate-300", record.is_locked ? "cursor-not-allowed opacity-60" : "cursor-pointer")}>
                                    Verified by Account
                                    <Checkbox
                                        checked={!!record.verified_by_account}
                                        disabled={record.is_locked}
                                        onCheckedChange={(v) => handleToggleFlag("verified_by_account", v === true)}
                                    />
                                </label>
                            </div>
                            <Button
                                className="bg-blue-500 hover:bg-blue-600 h-8 disabled:opacity-50 disabled:cursor-not-allowed"
                                size="sm"
                                onClick={() => !record.is_locked && setIsEditDrawerOpen(true)}
                                disabled={record.is_locked}
                                title={record.is_locked ? "Opportunity is locked" : undefined}
                            >
                                {record.is_locked ? <><Lock className="h-3 w-3 mr-1" />Locked</> : "Edit"}
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
                                <span className="text-slate-400">Opportunity Owner</span>
                                <button
                                    onClick={() => setIsOwnerDialogOpen(true)}
                                    className="font-medium text-blue-500 flex items-center gap-1 hover:text-blue-300 transition-colors"
                                >
                                    {record.owner_name} <UserIcon className="h-3 w-3" />
                                </button>
                            </div>
                            <div className="flex justify-between border-b pb-1">
                                <span className="text-slate-400">Operation Owner</span>
                                <span className="font-medium">{record.operation_user_name || "-"}</span>
                            </div>
                            <div className="flex justify-between border-b pb-1">
                                <span className="text-slate-400">BD Owner</span>
                                <span className="font-medium text-blue-500">
                                    {record.bd_owner_name || (record.bd_owner_id ? "(unknown)" : "Unassigned")}
                                </span>
                            </div>
                            <div className="flex justify-between border-b pb-1">
                                <span className="text-slate-400">Territory</span>
                                <span className="font-medium">
                                    {record.territory_name || (record.territory_id ? "(unresolved)" : "Unassigned")}
                                    {record.territory_match_source && (
                                        <span className="ml-1 text-[10px] text-slate-500">
                                            via {record.territory_match_source}
                                        </span>
                                    )}
                                </span>
                            </div>
                            <div className="flex justify-between pb-1">
                                <span className="text-slate-400">Reporting Manager</span>
                                <span className="font-medium text-blue-500">
                                    {record.reporting_manager_name || (record.reporting_manager_id ? "(unknown)" : "—")}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sales Stage Stepper */}
            <div className="crm-surface rounded-lg border p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold">Sales stages</h3>
                    {record.is_locked && (
                        <span className="flex items-center gap-1 text-xs text-red-400">
                            <Lock className="h-3 w-3" /> Stage changes are locked
                        </span>
                    )}
                </div>
                <div className="flex items-center justify-between">
                    <div className={cn("flex flex-1 items-center relative z-10", record.is_locked && "opacity-60 pointer-events-none")}>
                        {orderedStages.map((s, index) => {
                            const isCurrent = index === currentStageIndex;
                            const isPast = index < currentStageIndex;

                            return (
                                <div
                                    key={s.id}
                                    onClick={() => !record.is_locked && handleStageClick(s.id)}
                                    className={cn(
                                        "relative flex-1 py-2 px-4 text-center text-xs font-medium transition-colors border-y border-r first:border-l first:rounded-l-full last:rounded-r-full group",
                                        record.is_locked ? "cursor-not-allowed" : "cursor-pointer",
                                        s.id === selectedStageId ? "bg-blue-500/15 border-blue-400 text-blue-300" :
                                            index < currentStageIndex ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700" :
                                                "bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800/40"
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
                    {!record.is_locked && selectedStageId !== record.sales_stage_id && (
                        <Button
                            className="ml-4 bg-blue-500 hover:bg-blue-600 rounded-full text-xs h-8 px-6 whitespace-nowrap"
                            onClick={handleMarkAsCurrentStage}
                        >
                            Mark as Current Stage
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">

                {/* Main Content Area - Tabs */}
                <div className="lg:col-span-2 min-w-0 w-full">
                    <Tabs defaultValue="activity" className="w-full rounded-lg border bg-card shadow-sm">
                        <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 max-w-full overflow-x-auto flex-nowrap scrollbar-hide">
                            <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 px-6 py-3 font-medium text-sm">Activity</TabsTrigger>
                            {industry === "travel" && <TabsTrigger value="departures" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 px-6 py-3 font-medium text-sm">Departures</TabsTrigger>}
                            <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 px-6 py-3 font-medium text-sm">Details</TabsTrigger>
                            {industry === "travel" && <TabsTrigger value="itineraries" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 px-6 py-3 font-medium text-sm">Itineraries</TabsTrigger>}
                            <TabsTrigger value="financial" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 px-6 py-3 font-medium text-sm">Financial</TabsTrigger>
                            <TabsTrigger value="supplier" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 px-6 py-3 font-medium text-sm">{industry === "travel" ? "Supplier" : "Vendor"}</TabsTrigger>
                            <TabsTrigger value="attachments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 px-6 py-3 font-medium text-sm">Attachments</TabsTrigger>
                            <span className="flex items-center px-4 py-3">
                                <button
                                    onClick={() => !record.is_locked && setIsEditDrawerOpen(true)}
                                    disabled={record.is_locked}
                                    className={cn("text-sm font-medium flex items-center gap-1", record.is_locked ? "text-slate-600 cursor-not-allowed" : "text-slate-400 hover:text-blue-600")}
                                    title={record.is_locked ? "Opportunity is locked" : undefined}
                                >
                                    {record.is_locked ? <><Lock className="h-3.5 w-3.5" /> Locked</> : <><Edit className="h-3.5 w-3.5" /> Edit</>}
                                </button>
                            </span>
                        </TabsList>

                        {/* ── ACTIVITY TAB ── */}
                        <TabsContent value="activity" className="p-6 focus-visible:outline-none focus-visible:ring-0">
                            <div className="flex gap-4 border-b pb-4 mb-4">
                                <Button className="bg-blue-600 hover:bg-blue-700 h-8 text-xs font-semibold rounded-sm">Task</Button>
                                <Button variant="ghost" className="h-8 text-xs font-semibold text-slate-400 hover:text-slate-100"><PhoneCall className="h-3 w-3 mr-2" /> Log a Call</Button>
                                <Button variant="ghost" className="h-8 text-xs font-semibold text-slate-400 hover:text-slate-100"><Mail className="h-3 w-3 mr-2" /> Email</Button>
                                <Button variant="ghost" className="h-8 text-xs font-semibold text-slate-400 hover:text-slate-100"><MessageSquare className="h-3 w-3 mr-2" /> Whatsapp</Button>
                            </div>

                            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs text-slate-400 font-medium">Subject</label>
                                    <input 
                                        type="text" 
                                        value={taskSubject}
                                        onChange={(e) => setTaskSubject(e.target.value)}
                                        className="w-full border rounded text-sm px-3 py-1.5 focus:outline-none focus:border-blue-500" 
                                        placeholder="e.g. Follow up with client"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-slate-400 font-medium">Assigned To</label>
                                    <select
                                        value={taskAssignedTo}
                                        onChange={(e) => setTaskAssignedTo(e.target.value)}
                                        className="w-full border rounded text-sm px-3 py-1.5 focus:outline-none focus:border-blue-500 bg-slate-900"
                                    >
                                        {users.map((user: any) => (
                                            <option key={user.id || user._id} value={user.id || user._id}>
                                                {user.name}
                                            </option>
                                        ))}
                                        {!users.length && <option value={record.owner_id}>{record.owner_name}</option>}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-slate-400 font-medium">Select Due Date</label>
                                    <input
                                        type="datetime-local"
                                        value={taskDueDate}
                                        onChange={(e) => setTaskDueDate(e.target.value)}
                                        className="w-full border rounded text-sm px-3 py-1.5 focus:outline-none focus:border-blue-500 text-slate-300"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-slate-400 font-medium">Name</label>
                                    <div className="w-full border rounded text-sm px-3 py-1.5 bg-slate-800 text-blue-400 hover:underline cursor-pointer font-medium">
                                        <Link href={record.is_person_account ? `/person-accounts/${record.account_id}` : `/accounts/${record.account_id}`}>
                                            {record.contact_name || record.account_name || ""}
                                        </Link>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-slate-400 font-medium">Related to</label>
                                    <p className="text-sm text-slate-200 pt-1.5">{record.name}</p>
                                </div>
                                <div className="space-y-1.5 mt-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={taskAddReminder}
                                            onChange={(e) => setTaskAddReminder(e.target.checked)}
                                            className="rounded border-slate-700"
                                        />
                                        <span className="text-xs text-slate-300 font-medium">Add Reminder</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end border-b pb-6 mb-6">
                                <Button 
                                    className="bg-blue-500 hover:bg-blue-600 px-8"
                                    onClick={handleCreateTask}
                                    disabled={isCreatingTask}
                                >
                                    {isCreatingTask ? "Saving..." : "Save"}
                                </Button>
                            </div>

                            {/* Task List */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 text-sm font-semibold text-slate-200">
                                    <span className="w-24">Next Task</span>
                                    <div className="flex-1 border-b border-dashed border-slate-700"></div>
                                </div>
                                <ul className="space-y-2">
                                    {tasks.filter(t => t.status !== "Completed").length === 0 ? (
                                        <li className="text-sm text-slate-400 italic py-2 pl-28">No open tasks</li>
                                    ) : (
                                        tasks.filter(t => t.status !== "Completed").map(task => (
                                            <li key={task.id} className="flex items-center gap-3 pl-28 py-1 group">
                                                <div className="h-5 w-5 rounded border border-slate-700 flex items-center justify-center cursor-pointer hover:border-blue-500">
                                                    <CheckCircle2 className="h-3 w-3 text-transparent group-hover:text-blue-200" />
                                                </div>
                                                <a href="#" className="text-sm text-blue-400 hover:underline">{task.name}</a>
                                                {task.due_date && <span className="text-xs text-slate-400">({formatDateTime24h(task.due_date)})</span>}
                                                {task.priority === "High" && <Badge variant="secondary" className="bg-red-500/20 text-red-300 px-1.5 py-0 text-[10px] h-4">high</Badge>}
                                            </li>
                                        ))
                                    )}
                                </ul>

                                <div className="flex items-center gap-4 text-sm font-semibold text-slate-200 mt-8">
                                    <span className="w-24">Previous Task</span>
                                    <div className="flex-1 border-b border-dashed border-slate-700"></div>
                                </div>
                                <ul className="space-y-2">
                                    {tasks.filter(t => t.status === "Completed").map(task => (
                                        <li key={task.id} className="flex items-center gap-3 pl-28 py-1">
                                            <div className="h-5 w-5 rounded bg-blue-500/20 text-blue-300 flex items-center justify-center">
                                                <CheckCircle2 className="h-3 w-3" />
                                            </div>
                                            <span className="text-sm text-slate-400 line-through">{task.name}</span>
                                            {task.completed_at && <span className="text-xs text-slate-400">({formatDateLong(task.completed_at)})</span>}
                                        </li>
                                    ))}
                                </ul>

                                <div className="flex items-center gap-4 text-sm font-semibold text-slate-200 mt-8">
                                    <span className="w-24 border border-orange-500/40 bg-orange-500/20 text-orange-300 px-2 rounded-sm inline-flex justify-between items-center h-6">
                                        Email <RefreshCw className="h-3 w-3" />
                                    </span>
                                    <div className="flex-1 border-b border-dashed border-slate-700"></div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* ── DEPARTURES TAB ── */}
                        <TabsContent value="departures" className="p-6 focus-visible:outline-none focus-visible:ring-0">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-blue-500" />
                                    Departures
                                </h3>
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-8 text-xs">
                                    + Add Departure
                                </Button>
                            </div>
                            <div className="crm-empty-state">
                                <Calendar className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                                <p className="font-medium text-foreground">No departures added</p>
                                <p className="mt-1 text-sm text-muted-foreground">Add departure dates and details for this record.</p>
                            </div>
                        </TabsContent>

                        {/* ── DETAILS TAB ── */}
                        <TabsContent value="details" className="p-6">
                                <div className="space-y-6">
                                    <CollapsibleDetailSection
                                        title="Opportunity Information"
                                        icon={<Briefcase className="h-4 w-4" />}
                                        defaultOpen={true}
                                        className="border-slate-700"
                                    >
                                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-4">
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Opportunity Name</p>
                                                <p className="text-sm font-bold text-slate-100 pt-1">{record.name}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account</p>
                                                <p className="text-sm font-semibold text-slate-100 pt-1">{record.account_name || record.contact_name || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Opportunity Owner</p>
                                                <p className="text-sm font-semibold text-slate-100 pt-1">{record.owner_name || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stage</p>
                                                <p className="text-sm font-semibold text-slate-100 pt-1">
                                                    {record.sales_stage_name || stages.find(s => s.id === record.sales_stage_id)?.name || "-"}
                                                </p>
                                            </div>
                                            {record.close_lost_reason && (stage as any)?.is_lost && (
                                                <div className="space-y-1 col-span-full bg-red-500/20 p-2 rounded border border-red-500/40">
                                                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Close Lost Reason</p>
                                                    <p className="text-sm text-red-300 pt-1 italic">
                                                        "{record.close_lost_reason}"
                                                    </p>
                                                </div>
                                            )}
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</p>
                                                <p className="text-lg font-bold text-slate-100">
                                                    {record.amount ? formatCurrency(record.amount) : formatCurrency(0)}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Probability</p>
                                                <div className="flex items-center gap-3 pt-1">
                                                    <span className="text-base font-semibold">{record.probability || 0}%</span>
                                                    <div className="flex-1 max-w-[100px] h-2 bg-slate-800 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${record.probability || 0}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Expected Revenue</p>
                                                <p className="text-lg font-bold text-emerald-400">
                                                    {formatCurrency(((record.amount || 0) * (record.probability || 0)) / 100)}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Segment</p>
                                                <Badge variant="secondary" className={cn("uppercase font-bold mt-1", getSegmentBadgeClass(record.segment))}>
                                                    {getSegmentLabel(record.segment)}
                                                </Badge>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Expected Close Date</p>
                                                <span className="text-sm font-medium pt-1 block">
                                                    {record.close_date ? formatDateLong(record.close_date) : "Not Set"}
                                                </span>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Opportunity Source</p>
                                                <span className="text-sm font-medium pt-1 block text-blue-400 cursor-pointer hover:underline">
                                                    {record.source_name || "-"}
                                                </span>
                                            </div>

                                            {/* ── Industry-Specific Fields ── */}
                                            {industry === "travel" && (
                                                <>
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Experience</p>
                                                        <span className="text-sm font-medium pt-1 block text-slate-200">
                                                            {record.experience_name || "-"}
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Date of Travel</p>
                                                        <span className="text-sm font-medium pt-1 block">
                                                            {record.industry_data?.travel_date ? formatDateLong(record.industry_data.travel_date) : "Not Set"}
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">No. of Pax</p>
                                                        <p className="text-sm font-semibold pt-1">{record.industry_data?.no_of_pax || "-"}</p>
                                                    </div>
                                                    {(record.industry_data?.no_of_nights ?? 0) > 0 && (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">No. of Nights</p>
                                                            <p className="text-sm font-semibold pt-1">{record.industry_data?.no_of_nights}</p>
                                                        </div>
                                                    )}
                                                    <div className="space-y-2 col-span-full mt-4">
                                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Destinations</p>
                                                        <div className="flex flex-wrap gap-2 pt-1">
                                                            {record.industry_data?.destination_names && record.industry_data.destination_names.length > 0 ? (
                                                                record.industry_data.destination_names.map((dest: string, i: number) => (
                                                                    <Badge key={i} variant="outline" className="bg-slate-800 px-3 py-1 font-medium border-slate-700">
                                                                        <MapPin className="h-3 w-3 mr-1.5 text-blue-500" />
                                                                        {dest}
                                                                    </Badge>
                                                                ))
                                                            ) : (
                                                                <p className="text-sm text-slate-400">No destinations specified</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2 col-span-full mt-2">
                                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Inclusions</p>
                                                        <div className="flex flex-wrap gap-2 pt-1">
                                                            {record.industry_data?.inclusions && record.industry_data.inclusions.length > 0 ? (
                                                                record.industry_data.inclusions.map((inclusion: string, i: number) => (
                                                                    <Badge key={i} variant="secondary" className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border-emerald-500/40 px-3 py-1 font-medium">
                                                                        <CheckCircle2 className="h-3 w-3 mr-1.5 text-emerald-600" />
                                                                        {inclusion}
                                                                    </Badge>
                                                                ))
                                                            ) : (
                                                                <p className="text-sm text-slate-400">No inclusions specified</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                            {industry === "healthcare" && (
                                                <>
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Treatment Type</p>
                                                        <p className="text-sm font-semibold pt-1">{(record as any).industry_data?.treatment_type || "-"}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Appointment Date</p>
                                                        <p className="text-sm font-semibold pt-1">{(record as any).industry_data?.appointment_date ? formatDateLong((record as any).industry_data.appointment_date) : "Not Set"}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Insurance Pre-Auth</p>
                                                        <p className="text-sm font-semibold pt-1">{(record as any).industry_data?.insurance_preauth || "-"}</p>
                                                    </div>
                                                </>
                                            )}
                                            {industry === "education" && (
                                                <>
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Program / Course</p>
                                                        <p className="text-sm font-semibold pt-1">{(record as any).industry_data?.program || "-"}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Admission Status</p>
                                                        <p className="text-sm font-semibold pt-1 capitalize">{(record as any).industry_data?.admission_status || "-"}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Interview Date</p>
                                                        <p className="text-sm font-semibold pt-1">{(record as any).industry_data?.interview_date ? formatDateLong((record as any).industry_data.interview_date) : "Not Set"}</p>
                                                    </div>
                                                </>
                                            )}
                                            {industry === "manufacturing" && (
                                                <>
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Product / SKU</p>
                                                        <p className="text-sm font-semibold pt-1">{(record as any).industry_data?.product_category || "-"}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quantity / UOM</p>
                                                        <p className="text-sm font-semibold pt-1">{(record as any).industry_data?.quantity || "-"} {(record as any).industry_data?.uom || ""}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Delivery Date</p>
                                                        <p className="text-sm font-semibold pt-1">{(record as any).industry_data?.delivery_date ? formatDateLong((record as any).industry_data.delivery_date) : "Not Set"}</p>
                                                    </div>
                                                </>
                                            )}
                                            <div className="space-y-1 col-span-full mt-2">
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</p>
                                                <p className="text-sm text-slate-200 pt-1 whitespace-pre-wrap">
                                                    {record.description || "-"}
                                                </p>
                                            </div>
                                        </div>
                                    </CollapsibleDetailSection>

                                    {/* BD Visits linked to this opportunity */}
                                    <div className="rounded-lg border border-slate-700 p-3">
                                        <VisitsByParentSection
                                            parentType="Opportunity"
                                            parentId={record.id}
                                            parentName={record.name}
                                        />
                                    </div>

                                    <CollapsibleDetailSection
                                        title="System Information"
                                        icon={<UserIcon className="h-4 w-4" />}
                                        defaultOpen={false}
                                        className="border-slate-700"
                                    >
                                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-4">
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Created By</p>
                                                <div className="flex items-center gap-2 pt-1">
                                                    <p className="text-sm font-medium text-blue-400 cursor-pointer hover:underline">{record.created_by_name || "Unknown"}</p>
                                                    <span className="text-slate-400 text-[10px]">{formatDateTime24h(record.created_at)}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Modified By</p>
                                                <div className="flex items-center gap-2 pt-1">
                                                    <p className="text-sm font-medium text-blue-400 cursor-pointer hover:underline">{record.last_modified_by_name || record.created_by_name || "Unknown"}</p>
                                                    <span className="text-slate-400 text-[10px]">{formatDateTime24h(record.updated_at)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CollapsibleDetailSection>
                                </div>
                        </TabsContent>

                        {/* ── ITINERARIES TAB ── */}
                        <TabsContent value="itineraries" className="p-6 focus-visible:outline-none focus-visible:ring-0">
                            <OpportunityItinerariesTab opportunityId={record.id} />
                        </TabsContent>

                        {/* ── FINANCIAL TAB ── */}
                        <TabsContent value="financial" className="overflow-hidden rounded-b-xl bg-card p-0 focus-visible:outline-none focus-visible:ring-0">
                            <FinancialTab opportunity={record} />
                        </TabsContent>

                        {/* ── SUPPLIER TAB ── */}
                        <TabsContent value="supplier" className="p-6 focus-visible:outline-none focus-visible:ring-0">
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-200">Supplier</label>
                                        <SearchableSelect
                                            options={suppliers}
                                            value={selectedSupplierId}
                                            onValueChange={setSelectedSupplierId}
                                            placeholder="Select Supplier"
                                            searchPlaceholder="Search suppliers..."
                                            isLoading={isLoadingData}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-200">Email Template</label>
                                        <SearchableSelect
                                            options={templates.map(t => ({ label: t.name, value: t.id }))}
                                            value={selectedTemplateId}
                                            onValueChange={handleTemplateChange}
                                            placeholder="Select Template"
                                            searchPlaceholder="Search templates..."
                                            isLoading={isLoadingData}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-200">Subject</label>
                                        <Input
                                            value={emailSubject}
                                            onChange={(e) => setEmailSubject(e.target.value)}
                                            placeholder="Enter Subject..."
                                            className="h-10"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <EmailEditor
                                            value={emailBody}
                                            onChange={setEmailBody}
                                            placeholder="Enter text here.."
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button 
                                        onClick={handleSaveEmail}
                                        className="bg-blue-600 hover:bg-blue-700 px-8"
                                    >
                                        Save
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>

                        {/* ── ATTACHMENTS TAB ── */}
                        <TabsContent value="attachments" className="p-6 focus-visible:outline-none focus-visible:ring-0">
                            <div className="flex items-center gap-2 mb-6">
                                <Paperclip className="h-4 w-4 text-blue-500" />
                                <h3 className="text-sm font-semibold text-slate-200">Attachments</h3>
                            </div>
                            <div className="space-y-6">
                                <FileUploader
                                    entityType="Opportunity"
                                    entityId={record.id}
                                />
                                <FileList
                                    entityType="Opportunity"
                                    entityId={record.id}
                                />
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Sidebar - Stage History */}
                <div className="space-y-6">
                    <Card className="overflow-hidden rounded-lg border shadow-sm">
                        <CardHeader className="border-b bg-muted py-3 px-4">
                            <CardTitle className="text-base font-semibold text-foreground">Stage History</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[400px]">
                                {(() => {
                                    // Start with the current state of the opportunity
                                    let runningAmount = record.amount || 0;
                                    let runningStageName = stages.find(s => s.id === record.sales_stage_id)?.name || "Unknown";
                                    let runningProb = record.probability || 0;

                                    const tableRows = [];

                                    // History is retrieved newest-first. We walk backward through time.
                                    for (const h of history) {
                                        if (h.field_name === "sales_stage_id") {
                                            if (h.old_value === h.new_value && h.old_value !== null) continue;

                                            // What happened AT this exact event?
                                            // The stage changed to the new stage. The amount was whatever runningAmount we reconstructed for this time.
                                            const displayAmount = h.amount_at_change != null ? h.amount_at_change : runningAmount;
                                            const displayProb = h.probability_at_change != null ? h.probability_at_change : runningProb;
                                            const displayStage = h.new_stage_name || h.new_value;

                                            tableRows.push({
                                                ...h,
                                                displayStage,
                                                displayAmount,
                                                displayProb,
                                                isStageChange: true
                                            });

                                            // Revert the state for events that happened *before* this one
                                            runningStageName = h.old_stage_name || h.old_value || runningStageName;
                                        }
                                        else if (h.field_name === "amount") {
                                            if (h.old_value === h.new_value) continue;

                                            // What happened AT this exact event?
                                            // The amount changed. The stage was whatever runningStageName it was at that time.
                                            const displayAmount = parseFloat(h.new_value || "0");

                                            tableRows.push({
                                                ...h,
                                                displayStage: runningStageName,
                                                displayAmount,
                                                displayProb: runningProb,
                                                isAmountChange: true
                                            });

                                            // Revert the state for events that happened *before* this one
                                            runningAmount = parseFloat(h.old_value || "0");
                                        }
                                    }

                                    if (tableRows.length === 0) {
                                        return (
                                            <div className="text-center py-10">
                                                <p className="text-sm text-slate-400 italic">No stage history recorded yet</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="w-full overflow-x-auto scrollbar-hide">
                                            <Table>
                                            <TableHeader className="sticky top-0 z-10 bg-muted shadow-sm">
                                                <TableRow>
                                                    <TableHead className="py-2 text-[10px] uppercase font-bold text-slate-400">Stage</TableHead>
                                                    <TableHead className="py-2 text-[10px] uppercase font-bold text-slate-400">Amount</TableHead>
                                                    <TableHead className="py-2 text-[10px] uppercase font-bold text-slate-400">Prob</TableHead>
                                                    <TableHead className="py-2 text-[10px] uppercase font-bold text-slate-400">Modified</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {tableRows.map((row: any, i) => (
                                                    <TableRow key={row.id || i} className="hover:bg-slate-800/40">
                                                        <TableCell className="py-2">
                                                            <div className="flex flex-col">
                                                                <p className={`text-xs font-semibold truncate max-w-[80px] ${row.isStageChange ? 'text-blue-400' : 'text-slate-200'}`} title={row.displayStage}>
                                                                    {row.displayStage}
                                                                </p>
                                                                {row.isAmountChange && (
                                                                    <span className="text-[9px] text-amber-600 font-medium">Amount Updated</span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-2">
                                                            <p className="text-xs text-slate-300">
                                                                {formatCurrency(row.displayAmount)}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell className="py-2">
                                                            <p className="text-xs text-slate-300">
                                                                {row.displayProb}%
                                                            </p>
                                                        </TableCell>
                                                        <TableCell className="py-2">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-medium text-slate-100 truncate max-w-[70px]" title={row.user_name || "System"}>
                                                                    {row.user_name || "System"}
                                                                </span>
                                                                <span className="text-[9px] text-slate-400 capitalize">
                                                                    {formatDateTimeBar(row.changed_at)}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        </div>
                                    );
                                })()}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <OpportunityFormDrawer
                open={isEditDrawerOpen}
                onOpenChange={(open) => {
                    setIsEditDrawerOpen(open);
                    if (!open) router.refresh();
                }}
                opportunityId={record.id}
                opportunity={record}
                stages={stages}
            />
        </div>
    );
}
