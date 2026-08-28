"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BriefcaseBusiness, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api/client";
import { formatDate } from "@/lib/format";

type ColumnDef = {
    id?: number | string;
    name: string;
    alias_name: string;
    is_additional?: number;
};

type OperatorDef = {
    id: string;
    name: string;
};

type FilterRule = {
    field: string;
    operator: string;
    value: string;
};

type DefaultFilter = {
    field: string;
    label: string;
    operator: string;
    value: string;
};

type BuilderMetadata = {
    all_columns: ColumnDef[];
    display_columns: ColumnDef[];
    operators: OperatorDef[];
    default_filters?: DefaultFilter[];
    report_results: Record<string, unknown>[];
};

type FolderOption = {
    id: string;
    name: string;
};

const moduleLabels: Record<string, string> = {
    accounts: "Accounts",
    contacts: "Contacts",
    personal_accounts: "Personal Accounts",
    leads: "Leads",
    opportunities: "Opportunities",
    supplier: "Supplier",
};

const baseFiltersForType = (type: string) => {
    if (type === "personal_accounts") return { is_person_account: true };
    if (type === "accounts") return { is_person_account: false };
    return {};
};

const cellValue = (value: unknown) => {
    if (value === null || value === undefined || value === "") return "-";
    if (value instanceof Date) return formatDate(value);
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return formatDate(value);
    if (Array.isArray(value)) return value.map((item) => cellValue(item)).join(", ");
    if (typeof value === "object") {
        const objectValue = value as Record<string, unknown>;
        return String(objectValue.name || objectValue.label || objectValue.id || "-");
    }
    return String(value);
};

const errorMessage = (err: unknown, fallback: string) => {
    if (typeof err === "object" && err && "response" in err) {
        const data = (err as { response?: { data?: { detail?: unknown; message?: unknown } } }).response?.data;
        if (typeof data?.detail === "string") return data.detail;
        if (typeof data?.message === "string") return data.message;
    }
    if (err instanceof Error) return err.message;
    if (typeof err === "object" && err && "message" in err) {
        return String((err as { message?: unknown }).message || fallback);
    }
    return fallback;
};

export function ReportBuilder() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const type = searchParams.get("type") || "accounts";
    const label = moduleLabels[type] || "Reports";

    const [metadata, setMetadata] = useState<BuilderMetadata | null>(null);
    const [columns, setColumns] = useState<ColumnDef[]>([]);
    const [rows, setRows] = useState<Record<string, unknown>[]>([]);
    const [filters, setFilters] = useState<FilterRule[]>([]);
    const [newFilter, setNewFilter] = useState<FilterRule>({ field: "", operator: "equals", value: "" });
    const [panel, setPanel] = useState<"fields" | "filter" | null>(null);
    const [saveOpen, setSaveOpen] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [folders, setFolders] = useState<FolderOption[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState("");
    const [newFolderName, setNewFolderName] = useState("");
    const [creatingFolder, setCreatingFolder] = useState(false);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const availableColumns = useMemo(() => {
        if (!metadata) return [];
        const selected = new Set(columns.map((column) => column.name));
        return metadata.all_columns.filter((column) => !selected.has(column.name));
    }, [columns, metadata]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        apiClient
            .get<BuilderMetadata>("/reports/custom/metadata", { params: { type } })
            .then((response) => {
                if (cancelled) return;
                setMetadata(response.data);
                setColumns(response.data.display_columns || []);
                setRows(response.data.report_results || []);
                setError(null);
            })
            .catch((err) => setError(err?.message || "Failed to load report metadata"))
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [type]);

    const loadFolders = async () => {
        const response = await apiClient.get("/reports/custom/folders");
        setFolders(response.data.all_folders || []);
    };

    useEffect(() => {
        if (!saveOpen) return;
        loadFolders().catch((err: unknown) => setError(errorMessage(err, "Failed to load folders")));
    }, [saveOpen]);

    const runPreview = async () => {
        setRunning(true);
        try {
            const response = await apiClient.post("/reports/preview", {
                entity_type: type,
                columns: columns.map((column) => column.name),
                filters: {
                    ...baseFiltersForType(type),
                    $rules: filters,
                },
                limit: 5,
            });
            setRows(response.data.report_results || []);
            setError(null);
        } catch (err: unknown) {
            setError(errorMessage(err, "Failed to run report preview"));
        } finally {
            setRunning(false);
        }
    };

    const saveReport = async () => {
        if (!name.trim()) {
            setError("Report name is required");
            return;
        }
        if (!columns.length) {
            setError("Select at least one field");
            return;
        }
        if (!selectedFolderId) {
            setError("Select or create a folder");
            return;
        }
        setSaving(true);
        try {
            const selectedFolder = folders.find((folder) => folder.id === selectedFolderId);
            const created = await apiClient.post("/reports/custom/save", {
                name,
                description,
                entity_type: type,
                report_type: "custom",
                columns: columns.map((column) => column.name),
                filters: {
                    ...baseFiltersForType(type),
                    $rules: filters,
                },
                order_direction: "desc",
                folder_id: selectedFolderId || null,
                folder_name: selectedFolder?.name || null,
                is_public: false,
            });
            setSaveOpen(false);
            router.push(`/reports/${created.data.id || created.data._id}`);
            router.refresh();
        } catch (err: unknown) {
            setError(errorMessage(err, "Failed to save report"));
        } finally {
            setSaving(false);
        }
    };

    const createFolder = async () => {
        const folderName = newFolderName.trim();
        if (!folderName) return;
        setCreatingFolder(true);
        try {
            const response = await apiClient.post("/reports/custom/folders", {
                name: folderName,
                parent_id: null,
            });
            const folder = response.data.folder || { id: response.data.folder_id, name: folderName };
            await loadFolders();
            setSelectedFolderId(folder.id);
            setNewFolderName("");
            setError(null);
        } catch (err: unknown) {
            setError(errorMessage(err, "Failed to create folder"));
        } finally {
            setCreatingFolder(false);
        }
    };

    const addColumn = (nameToAdd: string) => {
        const column = metadata?.all_columns.find((item) => item.name === nameToAdd);
        if (!column) return;
        setColumns((current) => [...current, column]);
    };

    const removeColumn = (nameToRemove: string) => {
        setColumns((current) => current.filter((column) => column.name !== nameToRemove));
    };

    const addFilter = () => {
        if (!newFilter.field || !newFilter.operator) return;
        setFilters((current) => [...current, newFilter]);
        setNewFilter({ field: "", operator: "equals", value: "" });
    };

    return (
        <div className="relative min-h-[620px] bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white p-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-white">
                        <BriefcaseBusiness className="h-7 w-7" />
                    </div>
                    <div>
                        <div className="text-base font-semibold text-blue-600">Reports Type</div>
                        <div className="text-lg text-slate-700">{label}</div>
                    </div>
                </div>
                <div className="flex">
                    <Button type="button" className="rounded-none bg-blue-500 hover:bg-blue-600" onClick={() => setSaveOpen(true)}>
                        Save
                    </Button>
                    <Button type="button" className="rounded-none bg-violet-600 hover:bg-violet-700" onClick={() => setPanel(panel ? null : "fields")}>
                        Fields/ Filter
                    </Button>
                    <Button type="button" variant="secondary" className="rounded-none" onClick={() => router.push(`/reports/custom?type=${type}`)}>
                        Close
                    </Button>
                    <Button type="button" className="rounded-none bg-pink-100 text-pink-500 hover:bg-pink-200" onClick={runPreview} disabled={running}>
                        {running ? "Run..." : "Run"}
                    </Button>
                </div>
            </div>

            {error ? <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div> : null}

            <div className="overflow-auto">
                <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                    <thead className="bg-slate-800 text-white">
                        <tr>
                            {columns.map((column) => (
                                <th key={column.name} className="border-r border-slate-400 px-2 py-2 text-base font-semibold">
                                    {column.alias_name}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td className="px-3 py-8 text-center text-slate-500" colSpan={Math.max(columns.length, 1)}>Loading...</td></tr>
                        ) : rows.length ? (
                            rows.map((row, rowIndex) => (
                                <tr key={String(row.id || rowIndex)} className={rowIndex % 2 === 0 ? "bg-slate-50" : "bg-white"}>
                                    {columns.map((column) => (
                                        <td key={column.name} className="border-r border-slate-200 px-2 py-2 text-base text-slate-600">
                                            {cellValue(row[column.name])}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr><td className="px-3 py-8 text-center text-slate-500" colSpan={Math.max(columns.length, 1)}>No data found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {panel ? (
                <div className="absolute right-0 top-[81px] z-20 h-[540px] w-[360px] border-l border-slate-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between bg-slate-800 px-4 py-3 text-white">
                        <h3 className="text-base font-semibold">Fields and Filters</h3>
                        <button type="button" onClick={() => setPanel(null)}><X className="h-5 w-5" /></button>
                    </div>
                    <div className="flex border-b border-slate-200">
                        <button type="button" className={`flex-1 px-3 py-2 text-sm ${panel === "fields" ? "bg-blue-50 text-blue-700" : ""}`} onClick={() => setPanel("fields")}>Fields</button>
                        <button type="button" className={`flex-1 px-3 py-2 text-sm ${panel === "filter" ? "bg-blue-50 text-blue-700" : ""}`} onClick={() => setPanel("filter")}>Filter</button>
                    </div>
                    {panel === "fields" ? (
                        <div className="space-y-4 p-4">
                            <select className="h-10 w-full rounded border border-slate-300 px-2" value="" onChange={(event) => addColumn(event.target.value)}>
                                <option value="">Select fields</option>
                                {availableColumns.map((column) => <option key={column.name} value={column.name}>{column.alias_name}</option>)}
                            </select>
                            <div className="space-y-2">
                                <div className="font-semibold">Standard Fields</div>
                                {columns.map((column) => (
                                    <div key={column.name} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2">
                                        <span>{column.alias_name}</span>
                                        <button type="button" onClick={() => removeColumn(column.name)}><X className="h-4 w-4" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 p-4">
                            <div className="grid gap-2">
                                <select className="h-10 rounded border border-slate-300 px-2" value={newFilter.field} onChange={(event) => setNewFilter((current) => ({ ...current, field: event.target.value }))}>
                                    <option value="">Select field</option>
                                    {(metadata?.all_columns || []).map((column) => <option key={column.name} value={column.name}>{column.alias_name}</option>)}
                                </select>
                                <select className="h-10 rounded border border-slate-300 px-2" value={newFilter.operator} onChange={(event) => setNewFilter((current) => ({ ...current, operator: event.target.value }))}>
                                    {(metadata?.operators || []).map((operator) => <option key={operator.id} value={operator.id}>{operator.name}</option>)}
                                </select>
                                <Input value={newFilter.value} placeholder="Value" onChange={(event) => setNewFilter((current) => ({ ...current, value: event.target.value }))} />
                                <Button type="button" onClick={addFilter}>Add Filter</Button>
                            </div>
                            <div className="space-y-2">
                                {(metadata?.default_filters || []).length ? (
                                    <div className="space-y-2">
                                        <div className="font-semibold">Default Filter</div>
                                        {(metadata?.default_filters || []).map((filter) => (
                                            <div key={filter.field} className="rounded border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                                                {filter.label} {filter.operator} {filter.value}
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                                {filters.map((filter, index) => (
                                    <div key={`${filter.field}-${index}`} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm">
                                        <span>{filter.field} {filter.operator} {filter.value || "-"}</span>
                                        <button type="button" onClick={() => setFilters((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X className="h-4 w-4" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : null}

            {saveOpen ? (
                <div className="fixed inset-0 z-30 bg-black/20">
                    <div className="ml-auto h-full w-[420px] bg-white shadow-xl">
                        <div className="flex items-center justify-between bg-slate-800 px-4 py-3 text-white">
                            <h3 className="text-lg font-semibold">Save Report</h3>
                            <button type="button" onClick={() => setSaveOpen(false)}><X className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-4 p-4">
                            <label className="block text-sm font-medium">Name</label>
                            <Input value={name} onChange={(event) => setName(event.target.value)} />
                            <label className="block text-sm font-medium">Description</label>
                            <textarea className="min-h-24 w-full rounded border border-slate-300 p-2" value={description} onChange={(event) => setDescription(event.target.value)} />
                            <label className="block text-sm font-medium">Folder</label>
                            <select className="h-10 w-full rounded border border-slate-300 px-2" value={selectedFolderId} onChange={(event) => setSelectedFolderId(event.target.value)}>
                                <option value="">Select Folder</option>
                                {folders.map((folder) => (
                                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                                ))}
                            </select>
                            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                                <Input value={newFolderName} placeholder="Enter New Folder Name" onChange={(event) => setNewFolderName(event.target.value)} />
                                <Button type="button" variant="secondary" onClick={createFolder} disabled={creatingFolder}>
                                    {creatingFolder ? "Creating..." : "Create"}
                                </Button>
                            </div>
                        </div>
                        <div className="border-t border-slate-200 p-4 text-right">
                            <Button type="button" onClick={saveReport} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
