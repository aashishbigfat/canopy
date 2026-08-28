"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    ArrowLeft,
    ChevronRight,
    Copy,
    Edit,
    FileText,
    Folder,
    FolderPlus,
    Play,
    Plus,
    Trash,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useDeleteReport, useGetReports } from "@/features/reports/api/use-reports";
import { reportsExtraService, type ReportFolder } from "@/lib/api/services/reports-extra.service";

type ReportTab = "recent" | "created" | "public" | "private" | "all" | "folders";

type ModuleConfig = {
    type: string;
    entityType: string;
    builderModule: string;
    label: string;
    filter?: (report: any) => boolean;
};

type Breadcrumb = {
    id: string;
    name: string;
};

const MODULES: Record<string, ModuleConfig> = {
    accounts: {
        type: "accounts",
        entityType: "accounts",
        builderModule: "accounts",
        label: "Accounts",
        filter: (report) => report.filters?.is_person_account !== true,
    },
    contacts: {
        type: "contacts",
        entityType: "contacts",
        builderModule: "contacts",
        label: "Contacts",
    },
    personal_accounts: {
        type: "personal_accounts",
        entityType: "accounts",
        builderModule: "personal_accounts",
        label: "Person Account",
        filter: (report) => report.filters?.is_person_account === true,
    },
    leads: {
        type: "leads",
        entityType: "leads",
        builderModule: "leads",
        label: "Leads",
    },
    opportunities: {
        type: "opportunities",
        entityType: "opportunities",
        builderModule: "opportunities",
        label: "Opportunities",
    },
    supplier: {
        type: "supplier",
        entityType: "suppliers",
        builderModule: "suppliers",
        label: "Supplier",
    },
    suppliers: {
        type: "supplier",
        entityType: "suppliers",
        builderModule: "suppliers",
        label: "Supplier",
    },
    tasks: {
        type: "tasks",
        entityType: "tasks",
        builderModule: "tasks",
        label: "Tasks",
    },
};

const TABS: Array<{ key: ReportTab; label: string }> = [
    { key: "recent", label: "Recent" },
    { key: "created", label: "Created by me" },
    { key: "public", label: "Public Reports" },
    { key: "private", label: "Private Reports" },
    { key: "all", label: "All Reports" },
    { key: "folders", label: "All Folders" },
];

function getModuleConfig(type: string | null): ModuleConfig {
    return MODULES[type || ""] || MODULES.leads;
}

function getId(row: any) {
    return String(row?.id || row?._id || "");
}

function formatDate(value: string | undefined) {
    return value ? new Date(value).toLocaleDateString() : "-";
}

function displayEntity(entityType: string) {
    return entityType.replaceAll("_", " ");
}

function parentId(folder: any) {
    return folder?.parent_id ? String(folder.parent_id) : "";
}

export function CustomReportsWorkspace({ type }: { type: string }) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const moduleConfig = getModuleConfig(type);
    const deleteReport = useDeleteReport();

    const [activeTab, setActiveTab] = useState<ReportTab>("recent");
    const [folderName, setFolderName] = useState("");
    const [folderOpen, setFolderOpen] = useState(false);
    const [creatingFolder, setCreatingFolder] = useState(false);
    const [currentFolder, setCurrentFolder] = useState<Breadcrumb | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
    const [cloneOpen, setCloneOpen] = useState(false);
    const [cloneReport, setCloneReport] = useState<any>(null);
    const [cloneName, setCloneName] = useState("");
    const [cloneDescription, setCloneDescription] = useState("");
    const [selectedCloneFolder, setSelectedCloneFolder] = useState<ReportFolder | null>(null);
    const [pickerParentId, setPickerParentId] = useState("");
    const [pickerTrail, setPickerTrail] = useState<Breadcrumb[]>([]);
    const [pickerFolderName, setPickerFolderName] = useState("");
    const [showPickerNewFolder, setShowPickerNewFolder] = useState(false);

    const reportParams = useMemo(() => {
        const params: { entity_type: string; is_public?: boolean; per_page?: number } = {
            entity_type: moduleConfig.entityType,
            per_page: 100,
        };
        if (activeTab === "public") params.is_public = true;
        if (activeTab === "private") params.is_public = false;
        return params;
    }, [activeTab, moduleConfig.entityType]);

    const { data: reports = [], isLoading, isError } = useGetReports(reportParams);

    const { data: createdReports = [], isLoading: createdLoading } = useQuery({
        queryKey: ["reports", "created-by-me", moduleConfig.entityType],
        queryFn: reportsExtraService.createdByMe,
        enabled: activeTab === "created",
    });

    const { data: folders = [], isLoading: foldersLoading } = useQuery({
        queryKey: ["report-folders"],
        queryFn: reportsExtraService.listFolders,
        enabled: activeTab === "folders" || cloneOpen,
    });

    const { data: folderContents, isLoading: folderContentsLoading } = useQuery({
        queryKey: ["report-folder-contents", currentFolder?.id],
        queryFn: () => reportsExtraService.getFolderContents(currentFolder!.id),
        enabled: activeTab === "folders" && !!currentFolder?.id,
    });

    const visibleReports = useMemo(() => {
        const source = activeTab === "created" ? createdReports : reports;
        return source.filter((report: any) => {
            if (report.entity_type !== moduleConfig.entityType) return false;
            return moduleConfig.filter ? moduleConfig.filter(report) : true;
        });
    }, [activeTab, createdReports, moduleConfig, reports]);

    const rootFolders = useMemo(
        () => folders.filter((folder: any) => !parentId(folder)),
        [folders]
    );

    const pickerFolders = useMemo(
        () => folders.filter((folder: any) => parentId(folder) === pickerParentId),
        [folders, pickerParentId]
    );

    const folderRows = currentFolder
        ? [
            ...(folderContents?.sub_folders || []).map((folder: any) => ({ kind: "folder", data: folder })),
            ...(folderContents?.reports || [])
                .filter((report: any) => {
                    if (report.entity_type !== moduleConfig.entityType) return false;
                    return moduleConfig.filter ? moduleConfig.filter(report) : true;
                })
                .map((report: any) => ({ kind: "report", data: report })),
        ]
        : rootFolders.map((folder: any) => ({ kind: "folder", data: folder }));

    const loading = activeTab === "created"
        ? createdLoading
        : activeTab === "folders"
            ? foldersLoading || folderContentsLoading
            : isLoading;

    const switchTab = (tab: ReportTab) => {
        setActiveTab(tab);
        setCurrentFolder(null);
        setBreadcrumbs([]);
    };

    const openFolder = (folder: any) => {
        const crumb = { id: getId(folder), name: folder.name };
        setCurrentFolder(crumb);
        setBreadcrumbs((items) => [...items, crumb]);
    };

    const goToCrumb = (index: number) => {
        const next = breadcrumbs[index];
        setBreadcrumbs((items) => items.slice(0, index + 1));
        setCurrentFolder(next);
    };

    const resetFolders = () => {
        setCurrentFolder(null);
        setBreadcrumbs([]);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this report?")) return;
        await deleteReport.mutateAsync(id);
        toast.success("Report deleted");
    };

    const createFolder = async (parent = "") => {
        const name = (parent ? pickerFolderName : folderName).trim();
        if (!name) return;
        setCreatingFolder(true);
        try {
            await reportsExtraService.createFolder({
                name,
                parent_id: parent || null,
                is_public: false,
            });
            setFolderName("");
            setPickerFolderName("");
            setShowPickerNewFolder(false);
            setFolderOpen(false);
            toast.success("Folder created");
            queryClient.invalidateQueries({ queryKey: ["report-folders"] });
            queryClient.invalidateQueries({ queryKey: ["report-folder-contents"] });
        } finally {
            setCreatingFolder(false);
        }
    };

    const openClone = (report: any) => {
        setCloneReport(report);
        setCloneName(`${report.name} (copy)`);
        setCloneDescription(report.description || "");
        setSelectedCloneFolder(null);
        setPickerParentId("");
        setPickerTrail([]);
        setShowPickerNewFolder(false);
        setCloneOpen(true);
    };

    const selectPickerFolder = (folder: ReportFolder) => {
        const crumb = { id: getId(folder), name: folder.name };
        setSelectedCloneFolder(folder);
        setPickerParentId(crumb.id);
        setPickerTrail((items) => [...items, crumb]);
    };

    const pickerBack = () => {
        const nextTrail = pickerTrail.slice(0, -1);
        setPickerTrail(nextTrail);
        setPickerParentId(nextTrail[nextTrail.length - 1]?.id || "");
    };

    const submitClone = async () => {
        if (!cloneReport || !cloneName.trim()) return;
        await reportsExtraService.clone(getId(cloneReport), {
            name: cloneName.trim(),
            description: cloneDescription,
            folder_id: selectedCloneFolder ? getId(selectedCloneFolder) : null,
        });
        toast.success("Report cloned");
        setCloneOpen(false);
        queryClient.invalidateQueries({ queryKey: ["reports"] });
        queryClient.invalidateQueries({ queryKey: ["report-folders"] });
        queryClient.invalidateQueries({ queryKey: ["report-folder-contents"] });
    };

    const renderReportRow = (report: any) => {
        const id = getId(report);
        return (
            <TableRow key={`report-${id}`}>
                <TableCell className="font-medium">
                    <div className="flex min-w-0 items-center gap-2">
                        <Link href={`/reports/${id}`} className="truncate text-orange-600 hover:underline">
                            {report.name}
                        </Link>
                        <button type="button" title="Clone Report" onClick={() => openClone(report)}>
                            <Copy className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </button>
                    </div>
                    <div className="text-xs capitalize text-muted-foreground">{displayEntity(report.entity_type)}</div>
                </TableCell>
                <TableCell>{report.created_by || report.owner_id || "-"}</TableCell>
                <TableCell>{formatDate(report.updated_at)}</TableCell>
                <TableCell>
                    <Badge variant="outline">{report.is_public ? "Public" : "Private"}</Badge>
                </TableCell>
                <TableCell className="space-x-1 text-right">
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/reports/${id}`)}>
                        <Play className="mr-1 h-4 w-4" />
                        Run
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => router.push(`/reports/${id}/edit`)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDelete(id)}
                    >
                        <Trash className="h-4 w-4" />
                    </Button>
                </TableCell>
            </TableRow>
        );
    };

    return (
        <div className="crm-surface p-2">
            <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
                <aside className="border-r pr-0 lg:pr-3">
                    <div className="space-y-2 p-2">
                        <Button asChild className="w-full">
                            <Link href={`/reports/new?module=${moduleConfig.builderModule}`}>
                                <Plus className="mr-2 h-4 w-4" />
                                New Report
                            </Link>
                        </Button>
                        <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
                            <DialogTrigger asChild>
                                <Button variant="secondary" className="w-full">
                                    <FolderPlus className="mr-2 h-4 w-4" />
                                    New Folder
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create New Folder</DialogTitle>
                                </DialogHeader>
                                <Input
                                    value={folderName}
                                    onChange={(event) => setFolderName(event.target.value)}
                                    placeholder="Enter New Folder Name"
                                />
                                <DialogFooter>
                                    <Button onClick={() => createFolder()} disabled={creatingFolder || !folderName.trim()}>
                                        {creatingFolder ? "Creating..." : "Create Folder"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <nav className="mt-2 space-y-1 p-2">
                        <p className="mb-1 flex items-center border-b pb-2 text-sm font-medium">
                            <FileText className="mr-2 h-4 w-4" />
                            Reports
                        </p>
                        {TABS.slice(0, 5).map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => switchTab(tab.key)}
                                className={cn(
                                    "block w-full rounded px-2 py-1.5 text-left text-sm text-blue-600 hover:bg-muted",
                                    activeTab === tab.key && "bg-muted font-medium text-foreground"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                        <p className="mb-1 mt-3 flex items-center border-b pb-2 text-sm font-medium">
                            <Folder className="mr-2 h-4 w-4" />
                            Folders
                        </p>
                        <button
                            type="button"
                            onClick={() => switchTab("folders")}
                            className={cn(
                                "block w-full rounded px-2 py-1.5 text-left text-sm text-blue-600 hover:bg-muted",
                                activeTab === "folders" && "bg-muted font-medium text-foreground"
                            )}
                        >
                            All Folders
                        </button>
                    </nav>
                </aside>

                <section className="min-w-0 p-2">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">{moduleConfig.label} Reports</h2>
                            <p className="text-sm text-muted-foreground">
                                {TABS.find((tab) => tab.key === activeTab)?.label || "Reports"}
                            </p>
                        </div>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/reports">Back to Report Main</Link>
                        </Button>
                    </div>

                    {activeTab === "folders" && (
                        <div className="mb-2 flex flex-wrap items-center gap-1 text-sm">
                            <button type="button" onClick={resetFolders} className="text-blue-600 hover:underline">
                                All Folders
                            </button>
                            {breadcrumbs.map((crumb, index) => (
                                <span key={crumb.id} className="flex items-center gap-1">
                                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                    <button
                                        type="button"
                                        onClick={() => goToCrumb(index)}
                                        className={cn(
                                            "hover:underline",
                                            index === breadcrumbs.length - 1 ? "font-medium text-foreground" : "text-blue-600"
                                        )}
                                    >
                                        {crumb.name}
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Owner</TableHead>
                                    <TableHead>Last Modified Date</TableHead>
                                    <TableHead>Visibility</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading || isError ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            {isError ? "Error loading reports." : "Loading..."}
                                        </TableCell>
                                    </TableRow>
                                ) : activeTab === "folders" ? (
                                    folderRows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                No folders or reports found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        folderRows.map((row: any) => {
                                            if (row.kind === "report") return renderReportRow(row.data);
                                            const folder = row.data;
                                            return (
                                                <TableRow key={`folder-${getId(folder)}`}>
                                                    <TableCell className="font-medium">
                                                        <button
                                                            type="button"
                                                            onClick={() => openFolder(folder)}
                                                            className="flex min-w-0 items-center gap-2 text-blue-600 hover:underline"
                                                        >
                                                            <Folder className="h-4 w-4 shrink-0 text-amber-500" />
                                                            <span className="truncate">{folder.name}</span>
                                                        </button>
                                                    </TableCell>
                                                    <TableCell>{folder.created_by || "-"}</TableCell>
                                                    <TableCell>{formatDate(folder.updated_at || folder.created_at)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{folder.is_public ? "Public" : "Private"}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm text-muted-foreground">
                                                        {folder.report_ids?.length || 0} reports
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )
                                ) : visibleReports.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No reports found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    visibleReports.map(renderReportRow)
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </section>
            </div>

            <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Clone Report</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium">Name</label>
                            <Input value={cloneName} onChange={(event) => setCloneName(event.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">Description</label>
                            <Textarea
                                value={cloneDescription}
                                onChange={(event) => setCloneDescription(event.target.value)}
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">Folder</label>
                            <div className="flex gap-2">
                                <Input value={selectedCloneFolder?.name || ""} disabled placeholder="No folder selected" />
                                <Button type="button" variant="secondary" onClick={() => setPickerParentId("")}>
                                    Select Folder
                                </Button>
                            </div>
                        </div>

                        <div className="rounded-md border p-2">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    className="h-8 px-0"
                                    disabled={pickerTrail.length === 0}
                                    onClick={pickerBack}
                                >
                                    <ArrowLeft className="mr-1 h-4 w-4" />
                                    Back
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setShowPickerNewFolder((value) => !value)}
                                >
                                    <FolderPlus className="mr-1 h-4 w-4" />
                                    New Folder
                                </Button>
                            </div>
                            {showPickerNewFolder && (
                                <div className="mb-2 flex gap-2">
                                    <Input
                                        value={pickerFolderName}
                                        onChange={(event) => setPickerFolderName(event.target.value)}
                                        placeholder="Enter New Folder Name"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={creatingFolder || !pickerFolderName.trim()}
                                        onClick={() => createFolder(pickerParentId)}
                                    >
                                        Create
                                    </Button>
                                </div>
                            )}
                            <div className="max-h-48 overflow-auto">
                                {pickerFolders.length === 0 ? (
                                    <div className="p-3 text-center text-sm text-muted-foreground">No folders here.</div>
                                ) : pickerFolders.map((folder) => (
                                    <button
                                        key={getId(folder)}
                                        type="button"
                                        onClick={() => selectPickerFolder(folder)}
                                        className="flex w-full items-center justify-between border-b p-2 text-left text-sm hover:bg-muted"
                                    >
                                        <span className="flex min-w-0 items-center gap-2">
                                            <Folder className="h-4 w-4 shrink-0 text-amber-500" />
                                            <span className="truncate">{folder.name}</span>
                                        </span>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={submitClone} disabled={!cloneName.trim()}>
                            Clone
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
