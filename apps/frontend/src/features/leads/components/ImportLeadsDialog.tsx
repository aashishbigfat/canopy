"use client";

import React, { useState, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Upload,
    FileText,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    Download,
    ChevronRight,
    ChevronLeft,
    Trash,
    AlertCircle,
    Info
} from "lucide-react";
import { toast } from "sonner";
import { leadsService } from "@/lib/api/services/leads.service";
import { useQueryClient } from "@tanstack/react-query";

interface ImportLeadsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ImportLeadsDialog({ open, onOpenChange }: ImportLeadsDialogProps) {
    const queryClient = useQueryClient();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [file, setFile] = useState<File | null>(null);
    const [previewRows, setPreviewRows] = useState<string[][]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<{
        imported: number;
        skipped: number;
        total: number;
        errors: string[];
    } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Standard CSV parser that handles quotes and commas
    const parseCSV = (text: string): string[][] => {
        const lines: string[][] = [];
        let row: string[] = [];
        let inQuotes = false;
        let currentValue = "";

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    currentValue += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === "," && !inQuotes) {
                row.push(currentValue.trim());
                currentValue = "";
            } else if ((char === "\r" || char === "\n") && !inQuotes) {
                if (char === "\r" && nextChar === "\n") {
                    i++;
                }
                row.push(currentValue.trim());
                lines.push(row);
                row = [];
                currentValue = "";
            } else {
                currentValue += char;
            }
        }

        if (row.length > 0 || currentValue !== "") {
            row.push(currentValue.trim());
            lines.push(row);
        }

        return lines.filter(r => r.some(cell => cell !== ""));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        processFile(selectedFile);
    };

    const processFile = (selectedFile: File) => {
        if (!selectedFile.name.endsWith(".csv") && !selectedFile.name.endsWith(".xlsx")) {
            toast.error("Unsupported file type. Please upload a CSV or Excel file.");
            return;
        }

        setFile(selectedFile);

        // Read first few lines for preview
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            try {
                const parsed = parseCSV(text);
                if (parsed.length > 0) {
                    setHeaders(parsed[0]);
                    setPreviewRows(parsed.slice(1, 6)); // First 5 rows for preview
                    setStep(2);
                } else {
                    toast.error("The file appears to be empty.");
                }
            } catch (err) {
                toast.error("Failed to parse the file. Please check its formatting.");
            }
        };
        reader.readAsText(selectedFile);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            processFile(droppedFile);
        }
    };

    const downloadTemplate = () => {
        const columns = [
            "First Name", "Last Name", "Company", "Email", "Phone", "Mobile",
            "Title", "Website", "Street", "City", "State", "Zip", "Country",
            "Lead Status", "Source", "Source Medium", "Industry", "Segment",
            "No of Employees", "Travel Date", "No of Pax", "Destinations"
        ];
        const sampleData = [
            "John", "Doe", "Acme Corp", "john.doe@example.com", "+1234567890", "+1987654321",
            "Manager", "https://acme.com", "123 Main St", "New York", "NY", "10001", "USA",
            "New", "Web", "Organic", "Technology", "B2C", "50", "2026-08-15", "2", "Paris"
        ];
        const csvContent = [columns.join(","), sampleData.join(",")].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "tutterfly_leads_import_template.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Template downloaded successfully");
    };

    const handleImport = async () => {
        if (!file) return;
        setIsImporting(true);
        setStep(3);

        try {
            const response = await leadsService.importLeadsCsv(file);
            if (response && !response.error) {
                setImportResult(response.data);
                toast.success(response.message || "Import completed successfully.");
                queryClient.invalidateQueries({ queryKey: ["leads"] });
            } else {
                toast.error(response?.message || "Import failed. Please check the file formatting.");
                setStep(2);
            }
        } catch (error: any) {
            const errorMessage = error?.response?.data?.detail || error?.message || "An unexpected error occurred during import.";
            toast.error(errorMessage);
            setStep(2);
        } finally {
            setIsImporting(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setPreviewRows([]);
        setHeaders([]);
        setImportResult(null);
        setStep(1);
    };

    const handleClose = () => {
        handleReset();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => { if (!isImporting) { if (!val) handleReset(); onOpenChange(val); } }}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden p-0 border-none flex flex-col bg-card shadow-2xl rounded-xl">
                {/* Header */}
                <DialogHeader className="p-6 border-b border-border bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-primary">
                        <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        Import Leads in Bulk
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground mt-1">
                        Upload a CSV or Excel spreadsheet to import your leads list into Tutterfly CRM.
                    </DialogDescription>
                </DialogHeader>

                {/* Progress Indicators */}
                <div className="px-6 py-3 bg-muted/40 border-b border-border flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <div className="flex items-center gap-6">
                        <div className={`flex items-center gap-2 ${step >= 1 ? "text-blue-600 dark:text-blue-400" : ""}`}>
                            <span className={`h-5 w-5 rounded-full flex items-center justify-center border text-[10px] ${step >= 1 ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-950/80 dark:border-blue-900" : ""}`}>1</span>
                            Upload File
                        </div>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                        <div className={`flex items-center gap-2 ${step >= 2 ? "text-blue-600 dark:text-blue-400" : ""}`}>
                            <span className={`h-5 w-5 rounded-full flex items-center justify-center border text-[10px] ${step >= 2 ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-950/80 dark:border-blue-900" : "border-muted"}`}>2</span>
                            Preview & Validate
                        </div>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                        <div className={`flex items-center gap-2 ${step >= 3 ? "text-blue-600 dark:text-blue-400" : ""}`}>
                            <span className={`h-5 w-5 rounded-full flex items-center justify-center border text-[10px] ${step >= 3 ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-950/80 dark:border-blue-900" : "border-muted"}`}>3</span>
                            Import Status
                        </div>
                    </div>
                    {file && (
                        <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/30">
                            <FileText className="h-3 w-3" />
                            <span className="max-w-[150px] truncate">{file.name}</span>
                        </div>
                    )}
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-6 min-h-[300px] flex flex-col justify-center">

                    {/* Step 1: Upload */}
                    {step === 1 && (
                        <div className="space-y-6 my-auto">
                            <div
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-muted-foreground/25 hover:border-blue-500/50 hover:bg-blue-50/5 dark:hover:bg-blue-950/5 rounded-xl p-10 text-center cursor-pointer transition-all duration-200 group flex flex-col items-center justify-center space-y-4"
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept=".csv,.xlsx"
                                    className="hidden"
                                />
                                <div className="h-16 w-16 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-200 shadow-sm border border-blue-100 dark:border-blue-900/30">
                                    <Upload className="h-8 w-8" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-semibold text-lg text-foreground">Drag and drop your spreadsheet here</p>
                                    <p className="text-sm text-muted-foreground">or click to browse from your computer</p>
                                </div>
                                <div className="flex gap-2 text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                                    <span>Supports: CSV, XLSX</span>
                                    <span>•</span>
                                    <span>Max size: 10MB</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border">
                                <div className="flex items-start gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 mt-0.5">
                                        <Info className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <h4 className="font-semibold text-sm">Need a template to get started?</h4>
                                        <p className="text-xs text-muted-foreground">Download our pre-formatted CSV template with standard fields.</p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={downloadTemplate}
                                    className="flex items-center gap-1.5 h-9"
                                >
                                    <Download className="h-4 w-4" />
                                    Template.csv
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Preview & Validation */}
                    {step === 2 && (
                        <div className="space-y-5 my-auto flex flex-col h-full">
                            <div className="flex items-center justify-between bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm">{file?.name}</h4>
                                        <p className="text-xs text-muted-foreground">{(file?.size ? file.size / 1024 : 0).toFixed(1)} KB • Ready to validate</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleReset}
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive flex items-center gap-1"
                                >
                                    <Trash className="h-4 w-4" />
                                    Remove
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-sm flex items-center gap-1.5">
                                        Data Preview (First 5 Rows)
                                    </h3>
                                    <span className="text-xs text-muted-foreground">Please verify columns are mapped correctly</span>
                                </div>
                                <div className="border border-border rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
                                    <Table>
                                        <TableHeader className="bg-muted/70 sticky top-0 z-10">
                                            <TableRow>
                                                {headers.map((h, i) => (
                                                    <TableHead key={i} className="text-xs font-bold py-2.5 whitespace-nowrap">
                                                        {h}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {previewRows.map((row, rowIndex) => (
                                                <TableRow key={rowIndex} className="hover:bg-muted/30">
                                                    {headers.map((_, colIndex) => (
                                                        <TableCell key={colIndex} className="text-xs py-2 whitespace-nowrap max-w-[200px] truncate">
                                                            {row[colIndex] || <span className="text-muted-foreground/30 italic">empty</span>}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded-xl border border-amber-100 dark:border-amber-900/30 text-xs">
                                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0" />
                                <div className="space-y-1">
                                    <p className="font-semibold">Important CSV Formatting Checklist:</p>
                                    <ul className="list-disc pl-4 space-y-0.5">
                                        <li>Must contain columns named exactly <strong>First Name</strong> and <strong>Last Name</strong>.</li>
                                        <li>Status, Source, Source Medium, and Industry must exist as active picklists in Tutterfly.</li>
                                        <li>Invalid or duplicate lead rows (same email/mobile) will be logged as skipped/errors.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Loading / Import Result */}
                    {step === 3 && (
                        <div className="my-auto text-center space-y-6 py-6">
                            {isImporting ? (
                                <div className="space-y-4 flex flex-col items-center justify-center py-6">
                                    <div className="relative flex items-center justify-center">
                                        <div className="h-16 w-16 rounded-full border-4 border-blue-100 dark:border-blue-950 flex items-center justify-center"></div>
                                        <Loader2 className="absolute h-16 w-16 animate-spin text-blue-600 dark:text-blue-400 stroke-[2.5]" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-semibold text-lg">Importing Leads...</h3>
                                        <p className="text-sm text-muted-foreground">Parsing records, running duplicate checks, and resolving territory owners.</p>
                                    </div>
                                </div>
                            ) : (
                                importResult && (
                                    <div className="space-y-6">
                                        {/* Status Icon */}
                                        <div className="flex justify-center">
                                            {importResult.errors.length === 0 ? (
                                                <div className="h-16 w-16 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm animate-bounce">
                                                    <CheckCircle2 className="h-9 w-9" />
                                                </div>
                                            ) : (
                                                <div className="h-16 w-16 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/30 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
                                                    <AlertCircle className="h-9 w-9" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <h3 className="font-bold text-xl">Import Summary</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {importResult.errors.length === 0
                                                    ? "All leads imported successfully with zero errors."
                                                    : `Finished processing with some issues or duplicate skips.`}
                                            </p>
                                        </div>

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                                            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/20 p-3 rounded-xl">
                                                <span className="block text-2xl font-bold text-emerald-600 dark:text-emerald-400">{importResult.imported}</span>
                                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Imported</span>
                                            </div>
                                            <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/20 p-3 rounded-xl">
                                                <span className="block text-2xl font-bold text-amber-600 dark:text-amber-400">{importResult.skipped}</span>
                                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Duplicates</span>
                                            </div>
                                            <div className="bg-muted p-3 border border-border rounded-xl">
                                                <span className="block text-2xl font-bold text-foreground">{importResult.total}</span>
                                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Rows</span>
                                            </div>
                                        </div>

                                        {/* Errors Section */}
                                        {importResult.errors.length > 0 && (
                                            <div className="max-w-xl mx-auto space-y-2 text-left">
                                                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                                                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                                                    Errors and Warnings ({importResult.errors.length})
                                                </span>
                                                <div className="border border-border bg-muted/30 rounded-xl p-3 max-h-[160px] overflow-y-auto space-y-1.5 text-xs font-mono">
                                                    {importResult.errors.map((err, i) => (
                                                        <div key={i} className="flex gap-2 text-destructive">
                                                            <span className="text-muted-foreground/60 select-none">•</span>
                                                            <span className="break-all">{err}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            )}
                        </div>
                    )}

                </div>

                {/* Footer */}
                <DialogFooter className="p-6 border-t border-border bg-muted/20">
                    <div className="flex w-full justify-between items-center">
                        <div>
                            {step === 2 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleReset}
                                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Back to Upload
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {step < 3 ? (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={handleClose}
                                        disabled={isImporting}
                                        className="h-9 px-4"
                                    >
                                        Cancel
                                    </Button>
                                    {step === 2 && (
                                        <Button
                                            onClick={handleImport}
                                            disabled={!file}
                                            className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
                                        >
                                            Start Import
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <Button
                                    onClick={handleClose}
                                    disabled={isImporting}
                                    className="h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    Close
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
