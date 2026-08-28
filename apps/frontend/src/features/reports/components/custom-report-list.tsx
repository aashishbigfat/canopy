"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Copy, FileText, Folder, FolderOpen } from "lucide-react";

import {
    type CustomReportScope,
    type LegacyReportFolderRef,
    type LegacyReportRow,
    useCloneCustomReport,
    useCreateReportFolder,
    useGetCustomReportWorkspace,
} from "@/features/reports/api/use-reports";
import { formatDate } from "@/lib/format";

const reportId = (report: LegacyReportRow) => report.id;
const isFolderRow = (row: LegacyReportRow) => row.folder === 1;
const displayName = (value?: string | null) => value || "-";

export function CustomReportList() {
    const searchParams = useSearchParams();
    const type = searchParams.get("type") || "accounts";
    const [scope, setScope] = useState<CustomReportScope>("recent");
    const [folderId, setFolderId] = useState<string | undefined>();
    const [newFolderOpen, setNewFolderOpen] = useState(false);
    const [folderNameValue, setFolderNameValue] = useState("");
    const { data, isLoading, isError, error } = useGetCustomReportWorkspace({ type, scope, folderId });
    const createFolder = useCreateReportFolder();
    const cloneReport = useCloneCustomReport();

    const userMap = useMemo(() => {
        return new Map((data?.users || []).map((user) => [user.id, user.name]));
    }, [data?.users]);

    const rows = useMemo<LegacyReportRow[]>(() => {
        if (scope === "all_folders") return data?.all_folders || data?.folders || [];
        if (scope === "folder") return [...(data?.sub_folders || []), ...(data?.reports || [])];
        return data?.reports || [];
    }, [data, scope]);

    const navItems: Array<{ key: CustomReportScope; label: string }> = [
        { key: "recent", label: "Recent" },
        { key: "created_by_me", label: "Created by me" },
        { key: "public", label: "Public Reports" },
        { key: "private", label: "Private Reports" },
        { key: "all", label: "All Reports" },
    ];

    const userLabel = (value?: string | null) => {
        if (!value) return "-";
        return userMap.get(value) || value;
    };

    const openScope = (nextScope: CustomReportScope) => {
        setFolderId(undefined);
        setScope(nextScope);
    };

    const createFolderFromSidebar = async () => {
        const name = folderNameValue.trim();
        if (!name) return;
        await createFolder.mutateAsync({ name, parent_id: scope === "folder" ? folderId : null });
        setFolderNameValue("");
        setNewFolderOpen(false);
        openScope("all_folders");
    };

    const cloneReportRow = async (row: LegacyReportRow) => {
        const name = window.prompt("Clone report name", `${row.name} Copy`);
        if (!name) return;
        await cloneReport.mutateAsync({
            id: row.id,
            name,
            description: row.description,
            folder_id: row.folder_id as LegacyReportFolderRef | null,
        });
        openScope("recent");
    };

    const openFolder = (row: LegacyReportRow) => {
        if (!row.id) return;
        setFolderId(row.id);
        setScope("folder");
    };

    return (
        <div className="space-y-4">
            <div className="px-1 py-2">
                <h1>Reports</h1>
            </div>

            <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
                <aside className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="space-y-2">
                        <Link
                            href={`/reports/new?type=${type}`}
                            className="flex h-11 w-full items-center justify-center rounded-sm bg-blue-500 text-base font-medium text-white transition-colors hover:bg-blue-600"
                        >
                            New Report
                        </Link>
                        <button
                            type="button"
                            onClick={() => setNewFolderOpen((value) => !value)}
                            className="flex h-11 w-full items-center justify-center rounded-sm border border-cyan-100 bg-cyan-50 text-base font-medium text-cyan-600 transition-colors hover:bg-cyan-100"
                        >
                            New Folder
                        </button>
                        {newFolderOpen ? (
                            <div className="space-y-2 rounded-sm border border-slate-200 p-2">
                                <input
                                    className="h-9 w-full rounded-sm border border-slate-300 px-2 text-sm outline-none focus:border-blue-500"
                                    placeholder="Enter New Folder Name"
                                    value={folderNameValue}
                                    onChange={(event) => setFolderNameValue(event.target.value)}
                                />
                                <button
                                    type="button"
                                    className="h-9 w-full rounded-sm bg-blue-500 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60"
                                    disabled={createFolder.isPending}
                                    onClick={createFolderFromSidebar}
                                >
                                    Create Folder
                                </button>
                            </div>
                        ) : null}
                    </div>

                    <div className="mt-8 space-y-4">
                        <div className="flex items-center gap-3 border-b border-slate-200 pb-3 text-slate-600">
                            <FileText className="h-5 w-5" />
                            <span className="text-base font-medium">Reports</span>
                        </div>
                        <nav className="space-y-1 pl-3">
                            {navItems.map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => openScope(item.key)}
                                    className={`block w-full rounded-sm px-3 py-2 text-left text-base transition-colors ${
                                        scope === item.key
                                            ? "bg-blue-50 text-blue-700"
                                            : "text-indigo-600 hover:bg-slate-50"
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="mt-6 space-y-4">
                        <div className="flex items-center gap-3 border-b border-slate-200 pb-3 text-slate-600">
                            <FolderOpen className="h-5 w-5" />
                            <span className="text-base font-medium">Folders</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => openScope("all_folders")}
                            className={`block w-full rounded-sm px-6 py-2 text-left text-base transition-colors ${
                                scope === "all_folders" || scope === "folder"
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-indigo-600 hover:bg-slate-50"
                            }`}
                        >
                            All Folders
                        </button>
                    </div>
                </aside>

                <section className="overflow-hidden rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-[1050px] w-full border-collapse text-left text-sm">
                            <thead>
                                <tr className="border border-slate-200 bg-white text-slate-600">
                                    <th className="w-[24%] border border-slate-200 px-3 py-3 font-semibold">Name</th>
                                    <th className="w-[10%] border border-slate-200 px-3 py-3 font-semibold">Description</th>
                                    <th className="w-[14%] border border-slate-200 px-3 py-3 font-semibold">Folder</th>
                                    <th className="w-[12%] border border-slate-200 px-3 py-3 font-semibold">Created By</th>
                                    <th className="w-[12%] border border-slate-200 px-3 py-3 font-semibold">Owner</th>
                                    <th className="w-[10%] border border-slate-200 px-3 py-3 font-semibold">Created On</th>
                                    <th className="w-[10%] border border-slate-200 px-3 py-3 font-semibold">Last Modified Date</th>
                                    <th className="w-[12%] border border-slate-200 px-3 py-3 font-semibold">Last Modified By</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td className="border border-slate-200 px-3 py-10 text-center text-slate-500" colSpan={8}>
                                            Loading reports...
                                        </td>
                                    </tr>
                                ) : isError ? (
                                    <tr>
                                        <td className="border border-slate-200 px-3 py-10 text-center text-destructive" colSpan={8}>
                                            {error instanceof Error ? error.message : "Error loading reports."}
                                        </td>
                                    </tr>
                                ) : rows.length ? (
                                    rows.map((row, index) => (
                                        <tr key={`${row.folder || 0}-${reportId(row)}`} className={index % 2 === 0 ? "bg-slate-50/80" : "bg-white"}>
                                            <td className="border border-slate-200 px-3 py-3">
                                                {isFolderRow(row) ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => openFolder(row)}
                                                        className="inline-flex items-center gap-2 font-medium text-blue-600 hover:underline"
                                                    >
                                                        <Folder className="h-4 w-4 fill-amber-300 text-amber-300" />
                                                        <span>{row.name}</span>
                                                    </button>
                                                ) : (
                                                    <span className="inline-flex items-center gap-2">
                                                        <Link href={`/reports/${reportId(row)}`} className="font-medium text-blue-600 hover:underline">
                                                            {row.name}
                                                        </Link>
                                                        <button
                                                            type="button"
                                                            title="Clone Report"
                                                            onClick={() => cloneReportRow(row)}
                                                            className="text-blue-600 hover:text-blue-800"
                                                        >
                                                            <Copy className="h-4 w-4" />
                                                        </button>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="border border-slate-200 px-3 py-3 text-slate-600">{displayName(row.description)}</td>
                                            <td className="border border-slate-200 px-3 py-3">
                                                {row.folder_id ? (
                                                    <button
                                                        type="button"
                                                        className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                                                        onClick={() => openFolder({ id: row.folder_id?.id || "", name: row.folder_id?.name || "", folder: 1 })}
                                                    >
                                                        <Folder className="h-4 w-4 fill-amber-300 text-amber-300" />
                                                        {row.folder_id.name}
                                                    </button>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>
                                            <td className="border border-slate-200 px-3 py-3">{userLabel(row.created_by)}</td>
                                            <td className="border border-slate-200 px-3 py-3">{userLabel(row.owner_id || row.created_by)}</td>
                                            <td className="border border-slate-200 px-3 py-3">{formatDate(row.created_at)}</td>
                                            <td className="border border-slate-200 px-3 py-3">{formatDate(row.updated_at)}</td>
                                            <td className="border border-slate-200 px-3 py-3">{userLabel(row.last_modified_by_id || row.created_by)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td className="border border-slate-200 px-3 py-10 text-center text-slate-500" colSpan={8}>
                                            No reports found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}
